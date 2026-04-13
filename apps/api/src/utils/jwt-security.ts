/**
 * 🔐 JWT Security Utilities
 * Enforce strong JWT secrets and secure token handling
 */

import { logger } from './logger';
import crypto from 'crypto';

export interface JWTSecurityConfig {
  minSecretLength: number;
  requireComplexSecret: boolean;
  secretRotationInterval: number; // in milliseconds
  allowWeakSecretsInDev: boolean;
}

export interface SecretValidationResult {
  isValid: boolean;
  score: number; // 0-100
  issues: string[];
  recommendations: string[];
}

export class JWTSecurityManager {
  private config: JWTSecurityConfig;
  private currentSecret?: string;
  private previousSecret?: string;
  private secretCreatedAt?: Date;

  constructor(config: JWTSecurityConfig) {
    this.config = config;
  }

  /**
   * Validate JWT secret strength
   */
  validateSecret(secret?: string): SecretValidationResult {
    const testSecret = secret || process.env.JWT_SECRET;
    
    if (!testSecret) {
      return {
        isValid: false,
        score: 0,
        issues: ['No JWT secret provided'],
        recommendations: ['Set JWT_SECRET environment variable']
      };
    }

    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 0;

    // Check minimum length
    if (testSecret.length < this.config.minSecretLength) {
      issues.push(`Secret too short (${testSecret.length} < ${this.config.minSecretLength})`);
      recommendations.push(`Use at least ${this.config.minSecretLength} characters`);
    } else {
      score += 30;
    }

    // Check for weak default secrets
    const weakSecrets = [
      'secret',
      'jwt-secret',
      'your-secret-key',
      'my-secret',
      'default-secret',
      '123456',
      'password',
      'admin',
      'test'
    ];

    if (weakSecrets.some(weak => testSecret.toLowerCase().includes(weak.toLowerCase()))) {
      issues.push('Secret contains common weak patterns');
      recommendations.push('Use a cryptographically random secret');
    } else {
      score += 20;
    }

    // Check character complexity
    const hasUpperCase = /[A-Z]/.test(testSecret);
    const hasLowerCase = /[a-z]/.test(testSecret);
    const hasNumbers = /[0-9]/.test(testSecret);
    const hasSpecialChars = /[^A-Za-z0-9]/.test(testSecret);

    const complexityScore = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChars]
      .filter(Boolean).length;

    if (this.config.requireComplexSecret && complexityScore < 3) {
      issues.push('Secret lacks character complexity');
      recommendations.push('Include uppercase, lowercase, numbers, and special characters');
    } else {
      score += complexityScore * 5;
    }

    // Check entropy
    const entropy = this.calculateEntropy(testSecret);
    if (entropy < 60) {
      issues.push(`Low entropy (${entropy.toFixed(1)} bits)`);
      recommendations.push('Use a more random secret with higher entropy');
    } else {
      score += Math.min(25, Math.floor(entropy / 3));
    }

    // Check for patterns
    if (this.hasRepeatingPatterns(testSecret)) {
      issues.push('Secret contains repeating patterns');
      recommendations.push('Avoid repeated characters or sequences');
    } else {
      score += 10;
    }

    // Production environment checks
    if (process.env.NODE_ENV === 'production') {
      if (testSecret.length < 64) {
        issues.push('Production secret should be at least 64 characters');
        recommendations.push('Use a 256-bit (64 character) or longer secret in production');
      }
      
      if (!this.config.allowWeakSecretsInDev && score < 70) {
        issues.push('Secret strength insufficient for production');
        recommendations.push('Generate a cryptographically secure random secret');
      }
    }

    const isValid = issues.length === 0 || 
      (process.env.NODE_ENV === 'development' && this.config.allowWeakSecretsInDev);

