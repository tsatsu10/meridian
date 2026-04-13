/**
 * Session Management Service
 * 
 * High-level session operations and business logic:
 * - User authentication and session lifecycle
 * - Session security and validation
 * - Multi-device session management
 * - Session analytics and monitoring
 * - Geolocation-based security tracking
 */

import { getSessionStore, SessionData } from './redis-session-store'
import logger from '../utils/logger'
import { geolocationService, type LocationData } from './geolocation-service'

export interface UserSessionInfo {
  sessionId: string
  userId: string
  email: string
  role: string
  workspaceId: string
  createdAt: number
  lastActivity: number
  ipAddress?: string
  userAgent?: string
  device?: {
    type: string
    name: string
    os: string
  }
  location?: {
    city: string
    country: string
    timezone: string
  }
  isActive: boolean
  ttl: number
}

export interface SessionStatistics {
  totalActiveSessions: number
  totalUsers: number
  averageSessionDuration: number
  topUserAgents: Array<{ userAgent: string; count: number }>
  sessionsCreatedToday: number
  sessionsCreatedThisWeek: number
  peakConcurrentSessions: number
  sessionsByRole: Record<string, number>
  sessionsByWorkspace: Record<string, number>
}

export interface SecurityAlert {
  type: 'suspicious_login' | 'multiple_devices' | 'session_hijacking' | 'unusual_activity'
  userId: string
  sessionId: string
  timestamp: number
  details: Record<string, any>
  severity: 'low' | 'medium' | 'high' | 'critical'
}

class SessionService {
  private sessionStore = getSessionStore()
  private securityAlerts: SecurityAlert[] = []
  private maxSecurityAlerts = 1000

  /**
   * Sign in user and create session
   */
  async signIn(userData: {
    userId: string
    email: string
    role: string
    workspaceId: string
    permissions?: string[]
    ipAddress?: string
    userAgent?: string
    metadata?: Record<string, any>
  }): Promise<string> {
    try {
      // Get geolocation data if IP address is available
      let locationData: LocationData | null = null
      if (userData.ipAddress) {
        locationData = await geolocationService.getLocation(userData.ipAddress)
        
        // Check for suspicious IP
        if (locationData && (locationData.isProxy || locationData.isTor || locationData.threatLevel === 'high')) {
          this.addSecurityAlert({
            type: 'suspicious_login',
            userId: userData.userId,
            sessionId: 'new',
            timestamp: Date.now(),
            details: {
              ipAddress: userData.ipAddress,
              isProxy: locationData.isProxy,
              isTor: locationData.isTor,
              threatLevel: locationData.threatLevel,
              location: `${locationData.city}, ${locationData.country}`,
            },
            severity: 'high',
          })
        }
      }

      // Check for existing sessions and security concerns
      await this.checkSessionSecurity(userData.userId, userData.ipAddress, userData.userAgent, locationData)

      // Create new session with location data
      const sessionId = await this.sessionStore.createSession({
        userId: userData.userId,
        email: userData.email,
        role: userData.role,
        workspaceId: userData.workspaceId,
        permissions: userData.permissions,
        ipAddress: userData.ipAddress,
        userAgent: userData.userAgent,
        metadata: {
          ...userData.metadata,
          signInTime: Date.now(),
          deviceInfo: this.parseUserAgent(userData.userAgent),
          location: locationData ? {
            country: locationData.country,
            countryCode: locationData.countryCode,
            city: locationData.city,
            timezone: locationData.timezone,
            isp: locationData.isp,
          } : undefined,
        },
      })

      logger.info(`🔐 User signed in: ${userData.email}`, {
        sessionId,
        userId: userData.userId,
        role: userData.role,
        ipAddress: userData.ipAddress,
        location: locationData ? `${locationData.city}, ${locationData.country}` : 'Unknown',
      })

      return sessionId

    } catch (error) {
      logger.error('❌ Sign in failed:', error)
      throw error
    }
  }

  /**
   * Sign out user and destroy session
   */
  async signOut(sessionId: string): Promise<boolean> {
    try {
      const sessionData = await this.sessionStore.getSession(sessionId)
      if (!sessionData) {
        return false
      }

      const success = await this.sessionStore.deleteSession(sessionId)

      if (success) {
        logger.info(`🚪 User signed out: ${sessionData.email}`, {
          sessionId,
          userId: sessionData.userId,
          sessionDuration: Date.now() - sessionData.lastActivity,
        })
      }

      return success

    } catch (error) {
      logger.error('❌ Sign out failed:', error)
      return false
    }
  }

