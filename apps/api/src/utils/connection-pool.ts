/**
 * Database Connection Pool Manager
 * 
 * Manages database connections with intelligent pooling:
 * - Connection lifecycle management
 * - Health monitoring and recovery
 * - Load balancing across connections
 * - Performance metrics and optimization
 */

import logger from './logger'

export interface PoolConfig {
  minConnections: number
  maxConnections: number
  acquireTimeoutMs: number
  idleTimeoutMs: number
  maxRetries: number
}

export interface Connection {
  id: string
  created: number
  lastUsed: number
  inUse: boolean
  healthy: boolean
  connection: any
}

class ConnectionPool {
  private config: PoolConfig
  private connections: Map<string, Connection> = new Map()
  private waitingQueue: Array<{ resolve: (conn: Connection) => void; reject: (error: Error) => void }> = []
  private cleanupTimer?: NodeJS.Timeout

  constructor(
    private createConnection: () => Promise<any>,
    private validateConnection: (conn: any) => Promise<boolean>,
    private destroyConnection: (conn: any) => Promise<void>,
    config: Partial<PoolConfig> = {}
  ) {
    this.config = {
      minConnections: 2,
      maxConnections: 10,
      acquireTimeoutMs: 30000,
      idleTimeoutMs: 300000,
      maxRetries: 3,
      ...config
    }

    this.initialize()
  }

  private async initialize(): Promise<void> {
    const promises = []
    for (let i = 0; i < this.config.minConnections; i++) {
      promises.push(this.createNewConnection())
    }

    try {
      await Promise.all(promises)
      logger.info('✅ Connection pool initialized', {
        minConnections: this.config.minConnections,
        maxConnections: this.config.maxConnections
      })
    } catch (error) {
      logger.error('❌ Failed to initialize connection pool:', error)
    }

    this.cleanupTimer = setInterval(() => this.cleanup(), 60000)
  }

  async acquire(): Promise<Connection> {
    const availableConnection = this.getAvailableConnection()
    if (availableConnection) {
      availableConnection.inUse = true
      availableConnection.lastUsed = Date.now()
      return availableConnection
    }

    if (this.connections.size < this.config.maxConnections) {
      const newConnection = await this.createNewConnection()
      newConnection.inUse = true
      newConnection.lastUsed = Date.now()
      return newConnection
    }

    return await this.waitForConnection()
  }

  async release(connection: Connection): Promise<void> {
    try {
      const isHealthy = await this.validateConnection(connection.connection)
      
      if (!isHealthy) {
        await this.destroyConnectionInternal(connection)
        return
      }

      connection.inUse = false
      connection.lastUsed = Date.now()
      connection.healthy = true
      
      this.processWaitingQueue()

    } catch (error) {
      logger.error('❌ Error releasing connection:', error)
      await this.destroyConnectionInternal(connection)
    }
  }

  getHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy'
    totalConnections: number
    availableConnections: number
    healthyConnections: number
  } {
    const healthyConnections = Array.from(this.connections.values()).filter(conn => conn.healthy).length
    const availableConnections = Array.from(this.connections.values()).filter(conn => !conn.inUse && conn.healthy).length

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    if (healthyConnections === 0) status = 'unhealthy'
    else if (healthyConnections < this.config.minConnections) status = 'degraded'

    return { status, totalConnections: this.connections.size, availableConnections, healthyConnections }
  }

  async close(): Promise<void> {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer)
    
    this.waitingQueue.forEach(({ reject }) => reject(new Error('Connection pool is closing')))
    this.waitingQueue = []

    const destroyPromises = Array.from(this.connections.values()).map(conn => this.destroyConnectionInternal(conn))
    await Promise.all(destroyPromises)

    logger.info('📴 Connection pool closed')
  }

  private getAvailableConnection(): Connection | null {
    for (const connection of this.connections.values()) {
      if (!connection.inUse && connection.healthy) return connection
    }
    return null
  }

  private async createNewConnection(): Promise<Connection> {
    let retries = 0
    while (retries < this.config.maxRetries) {
      try {
        const rawConnection = await this.createConnection()
        const connection: Connection = {
          id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          created: Date.now(),
          lastUsed: Date.now(),
          inUse: false,
          healthy: true,
          connection: rawConnection
        }

        this.connections.set(connection.id, connection)
        return connection

      } catch (error) {
        retries++
        if (retries >= this.config.maxRetries) throw error
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    throw new Error('Failed to create connection')
  }

  private async waitForConnection(): Promise<Connection> {
    return new Promise<Connection>((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.waitingQueue.findIndex(item => item.resolve === resolve)
        if (index !== -1) this.waitingQueue.splice(index, 1)
        reject(new Error('Timeout waiting for connection'))
      }, this.config.acquireTimeoutMs)

      this.waitingQueue.push({
        resolve: (connection) => {
          clearTimeout(timeout)
          resolve(connection)
        },
        reject: (error) => {
          clearTimeout(timeout)
          reject(error)
        }
      })
    })
  }

  private processWaitingQueue(): void {
    while (this.waitingQueue.length > 0) {
      const availableConnection = this.getAvailableConnection()
      if (!availableConnection) break

      const waiting = this.waitingQueue.shift()
      if (waiting) {
        availableConnection.inUse = true
        availableConnection.lastUsed = Date.now()
        waiting.resolve(availableConnection)
      }
    }
  }

  private async destroyConnectionInternal(connection: Connection): Promise<void> {
    try {
      await this.destroyConnection(connection.connection)
      this.connections.delete(connection.id)
      
      if (this.connections.size < this.config.minConnections) {
        setImmediate(() => {
          this.createNewConnection().catch(error => {
            logger.error('❌ Failed to replace destroyed connection:', error)
          })
        })
      }

    } catch (error) {
      logger.error('❌ Error destroying connection:', error)
      this.connections.delete(connection.id)
    }
  }

  private cleanup(): void {
    const now = Date.now()
    const connectionsToDestroy: Connection[] = []

    for (const connection of this.connections.values()) {
      if (!connection.inUse && 
          connection.healthy && 
          (now - connection.lastUsed) > this.config.idleTimeoutMs &&
          this.connections.size > this.config.minConnections) {
        connectionsToDestroy.push(connection)
      }
    }

    connectionsToDestroy.forEach(connection => {
      this.destroyConnectionInternal(connection).catch(error => {
        logger.error('❌ Error during cleanup:', error)
      })
    })
  }
}

export default ConnectionPool

