// Process Health Monitor
// Monitors system processes and detects orphaned or zombie processes

import logger from './logger';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ProcessInfo {
  pid: number;
  name: string;
  ppid?: number;
  status?: string;
  port?: number;
  cpu?: number;
  memory?: number;
  startTime?: Date;
}

export interface HealthMetrics {
  totalProcesses: number;
  meridianProcesses: ProcessInfo[];
  orphanedProcesses: ProcessInfo[];
  zombieProcesses: ProcessInfo[];
  portConflicts: Array<{ port: number; processes: ProcessInfo[] }>;
  systemLoad: {
    cpu: number;
    memory: number;
  };
}

class ProcessHealthMonitor {
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly monitorFrequency = 120000; // 2 minutes (reduced from 30s to prevent CPU spikes)
  private readonly targetProcessNames = [
    'node',
    'tsx',
    'meridian',
    'hono',
  ];
  private readonly targetPorts = [3005, 3006, 8080];
  private isMonitoring = false;

  /**
   * Start process health monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      logger.warn('⚠️ Process health monitoring already running');
      return;
    }

    this.isMonitoring = true;
    logger.info('🔍 Starting process health monitoring...');

    // Run initial health check
    this.performHealthCheck();

    // Start periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.monitorFrequency);

    logger.info(`✅ Process health monitoring started (every ${this.monitorFrequency / 1000}s)`);
  }

  /**
   * Stop process health monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    logger.info('🛑 Process health monitoring stopped');
  }

  /**
   * Get current health metrics
   */
  async getHealthMetrics(): Promise<HealthMetrics> {
    const processes = await this.getSystemProcesses();
    const meridianProcesses = this.filterMeridianProcesses(processes);
    const orphanedProcesses = this.detectOrphanedProcesses(meridianProcesses);
    const zombieProcesses = this.detectZombieProcesses(processes);
    const portConflicts = await this.detectPortConflicts();
    const systemLoad = await this.getSystemLoad();

    return {
      totalProcesses: processes.length,
      meridianProcesses,
      orphanedProcesses,
      zombieProcesses,
      portConflicts,
      systemLoad,
    };
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const metrics = await this.getHealthMetrics();

      // Log summary
      logger.info(`🔍 Health Check - Meridian: ${metrics.meridianProcesses.length}, Orphaned: ${metrics.orphanedProcesses.length}, Zombies: ${metrics.zombieProcesses.length}`);

      // Handle orphaned processes - TEMPORARILY DISABLED TO FIX SERVER STARTUP
      if (metrics.orphanedProcesses.length > 0) {
        logger.warn(`⚠️ Found ${metrics.orphanedProcesses.length} orphaned processes:`);
        metrics.orphanedProcesses.forEach(proc => {
          logger.warn(`   PID ${proc.pid}: ${proc.name} (Parent: ${proc.ppid})`);
        });

        logger.info('🚫 Orphaned process cleanup disabled during startup to prevent hanging');
        // await this.handleOrphanedProcesses(metrics.orphanedProcesses);
      }

      // Handle zombie processes
      if (metrics.zombieProcesses.length > 0) {
        logger.warn(`⚠️ Found ${metrics.zombieProcesses.length} zombie processes:`);
        metrics.zombieProcesses.forEach(proc => {
          logger.warn(`   PID ${proc.pid}: ${proc.name} (Status: ${proc.status})`);
        });
        
        await this.handleZombieProcesses(metrics.zombieProcesses);
      }

      // Handle port conflicts
      if (metrics.portConflicts.length > 0) {
        logger.warn(`⚠️ Found ${metrics.portConflicts.length} port conflicts:`);
        metrics.portConflicts.forEach(conflict => {
          logger.warn(`   Port ${conflict.port}: ${conflict.processes.length} processes`);
          conflict.processes.forEach(proc => {
            logger.warn(`     PID ${proc.pid}: ${proc.name}`);
          });
        });
      }

      // Check system load
      if (metrics.systemLoad.cpu > 80) {
        logger.warn(`⚠️ High CPU usage: ${metrics.systemLoad.cpu}%`);
      }
      if (metrics.systemLoad.memory > 80) {
        logger.warn(`⚠️ High memory usage: ${metrics.systemLoad.memory}%`);
      }

    } catch (error) {
      logger.error('❌ Health check failed:', error);
    }
  }

  /**
   * Get system processes (cross-platform)
   */
  private async getSystemProcesses(): Promise<ProcessInfo[]> {
    const processes: ProcessInfo[] = [];

    try {
      if (process.platform === 'win32') {
        // Windows: Simplified process detection without problematic WMIC
        // Return basic process info for Meridian processes only
        try {
          // Use Node.js process API instead of external commands
          processes.push({
            pid: process.pid,
            name: 'node.exe',
            ppid: process.ppid || 0,
            status: 'running',
          });

          logger.debug('✅ Using simplified Windows process detection');
        } catch (winError) {
          logger.warn('⚠️ Windows process detection disabled due to system limitations');
        }
      } else {
        // Unix/Linux/macOS: Use ps
        const { stdout } = await execAsync('ps -eo pid,ppid,comm,stat,pcpu,pmem,lstart');
        const lines = stdout.split('\n').slice(1); // Skip header
        
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 4) {
            const pidValue = parts[0] ?? '0';
            const ppidValue = parts[1] ?? '0';
            const nameValue = parts[2] ?? 'unknown';
            const statusValue = parts[3] ?? 'unknown';
            const cpuValue = parts[4] ?? '0';
            const memoryValue = parts[5] ?? '0';
            processes.push({
              pid: parseInt(pidValue, 10) || 0,
              ppid: parseInt(ppidValue, 10) || 0,
              name: nameValue,
              status: statusValue,
              cpu: parseFloat(cpuValue) || 0,
              memory: parseFloat(memoryValue) || 0,
            });
          }
        }
      }
    } catch (error) {
      logger.error('❌ Failed to get system processes:', error);
    }

    return processes;
  }

  /**
   * Filter Meridian-related processes
   */
  private filterMeridianProcesses(processes: ProcessInfo[]): ProcessInfo[] {
    return processes.filter(proc => 
      this.targetProcessNames.some(name => 
        proc.name.toLowerCase().includes(name.toLowerCase())
      )
    );
  }

  /**
   * Detect orphaned processes (processes without valid parents)
   */
  private detectOrphanedProcesses(processes: ProcessInfo[]): ProcessInfo[] {
    return processes.filter(proc => {
      // Check if parent process exists
      if (!proc.ppid || proc.ppid === 1) {
        return false; // Root processes are normal
      }
      
      const parentExists = processes.some(p => p.pid === proc.ppid);
      return !parentExists;
    });
  }

  /**
   * Detect zombie processes
   */
  private detectZombieProcesses(processes: ProcessInfo[]): ProcessInfo[] {
    return processes.filter(proc => 
      proc.status === 'Z' || proc.status === '<defunct>'
    );
  }

  /**
   * Detect port conflicts
   */
  private async detectPortConflicts(): Promise<Array<{ port: number; processes: ProcessInfo[] }>> {
    const conflicts: Array<{ port: number; processes: ProcessInfo[] }> = [];

    for (const port of this.targetPorts) {
      try {
        const processes = await this.getProcessesUsingPort(port);
        if (processes.length > 1) {
          conflicts.push({ port, processes });
        }
      } catch (error) {
        logger.error(`❌ Failed to check port ${port}:`, error);
      }
    }

    return conflicts;
  }

  /**
   * Get processes using a specific port
   */
  private async getProcessesUsingPort(port: number): Promise<ProcessInfo[]> {
    const processes: ProcessInfo[] = [];

    try {
      if (process.platform === 'win32') {
        const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
        const lines = stdout.split('\n');
        
        for (const line of lines) {
          const match = line.match(/\s+(\d+)$/);
          if (match) {
            const pidValue = match[1] ?? '0';
            const pid = parseInt(pidValue, 10);
            const { stdout: nameOutput } = await execAsync(`tasklist /fi "PID eq ${pid}" /fo csv`);
            const name = nameOutput.split('\n')[1]?.split(',')[0]?.replace(/"/g, '') || 'Unknown';
            
            processes.push({ pid, name, port });
          }
        }
      } else {
        const { stdout } = await execAsync(`lsof -ti:${port}`);
        const pids = stdout.trim().split('\n').filter(Boolean);
        
        for (const pidStr of pids) {
          const pid = parseInt(pidStr);
          if (pid) {
            const { stdout: nameOutput } = await execAsync(`ps -p ${pid} -o comm=`);
            const name = nameOutput.trim();
            processes.push({ pid, name, port });
          }
        }
      }
    } catch (error) {
      // Port not in use is normal
    }

    return processes;
  }

  /**
   * Get system load metrics
   */
  private async getSystemLoad(): Promise<{ cpu: number; memory: number }> {
    try {
      if (process.platform === 'win32') {
        // Windows: Use Node.js built-in APIs instead of problematic PowerShell commands
        try {
          const os = require('os');

          // Get CPU usage using Node.js os module
          const cpus = os.cpus();
          let totalIdle = 0;
          let totalTick = 0;

          cpus.forEach(cpu => {
            for (const type in cpu.times) {
              totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
          });

          const cpu = Math.max(0, Math.min(100, 100 - Math.round(100 * totalIdle / totalTick)));

          // Get memory usage using Node.js os module
          const totalMem = os.totalmem();
          const freeMem = os.freemem();
          const memory = Math.round(((totalMem - freeMem) / totalMem) * 100);

          logger.debug('✅ Using Node.js built-in system monitoring for Windows');
          return { cpu, memory };
        } catch (nodeError) {
          logger.warn('⚠️ Windows system monitoring simplified due to limitations');
          return { cpu: 0, memory: 0 };
        }
      } else {
        // Unix/Linux/macOS
        const { stdout } = await execAsync('top -bn1 | grep "Cpu(s)"');
        const cpuMatch = stdout.match(/(\d+\.\d+)%us/);
        const cpu = parseFloat(cpuMatch?.[1] || '0');
        
        const { stdout: memOutput } = await execAsync('free | grep Mem');
        const memParts = memOutput.split(/\s+/);
        const used = parseInt(memParts[2] ?? '0', 10);
        const total = parseInt(memParts[1] ?? '1', 10);
        const memory = (used / total) * 100;
        
        return { cpu, memory };
      }
    } catch (error) {
      logger.error('❌ Failed to get system load:', error);
      return { cpu: 0, memory: 0 };
    }
  }

  /**
   * Handle orphaned processes
   */
  private async handleOrphanedProcesses(processes: ProcessInfo[]): Promise<void> {
    for (const proc of processes) {
      try {
        logger.info(`🧹 Attempting to clean orphaned process: PID ${proc.pid} (${proc.name})`);

        // Create a timeout promise to prevent hanging
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Timeout cleaning process PID ${proc.pid}`)), 5000);
        });

        if (process.platform === 'win32') {
          await Promise.race([
            execAsync(`taskkill /PID ${proc.pid} /F`),
            timeoutPromise
          ]);
        } else {
          await Promise.race([
            execAsync(`kill -TERM ${proc.pid}`),
            timeoutPromise
          ]);
        }

        logger.info(`✅ Cleaned orphaned process: PID ${proc.pid}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn(`⚠️ Could not clean orphaned process PID ${proc.pid} (non-blocking):`, errorMessage);
        // Don't block server startup for process cleanup failures
      }
    }
  }

  /**
   * Handle zombie processes
   */
  private async handleZombieProcesses(processes: ProcessInfo[]): Promise<void> {
    for (const proc of processes) {
      try {
        logger.info(`🧟 Attempting to clean zombie process: PID ${proc.pid} (${proc.name})`);
        
        // For zombie processes, try to signal the parent to clean up
        if (proc.ppid) {
          if (process.platform === 'win32') {
            // Windows doesn't have zombie processes in the same way
            await execAsync(`taskkill /PID ${proc.pid} /F`);
          } else {
            // Send SIGCHLD to parent to clean up zombie
            await execAsync(`kill -CHLD ${proc.ppid}`);
          }
        }
        
        logger.info(`✅ Handled zombie process: PID ${proc.pid}`);
      } catch (error) {
        logger.error(`❌ Failed to handle zombie process PID ${proc.pid}:`, error);
      }
    }
  }

  /**
   * Kill processes using specific ports (emergency cleanup)
   */
  async killProcessesOnPorts(ports: number[]): Promise<void> {
    for (const port of ports) {
      try {
        logger.info(`🔫 Killing processes on port ${port}`);
        
        if (process.platform === 'win32') {
          const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
          const lines = stdout.split('\n');
          
          for (const line of lines) {
            const match = line.match(/\s+(\d+)$/);
            if (match) {
              const pid = parseInt(match[1]);
              await execAsync(`taskkill /PID ${pid} /F`);
              logger.info(`✅ Killed PID ${pid} on port ${port}`);
            }
          }
        } else {
          const { stdout } = await execAsync(`lsof -ti:${port}`);
          const pids = stdout.trim().split('\n').filter(Boolean);
          
          for (const pidStr of pids) {
            const pid = parseInt(pidStr);
            if (pid) {
              await execAsync(`kill -9 ${pid}`);
              logger.info(`✅ Killed PID ${pid} on port ${port}`);
            }
          }
        }
      } catch (error) {
        logger.error(`❌ Failed to kill processes on port ${port}:`, error);
      }
    }
  }
}

// Export singleton instance
export const processHealthMonitor = new ProcessHealthMonitor();
export default processHealthMonitor;