  /**
   * Sign out user from all devices
   */
  async signOutEverywhere(userId: string): Promise<number> {
    try {
      const deletedCount = await this.sessionStore.deleteUserSessions(userId)

      logger.info(`🚪 User signed out from all devices`, {
        userId,
        deletedSessions: deletedCount,
      })

      return deletedCount

    } catch (error) {
      logger.error('❌ Sign out everywhere failed:', error)
      return 0
    }
  }

  /**
   * Get detailed session information for a user
   */
  async getUserSessionDetails(userId: string): Promise<UserSessionInfo[]> {
    try {
      const sessions = await this.sessionStore.getUserSessions(userId)
      const sessionDetails: UserSessionInfo[] = []

      for (const { sessionId, data } of sessions) {
        const ttl = await this.sessionStore.getSessionTTL(sessionId)
        const deviceInfo = this.parseUserAgent(data.userAgent)

        const sessionInfo: UserSessionInfo = {
          sessionId,
          userId: data.userId,
          email: data.email,
          role: data.role,
          workspaceId: data.workspaceId,
          createdAt: data.metadata?.signInTime || data.lastActivity,
          lastActivity: data.lastActivity,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          device: deviceInfo,
          location: data.metadata?.location ? {
            city: data.metadata.location.city || '',
            country: data.metadata.location.country || '',
            timezone: data.metadata.location.timezone || '',
          } : undefined,
          isActive: ttl > 0,
          ttl: Math.max(0, ttl),
        }

        sessionDetails.push(sessionInfo)
      }

      return sessionDetails.sort((a, b) => b.lastActivity - a.lastActivity)

    } catch (error) {
      logger.error('❌ Failed to get user session details:', error)
      return []
    }
  }

  /**
   * Validate session and check security
   */
  async validateSession(
    sessionId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ valid: boolean; session?: SessionData; securityWarnings?: string[] }> {
    try {
      const session = await this.sessionStore.getSession(sessionId)
      if (!session) {
        return { valid: false }
      }

      const securityWarnings: string[] = []

      // Check IP address change
      if (ipAddress && session.ipAddress && session.ipAddress !== ipAddress) {
        securityWarnings.push('IP address changed')
        
        // Get geolocation for new IP and check for anomalies
        const newLocation = await geolocationService.getLocation(ipAddress)
        const oldLocation = session.metadata?.location
        
        if (newLocation && oldLocation) {
          // Check if country changed
          if (newLocation.countryCode !== oldLocation.countryCode) {
            securityWarnings.push(`Location changed: ${oldLocation.country} → ${newLocation.country}`)
            
            this.addSecurityAlert({
              type: 'suspicious_login',
              userId: session.userId,
              sessionId,
              timestamp: Date.now(),
              details: {
                originalIP: session.ipAddress,
                newIP: ipAddress,
                originalLocation: `${oldLocation.city}, ${oldLocation.country}`,
                newLocation: `${newLocation.city}, ${newLocation.country}`,
                countryChanged: true,
              },
              severity: 'high',
            })
          }
          
          // Check for suspicious IP characteristics
          if (newLocation.isProxy || newLocation.isTor) {
            securityWarnings.push('Access via proxy/VPN/Tor detected')
            
            this.addSecurityAlert({
              type: 'suspicious_login',
              userId: session.userId,
              sessionId,
              timestamp: Date.now(),
              details: {
                ipAddress,
                isProxy: newLocation.isProxy,
                isTor: newLocation.isTor,
                location: `${newLocation.city}, ${newLocation.country}`,
              },
              severity: 'high',
            })
          }
        }
        
        // Log IP change
        this.addSecurityAlert({
          type: 'suspicious_login',
          userId: session.userId,
          sessionId,
          timestamp: Date.now(),
          details: {
            originalIP: session.ipAddress,
            newIP: ipAddress,
            location: newLocation ? `${newLocation.city}, ${newLocation.country}` : 'Unknown',
          },
          severity: 'medium',
        })
      }

      // Check user agent change
      if (userAgent && session.userAgent && session.userAgent !== userAgent) {
        securityWarnings.push('Device/browser changed')
        
        this.addSecurityAlert({
          type: 'suspicious_login',
          userId: session.userId,
          sessionId,
          timestamp: Date.now(),
          details: {
            originalUserAgent: session.userAgent,
            newUserAgent: userAgent,
          },
          severity: 'low',
        })
      }

      // Check for unusual activity patterns
      const sessionAge = Date.now() - session.lastActivity
      if (sessionAge > 24 * 60 * 60 * 1000) { // More than 24 hours
        securityWarnings.push('Long session duration')
      }

      return {
        valid: true,
        session,
        securityWarnings: securityWarnings.length > 0 ? securityWarnings : undefined,
      }

    } catch (error) {
      logger.error('❌ Session validation failed:', error)
      return { valid: false }
    }
  }

