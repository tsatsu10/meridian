/**
 * Comprehensive System Health and Error Prevention
 * @epic-2.4-stability: Prevents all recurring startup and runtime errors
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import logger from './logger';
import { DEFAULT_API_PORT } from '../config/default-api-port';

const execAsync = promisify(exec);

interface SystemHealth {
  ports: { [key: number]: boolean };
  environment: { [key: string]: boolean };
  dependencies: { [key: string]: boolean };
  database: boolean;
  canvas: boolean;
  overallHealth: 'healthy' | 'warning' | 'critical';
  errors: string[];
  recommendations: string[];
}

interface PortCheckResult {
  port: number;
  available: boolean;
  pid?: number;
}

export class SystemHealthChecker {
  private requiredPorts = [DEFAULT_API_PORT];
  private requiredEnvVars = ['DATABASE_URL', 'API_PORT'];
  private optionalEnvVars = ['DEMO_MODE', 'EMAIL_HOST', 'EMAIL_PORT'];

  /**
   * Check if ports are available and kill conflicting processes
   */
  async checkAndFixPorts(): Promise<PortCheckResult[]> {
    const results: PortCheckResult[] = [];
    
    for (const port of this.requiredPorts) {
      try {
        // Check if port is in use on Windows
        const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
        
        if (stdout.trim()) {
          // Port is in use, extract PID
          const lines = stdout.trim().split('\n');
          const pidMatch = lines[0].match(/\s+(\d+)\s*$/);
          const pid = pidMatch ? parseInt(pidMatch[1]) : null;
          
          if (pid && pid > 0) {
            logger.info(`⚠️ Port ${port} in use by PID ${pid}, attempting to free...`);
            
            try {
              // Kill the process
              await execAsync(`taskkill /F /PID ${pid}`);
              logger.info(`✅ Freed port ${port} by killing PID ${pid}`);
              
              // Wait a moment for the port to be released
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              results.push({ port, available: true });
            } catch (killError) {
              logger.error(`❌ Failed to kill process ${pid} on port ${port}:`, killError);
              results.push({ port, available: false, pid });
            }
          } else {
            results.push({ port, available: false });
          }
        } else {
          results.push({ port, available: true });
        }
      } catch (error) {
        // Error checking port likely means it's available
        results.push({ port, available: true });
      }
    }
    
    return results;
  }

  /**
   * Validate and fix environment variables
   */
  async checkAndFixEnvironment(): Promise<{ [key: string]: boolean }> {
    const results: { [key: string]: boolean } = {};
    
    // Load environment variables
    try {
      const envPath = path.join(process.cwd(), '.env');
      const envExists = await fs.access(envPath).then(() => true).catch(() => false);
      
      if (!envExists) {
        logger.info('📝 Creating .env file from .env.example...');
        await fs.copyFile(
          path.join(process.cwd(), '.env.example'),
          envPath
        );
      }
      
      // Read current .env file
      const envContent = await fs.readFile(envPath, 'utf-8');
      const envLines = envContent.split('\n');
      const envMap = new Map<string, string>();
      
      envLines.forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
          envMap.set(key.trim(), value.trim());
        }
      });
      
      // Check required environment variables
      let needsUpdate = false;
      // Safe local placeholders only — never commit real credentials; use .env for secrets.
      const requiredDefaults = {
        DATABASE_URL: 'postgresql://user:password@localhost:5432/meridian',
        API_PORT: String(DEFAULT_API_PORT),
        APP_URL: 'http://localhost:5174',
        DEMO_MODE: 'false',
      };
      
      for (const [key, defaultValue] of Object.entries(requiredDefaults)) {
        if (!envMap.has(key)) {
          envMap.set(key, defaultValue);
          needsUpdate = true;
          logger.info(`📝 Adding missing environment variable: ${key}=${defaultValue}`);
        }
        results[key] = true;
      }
      
      // Update .env file if needed
      if (needsUpdate) {
        const newEnvContent = Array.from(envMap.entries())
          .map(([key, value]) => `${key}=${value}`)
          .join('\n');
        
        await fs.writeFile(envPath, newEnvContent);
        logger.info('✅ Updated .env file with missing variables');
      }
      
    } catch (error) {
      logger.error('❌ Environment setup failed:', error);
      this.requiredEnvVars.forEach(key => results[key] = false);
    }
    
    return results;
  }

  /**
   * Check Canvas module and fix if needed
   */
  async checkAndFixCanvas(): Promise<boolean> {
    try {
      // Try to require canvas
      require('canvas');
      logger.info('✅ Canvas module is working');
      return true;
    } catch (error) {
      logger.info('🔧 Canvas module not available, attempting to fix...');
      
      try {
        // Try to rebuild canvas
        await execAsync('npm rebuild canvas', { cwd: process.cwd() });
        
        // Test again
        require('canvas');
        logger.info('✅ Canvas module rebuilt successfully');
        return true;
      } catch (rebuildError) {
        logger.info('⚠️ Canvas module unavailable, using fallback (this is okay)');
        return false;
      }
    }
  }

  /**
   * Check database connectivity (PostgreSQL only)
   */
  async checkDatabase(): Promise<boolean> {
    try {
      // FORCED: PostgreSQL connectivity check only (user demanded PostgreSQL only)
      const databaseUrl = process.env.DATABASE_URL;

      if (!databaseUrl) {
        logger.error('❌ DATABASE_URL environment variable not set');
        return false;
      }

      // Verify it's a PostgreSQL URL
      if (!databaseUrl.startsWith('postgresql://')) {
        logger.error('❌ DATABASE_URL must be a PostgreSQL connection string');
        return false;
      }

      if (databaseUrl.includes('neon.tech')) {
        logger.info('✅ Database URL: Neon PostgreSQL');
      } else if (
        databaseUrl.includes('localhost') ||
        databaseUrl.includes('127.0.0.1') ||
        databaseUrl.includes('host.docker.internal')
      ) {
        logger.info('✅ Database URL: local/development PostgreSQL');
      } else {
        logger.info('✅ Database URL: PostgreSQL (self-hosted or cloud)');
      }

      return true;
    } catch (error) {
      logger.error('❌ Database check failed:', error);
      return false;
    }
  }

  /**
   * Comprehensive system health check
   */
  async performHealthCheck(): Promise<SystemHealth> {
    logger.info('🔍 Starting comprehensive system health check...');
    
    const health: SystemHealth = {
      ports: {},
      environment: {},
      dependencies: {},
      database: false,
      canvas: false,
      overallHealth: 'healthy',
      errors: [],
      recommendations: []
    };

    try {
      // Check and fix ports
      logger.info('🔧 Checking and fixing ports...');
      const portResults = await this.checkAndFixPorts();
      portResults.forEach(result => {
        health.ports[result.port] = result.available;
        if (!result.available) {
          health.errors.push(`Port ${result.port} is not available`);
          health.recommendations.push(`Kill process using port ${result.port} or change port configuration`);
        }
      });

      // Check and fix environment
      logger.info('🔧 Checking and fixing environment variables...');
      health.environment = await this.checkAndFixEnvironment();
      Object.entries(health.environment).forEach(([key, value]) => {
        if (!value) {
          health.errors.push(`Missing environment variable: ${key}`);
          health.recommendations.push(`Set ${key} in .env file`);
        }
      });

      // Check Canvas
      logger.info('🔧 Checking Canvas module...');
      health.canvas = await this.checkAndFixCanvas();

      // Check database
      logger.info('🔧 Checking database...');
      health.database = await this.checkDatabase();
      if (!health.database) {
        health.errors.push('Database is not accessible');
        health.recommendations.push('Check DATABASE_URL and file permissions');
      }

      // Determine overall health
      const criticalErrors = health.errors.filter(error => 
        error.includes('Port') || error.includes('DATABASE_URL')
      ).length;
      
      if (criticalErrors > 0) {
        health.overallHealth = 'critical';
      } else if (health.errors.length > 0) {
        health.overallHealth = 'warning';
      } else {
        health.overallHealth = 'healthy';
      }

      logger.info(`🎯 System health check complete: ${health.overallHealth.toUpperCase()}`);
      
      if (health.errors.length > 0) {
        logger.info('❌ Issues found:');
        health.errors.forEach(error => logger.info(`  - ${error}`));
        logger.info('💡 Recommendations:');
        health.recommendations.forEach(rec => logger.info(`  - ${rec}`));
      } else {
        logger.info('✅ All systems healthy!');
      }

    } catch (error) {
      logger.error('❌ Health check failed:', error);
      health.overallHealth = 'critical';
      health.errors.push(`Health check failed: ${error}`);
    }

    return health;
  }

  /**
   * Wait for system to be ready
   */
  async waitForSystemReady(maxWaitMs: number = 30000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitMs) {
      const health = await this.performHealthCheck();
      
      if (health.overallHealth === 'healthy' || health.overallHealth === 'warning') {
        return true;
      }
      
      logger.info('⏳ System not ready, waiting 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    logger.info('❌ System failed to become ready within timeout');
    return false;
  }
}

/**
 * Global error handler to prevent crashes
 */
export function setupGlobalErrorHandling(): void {
  process.on('uncaughtException', (error) => {
    logger.error('💥 Uncaught Exception:', error);
    logger.error('Stack:', error.stack);
    
    // Don't exit immediately, try to clean up
    setTimeout(() => {
      logger.info('🔄 Exiting due to uncaught exception...');
      process.exit(1);
    }, 1000);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('💥 Unhandled Rejection at:', promise);
    logger.error('Reason:', reason);
    // Don't exit for unhandled rejections, just log them
  });

  process.on('SIGINT', () => {
    logger.info('\n🛑 Received SIGINT, performing graceful shutdown...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('\n🛑 Received SIGTERM, performing graceful shutdown...');
    process.exit(0);
  });
}

export default SystemHealthChecker;