    return {
      isValid,
      score: Math.min(100, Math.max(0, score)),
      issues,
      recommendations
    };
  }

  /**
   * Generate a cryptographically strong JWT secret
   */
  generateStrongSecret(length: number = 64): string {
    return crypto.randomBytes(length).toString('base64url');
  }

  /**
   * Initialize JWT security with validation
   */
  initialize(): { success: boolean; secret?: string; errors: string[] } {
    const validation = this.validateSecret();
    
    if (validation.isValid) {
      this.currentSecret = process.env.JWT_SECRET;
      this.secretCreatedAt = new Date();
      
      logger.info('JWT security initialized', {
        secretScore: validation.score,
        secretLength: process.env.JWT_SECRET?.length || 0
      });
      
      return {
        success: true,
        secret: this.currentSecret,
        errors: []
      };
    }

    // In development, we can generate a secret if needed
    if (process.env.NODE_ENV === 'development' && this.config.allowWeakSecretsInDev) {
      if (!process.env.JWT_SECRET) {
        const generatedSecret = this.generateStrongSecret();
        logger.warn('No JWT secret found in development - generating temporary secret');
        logger.warn('Add JWT_SECRET to your .env file for persistent sessions');
        
        // Set in environment for this session
        process.env.JWT_SECRET = generatedSecret;
        this.currentSecret = generatedSecret;
        this.secretCreatedAt = new Date();
        
        return {
          success: true,
          secret: generatedSecret,
          errors: ['Generated temporary secret for development']
        };
      }
    }

    // In production or strict mode, fail if secret is weak
    logger.error('JWT secret validation failed', {
      issues: validation.issues,
      recommendations: validation.recommendations,
      score: validation.score
    });

    return {
      success: false,
      errors: validation.issues
    };
  }

  /**
   * Calculate entropy of a string
   */
  private calculateEntropy(str: string): number {
    const charCounts = new Map<string, number>();
    
    for (const char of str) {
      charCounts.set(char, (charCounts.get(char) || 0) + 1);
    }
    
    let entropy = 0;
    for (const count of charCounts.values()) {
      const probability = count / str.length;
      entropy -= probability * Math.log2(probability);
    }
    
    return entropy * str.length;
  }

  /**
   * Check for repeating patterns in string
   */
  private hasRepeatingPatterns(str: string): boolean {
    // Check for repeated characters (more than 2 in a row)
    if (/(.)\1{2,}/.test(str)) {
      return true;
    }
    
    // Check for repeated short sequences
    for (let len = 2; len <= Math.min(8, str.length / 2); len++) {
      for (let i = 0; i <= str.length - len * 2; i++) {
        const pattern = str.substring(i, i + len);
        const nextPattern = str.substring(i + len, i + len * 2);
        if (pattern === nextPattern) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Get security recommendations
   */
  getSecurityRecommendations(): string[] {
    return [
      'Use a cryptographically random secret of at least 64 characters',
      'Include uppercase, lowercase, numbers, and special characters',
      'Never use common words or patterns in secrets',
      'Rotate secrets regularly in production',
      'Store secrets securely (environment variables, not in code)',
      'Use different secrets for different environments',
      'Monitor for secret exposure in logs or error messages'
    ];
  }

  /**
   * Check if secret needs rotation
   */
  needsRotation(): boolean {
    if (!this.secretCreatedAt) {
      return false;
    }
    
    const age = Date.now() - this.secretCreatedAt.getTime();
    return age > this.config.secretRotationInterval;
  }

  /**
   * Get current secret
   */
  getCurrentSecret(): string | undefined {
    return this.currentSecret;
  }

  /**
   * Get security status
   */
  getSecurityStatus() {
    const validation = this.validateSecret();
    
    return {
      isInitialized: !!this.currentSecret,
      secretScore: validation.score,
      isValid: validation.isValid,
      needsRotation: this.needsRotation(),
      secretAge: this.secretCreatedAt ? Date.now() - this.secretCreatedAt.getTime() : 0,
      issues: validation.issues,
      recommendations: validation.recommendations
    };
  }
}

// Create default configuration
const defaultConfig: JWTSecurityConfig = {
  minSecretLength: parseInt(process.env.JWT_MIN_SECRET_LENGTH || '32'),
  requireComplexSecret: process.env.JWT_REQUIRE_COMPLEX === 'true',
  secretRotationInterval: parseInt(process.env.JWT_ROTATION_INTERVAL || '2592000000'), // 30 days
  allowWeakSecretsInDev: process.env.NODE_ENV === 'development'
};

export const jwtSecurity = new JWTSecurityManager(defaultConfig);
export default jwtSecurity;