  /**
   * Get session statistics and analytics
   */
  async getSessionStatistics(): Promise<SessionStatistics> {
    try {
      const totalSessions = await this.sessionStore.getTotalSessionCount()
      
      // This would require additional Redis data structures for full implementation
      // For now, return basic statistics
      const statistics: SessionStatistics = {
        totalActiveSessions: totalSessions,
        totalUsers: 0, // Would need additional tracking
        averageSessionDuration: 0, // Would need additional tracking
        topUserAgents: [], // Would need additional tracking
        sessionsCreatedToday: 0, // Would need additional tracking
        sessionsCreatedThisWeek: 0, // Would need additional tracking
        peakConcurrentSessions: 0, // Would need additional tracking
        sessionsByRole: {}, // Would need additional tracking
        sessionsByWorkspace: {}, // Would need additional tracking
      }

      return statistics

    } catch (error) {
      logger.error('❌ Failed to get session statistics:', error)
      return {
        totalActiveSessions: 0,
        totalUsers: 0,
        averageSessionDuration: 0,
        topUserAgents: [],
        sessionsCreatedToday: 0,
        sessionsCreatedThisWeek: 0,
        peakConcurrentSessions: 0,
        sessionsByRole: {},
        sessionsByWorkspace: {},
      }
    }
  }

