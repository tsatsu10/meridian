// Security Dashboard Types
export interface SecurityMetrics {
  securityScore: number; // 0-100
  activeThreats: number;
  failedLogins24h: number;
  activeSessions: number;
  twoFactorAdoption: number; // percentage
  suspiciousActivities: number;
  lastSecurityScan?: Date;
}

export interface SecurityAlert {
  id: string;
  type: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  timestamp: Date;
  userId?: string;
  ipAddress?: string;
  action?: string;
  resolved: boolean;
}

export interface SecurityEvent {
  id: string;
  eventType: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  description: string;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface SecurityThreat {
  id: string;
  type: 'brute_force' | 'suspicious_login' | 'unauthorized_access' | 'data_breach_attempt';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  affectedUsers: string[];
  detectedAt: Date;
  status: 'active' | 'investigating' | 'resolved' | 'false_positive';
  actions: string[];
}

export interface SessionInfo {
  id: string;
  userId: string;
  userEmail: string;
  deviceType: string;
  browser: string;
  ipAddress: string;
  location?: string;
  lastActive: Date;
  createdAt: Date;
}

export interface SecurityActionLog {
  id: string;
  action: string;
  performedBy: string;
  target?: string;
  timestamp: Date;
  success: boolean;
  details?: string;
}

