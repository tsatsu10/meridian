import { Context } from "hono";

/**
 * Extract client IP address from request headers
 */
export function getClientIP(c: Context): string {
  // Check various headers that might contain the real IP
  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return c.req.header('x-real-ip') || 
         c.req.header('cf-connecting-ip') || 
         c.req.header('x-client-ip') ||
         'unknown';
}

/**
 * Extract user agent from request headers
 */
export function getUserAgent(c: Context): string | undefined {
  return c.req.header('user-agent');
}

/**
 * Generate a unique request ID for tracing
 */
export function generateRequestId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

/**
 * Extract device information from user agent
 */
export function parseDeviceInfo(userAgent?: string): {
  browser?: string;
  os?: string;
  device?: string;
  isMobile: boolean;
} {
  if (!userAgent) {
    return { isMobile: false };
  }

  const ua = userAgent.toLowerCase();
  
  // Browser detection
  let browser: string | undefined;
  if (ua.includes('chrome')) browser = 'Chrome';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('safari')) browser = 'Safari';
  else if (ua.includes('edge')) browser = 'Edge';
  else if (ua.includes('opera')) browser = 'Opera';

  // OS detection
  let os: string | undefined;
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('ios')) os = 'iOS';

  // Device detection
  let device: string | undefined;
  if (ua.includes('mobile')) device = 'Mobile';
  else if (ua.includes('tablet')) device = 'Tablet';
  else device = 'Desktop';

  const isMobile = ua.includes('mobile') || ua.includes('android') || ua.includes('iphone');

  return { browser, os, device, isMobile };
}

/**
 * Calculate risk score based on request characteristics
 */
export function calculateRiskScore(data: {
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  authMethod?: string;
  previousFailures?: number;
  isNewDevice?: boolean;
  isVPN?: boolean;
}): {
  score: number;
  factors: string[];
} {
  let score = 0;
  const factors: string[] = [];

  // Unknown IP
  if (!data.ipAddress || data.ipAddress === 'unknown') {
    score += 20;
    factors.push('unknown_ip');
  }

  // VPN usage
  if (data.isVPN) {
    score += 15;
    factors.push('vpn_usage');
  }

  // New device
  if (data.isNewDevice) {
    score += 10;
    factors.push('new_device');
  }

  // Previous failures
  if (data.previousFailures && data.previousFailures > 0) {
    score += Math.min(data.previousFailures * 5, 25);
    factors.push('previous_failures');
  }

  // Weak auth method
  if (data.authMethod === 'password') {
    score += 5;
    factors.push('password_auth');
  }

  // Suspicious user agent
  if (!data.userAgent || data.userAgent.length < 10) {
    score += 15;
    factors.push('suspicious_user_agent');
  }

  return { score: Math.min(score, 100), factors };
}