  /**
   * Get security alerts
   */
  getSecurityAlerts(limit: number = 100): SecurityAlert[] {
    return this.securityAlerts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  /**
   * Clear security alerts
   */
  clearSecurityAlerts(): void {
    this.securityAlerts = []
    logger.info('🧹 Security alerts cleared')
  }

  /**
   * Terminate suspicious sessions
   */
  async terminateSuspiciousSessions(userId: string, reason: string): Promise<number> {
    try {
      const deletedCount = await this.sessionStore.deleteUserSessions(userId)

      this.addSecurityAlert({
        type: 'session_hijacking',
        userId,
        sessionId: 'multiple',
        timestamp: Date.now(),
        details: { reason, terminatedSessions: deletedCount },
        severity: 'high',
      })

      logger.warn(`⚠️ Terminated suspicious sessions for user ${userId}`, {
        reason,
        deletedCount,
      })

      return deletedCount

    } catch (error) {
      logger.error('❌ Failed to terminate suspicious sessions:', error)
      return 0
    }
  }

  /**
   * Session cleanup (remove expired sessions)
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const cleanedCount = await this.sessionStore.cleanupExpiredSessions()
      
      if (cleanedCount > 0) {
        logger.info(`🧹 Cleaned up ${cleanedCount} expired sessions`)
      }

      return cleanedCount

    } catch (error) {
      logger.error('❌ Session cleanup failed:', error)
      return 0
    }
  }

  /**
   * Health check for session service
   */
  async healthCheck(): Promise<{
    redis: { connected: boolean; totalSessions: number }
    statistics: { activeSessions: number; securityAlerts: number }
    status: 'healthy' | 'degraded' | 'unhealthy'
  }> {
    try {
      const redisConnected = this.sessionStore.isConnected()
      const totalSessions = redisConnected ? await this.sessionStore.getTotalSessionCount() : 0
      const securityAlertsCount = this.securityAlerts.length

      const status = redisConnected ? 'healthy' : 'unhealthy'

      return {
        redis: {
          connected: redisConnected,
          totalSessions,
        },
        statistics: {
          activeSessions: totalSessions,
          securityAlerts: securityAlertsCount,
        },
        status,
      }

    } catch (error) {
      logger.error('❌ Session service health check failed:', error)
      return {
        redis: { connected: false, totalSessions: 0 },
        statistics: { activeSessions: 0, securityAlerts: 0 },
        status: 'unhealthy',
      }
    }
  }

  private async checkSessionSecurity(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
    locationData?: LocationData | null
  ): Promise<void> {
    try {
      const existingSessions = await this.sessionStore.getUserSessions(userId)
      
      // Check for too many concurrent sessions
      if (existingSessions.length >= 10) {
        this.addSecurityAlert({
          type: 'multiple_devices',
          userId,
          sessionId: 'multiple',
          timestamp: Date.now(),
          details: { sessionCount: existingSessions.length },
          severity: 'medium',
        })
      }

      // Check for rapid sign-ins from different IPs
      if (ipAddress && existingSessions.length > 0) {
        const recentSessions = existingSessions.filter(
          ({ data }) => Date.now() - data.lastActivity < 60000 // Last minute
        )

        const differentIPs = new Set(
          recentSessions.map(({ data }) => data.ipAddress).filter(Boolean)
        )

        if (differentIPs.size > 1 && !differentIPs.has(ipAddress)) {
          this.addSecurityAlert({
            type: 'suspicious_login',
            userId,
            sessionId: 'new',
            timestamp: Date.now(),
            details: { 
              newIP: ipAddress,
              existingIPs: Array.from(differentIPs),
              recentSessionCount: recentSessions.length,
              location: locationData ? `${locationData.city}, ${locationData.country}` : 'Unknown',
            },
            severity: 'high',
          })
        }
      }

      // Check for location anomalies if we have location data
      if (locationData && existingSessions.length > 0) {
        const previousLocations = existingSessions
          .map(({ data }) => data.metadata?.location)
          .filter(Boolean) as Array<{ country: string; countryCode: string; city?: string }>;

        if (previousLocations.length > 0) {
          const knownCountries = new Set(previousLocations.map(loc => loc.countryCode));
          
          // Alert on new country
          if (!knownCountries.has(locationData.countryCode)) {
            this.addSecurityAlert({
              type: 'suspicious_login',
              userId,
              sessionId: 'new',
              timestamp: Date.now(),
              details: {
                newCountry: locationData.country,
                previousCountries: Array.from(knownCountries),
                ipAddress,
                location: `${locationData.city}, ${locationData.country}`,
              },
              severity: 'medium',
            })
          }
        }
      }

    } catch (error) {
      logger.error('❌ Session security check failed:', error)
    }
  }

  private addSecurityAlert(alert: SecurityAlert): void {
    this.securityAlerts.push(alert)

    // Keep only the most recent alerts
    if (this.securityAlerts.length > this.maxSecurityAlerts) {
      this.securityAlerts = this.securityAlerts.slice(-this.maxSecurityAlerts)
    }

    logger.warn(`🚨 Security alert: ${alert.type}`, {
      userId: alert.userId,
      severity: alert.severity,
      details: alert.details,
    })
  }

  private parseUserAgent(userAgent?: string): { type: string; name: string; os: string } {
    if (!userAgent) {
      return { type: 'unknown', name: 'unknown', os: 'unknown' }
    }

    // Simple user agent parsing (in production, use a proper library)
    let type = 'desktop'
    let name = 'unknown'
    let os = 'unknown'

    // Detect mobile
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      type = 'mobile'
    }

    // Detect browser
    if (userAgent.includes('Chrome')) name = 'Chrome'
    else if (userAgent.includes('Firefox')) name = 'Firefox'
    else if (userAgent.includes('Safari')) name = 'Safari'
    else if (userAgent.includes('Edge')) name = 'Edge'

    // Detect OS
    if (userAgent.includes('Windows')) os = 'Windows'
    else if (userAgent.includes('Mac')) os = 'macOS'
    else if (userAgent.includes('Linux')) os = 'Linux'
    else if (userAgent.includes('Android')) os = 'Android'
    else if (userAgent.includes('iOS')) os = 'iOS'

    return { type, name, os }
  }
}

// Singleton instance
let sessionService: SessionService | null = null

/**
 * Get singleton session service instance
 */
export function getSessionService(): SessionService {
  if (!sessionService) {
    sessionService = new SessionService()
  }
  return sessionService
}

export default SessionService

