/**
 * Health System - Barrel Export
 * Re-exports health functionality for use in tests and other modules
 */

// Re-export health route
export { default as healthRoute } from '../health/index';

// Re-export health calculation functions
export { calculateProjectHealth } from '../health/calculate-project-health';
export type { ProjectHealthMetrics } from '../health/calculate-project-health';

// Re-export recommendation engine
export { generateRecommendations } from '../health/recommendation-engine';

// Mock health service interface for tests
export const healthService = {
  getHealth: async (projectId: string) => {
    const { calculateProjectHealth } = await import('../health/calculate-project-health');
    return calculateProjectHealth(projectId);
  },
  
  getSystemHealth: async () => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: true,
        memory: true,
        cpu: true,
      }
    };
  }
};

// Mock types for tests
export interface HealthConfig {
  enableHealthChecks: boolean;
  healthCheckInterval: number;
  healthThresholds: {
    memory: number;
    cpu: number;
    responseTime: number;
  };
}

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
}

export interface HealthCheck {
  name: string;
  status: HealthStatus;
  message?: string;
  timestamp: string;
}

export interface SystemInfo {
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
}

export function createHealthMiddleware(config?: Partial<HealthConfig>) {
  return async (c: any, next: any) => {
    // Placeholder middleware
    await next();
  };
}


