// Circuit breaker pattern implementation for API resilience

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  expectedErrors?: (error: Error) => boolean;
  onStateChange?: (state: CircuitBreakerState) => void;
  onError?: (error: Error) => void;
  onSuccess?: () => void;
  fallback?: () => Promise<any>;
}

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  totalRequests: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  nextAttemptTime: number | null;
  isCircuitOpen: boolean;
  failureRate: number;
  averageResponseTime: number;
}

class CircuitBreakerError extends Error {
  constructor(message: string, public state: CircuitBreakerState) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private totalRequests = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private nextAttemptTime: number | null = null;
  private responseTimes: number[] = [];
  private config: Required<CircuitBreakerConfig>;

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 300000, // 5 minutes
      expectedErrors: () => false,
      onStateChange: () => {},
      onError: () => {},
      onSuccess: () => {},
      fallback: async () => { throw new Error('No fallback provided'); },
      ...config,
    };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if circuit is open
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.nextAttemptTime && Date.now() < this.nextAttemptTime) {
        // Circuit is still open, try fallback
        try {
          return await this.config.fallback();
        } catch (fallbackError) {
          throw new CircuitBreakerError(
            `Circuit breaker is OPEN. Fallback failed: ${fallbackError.message}`,
            this.state
          );
        }
      } else {
        // Time to try half-open
        this.setState(CircuitBreakerState.HALF_OPEN);
      }
    }

    const startTime = Date.now();

    try {
      const result = await operation();
      const responseTime = Date.now() - startTime;
      
      this.onSuccess(responseTime);
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.onFailure(error as Error, responseTime);
      throw error;
    }
  }

  private onSuccess(responseTime: number): void {
    this.successCount++;
    this.lastSuccessTime = Date.now();
    this.recordResponseTime(responseTime);
    
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // If we were half-open and got a success, close the circuit
      this.setState(CircuitBreakerState.CLOSED);
      this.failureCount = 0;
      this.nextAttemptTime = null;
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // Reset failure count on success in closed state
      this.failureCount = 0;
    }

    this.config.onSuccess();
  }

  private onFailure(error: Error, responseTime: number): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.recordResponseTime(responseTime);

    // Check if this is an expected error that shouldn't trigger the circuit breaker
    if (this.config.expectedErrors(error)) {
      this.config.onError(error);
      return;
    }

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // If we were half-open and got a failure, open the circuit
      this.setState(CircuitBreakerState.OPEN);
      this.nextAttemptTime = Date.now() + this.config.resetTimeout;
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // Check if we should open the circuit
      if (this.failureCount >= this.config.failureThreshold) {
        this.setState(CircuitBreakerState.OPEN);
        this.nextAttemptTime = Date.now() + this.config.resetTimeout;
      }
    }

    this.config.onError(error);
  }

  private recordResponseTime(responseTime: number): void {
    this.responseTimes.push(responseTime);
    
    // Keep only recent response times (last 100 requests)
    if (this.responseTimes.length > 100) {
      this.responseTimes = this.responseTimes.slice(-100);
    }
  }

  private setState(newState: CircuitBreakerState): void {
    const oldState = this.state;
    this.state = newState;
    
    if (oldState !== newState) {
      this.config.onStateChange(newState);
    }
  }

  getStats(): CircuitBreakerStats {
    const averageResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length
      : 0;

    const failureRate = this.totalRequests > 0
      ? (this.failureCount / this.totalRequests) * 100
      : 0;

    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttemptTime: this.nextAttemptTime,
      isCircuitOpen: this.state === CircuitBreakerState.OPEN,
      failureRate,
      averageResponseTime,
    };
  }

  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.totalRequests = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.nextAttemptTime = null;
    this.responseTimes = [];
  }

  forceOpen(): void {
    this.setState(CircuitBreakerState.OPEN);
    this.nextAttemptTime = Date.now() + this.config.resetTimeout;
  }

  forceClose(): void {
    this.setState(CircuitBreakerState.CLOSED);
    this.failureCount = 0;
    this.nextAttemptTime = null;
  }

  forceHalfOpen(): void {
    this.setState(CircuitBreakerState.HALF_OPEN);
    this.nextAttemptTime = null;
  }
}

// Circuit breaker manager for multiple endpoints
export class CircuitBreakerManager {
  private breakers = new Map<string, CircuitBreaker>();
  private globalConfig: Partial<CircuitBreakerConfig>;

  constructor(globalConfig: Partial<CircuitBreakerConfig> = {}) {
    this.globalConfig = globalConfig;
  }

  getOrCreateBreaker(
    name: string, 
    config?: Partial<CircuitBreakerConfig>
  ): CircuitBreaker {
    if (!this.breakers.has(name)) {
      const breakerConfig = { ...this.globalConfig, ...config };
      this.breakers.set(name, new CircuitBreaker(breakerConfig as CircuitBreakerConfig));
    }
    return this.breakers.get(name)!;
  }

  execute<T>(
    breakerName: string,
    operation: () => Promise<T>,
    config?: Partial<CircuitBreakerConfig>
  ): Promise<T> {
    const breaker = this.getOrCreateBreaker(breakerName, config);
    return breaker.execute(operation);
  }

  getStats(breakerName?: string): Record<string, CircuitBreakerStats> | CircuitBreakerStats {
    if (breakerName) {
      const breaker = this.breakers.get(breakerName);
      return breaker ? breaker.getStats() : {} as CircuitBreakerStats;
    }

    const stats: Record<string, CircuitBreakerStats> = {};
    for (const [name, breaker] of this.breakers) {
      stats[name] = breaker.getStats();
    }
    return stats;
  }

  getAllBreakers(): Map<string, CircuitBreaker> {
    return new Map(this.breakers);
  }

  resetBreaker(name: string): void {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.reset();
    }
  }

  resetAllBreakers(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  removeBreaker(name: string): boolean {
    return this.breakers.delete(name);
  }

  clear(): void {
    this.breakers.clear();
  }
}

// API-specific circuit breaker configurations
export const apiCircuitBreakerConfigs = {
  auth: {
    failureThreshold: 3,
    resetTimeout: 30000, // 30 seconds
    expectedErrors: (error: Error) => 
      error.message.includes('401') || error.message.includes('invalid credentials'),
    fallback: async () => ({ success: false, error: 'Authentication service unavailable' }),
  },
  
  workspace: {
    failureThreshold: 5,
    resetTimeout: 60000, // 1 minute
    expectedErrors: (error: Error) => 
      error.message.includes('403') || error.message.includes('not found'),
    fallback: async () => ({ workspaces: [], cached: true }),
  },
  
  projects: {
    failureThreshold: 5,
    resetTimeout: 60000,
    expectedErrors: (error: Error) => 
      error.message.includes('404') || error.message.includes('not found'),
    fallback: async () => ({ projects: [], cached: true }),
  },
  
  tasks: {
    failureThreshold: 7,
    resetTimeout: 45000, // 45 seconds
    expectedErrors: (error: Error) => 
      error.message.includes('validation') || error.message.includes('bad request'),
    fallback: async () => ({ tasks: [], cached: true }),
  },
  
  teams: {
    failureThreshold: 5,
    resetTimeout: 60000,
    expectedErrors: (error: Error) => 
      error.message.includes('403') || error.message.includes('unauthorized'),
    fallback: async () => ({ teams: [], cached: true }),
  },
  
  communication: {
    failureThreshold: 8,
    resetTimeout: 30000, // Shorter timeout for real-time features
    expectedErrors: (error: Error) => 
      error.message.includes('rate limit') || error.message.includes('too many requests'),
    fallback: async () => ({ messages: [], offline: true }),
  },
  
  analytics: {
    failureThreshold: 5,
    resetTimeout: 120000, // 2 minutes - less critical
    expectedErrors: (error: Error) => 
      error.message.includes('timeout') || error.message.includes('processing'),
    fallback: async () => ({ analytics: null, cached: true }),
  },
};

// Global circuit breaker manager instance
export const circuitBreakerManager = new CircuitBreakerManager({
  failureThreshold: 5,
  resetTimeout: 60000,
  monitoringPeriod: 300000,
  onStateChange: (state) => {
    logger.info("Circuit breaker state changed to: ${state}");
  },
  onError: (error) => {
    console.warn('Circuit breaker recorded error:', error.message);
  },
});

// Utility function to wrap API calls with circuit breaker
export function withCircuitBreaker<T>(
  breakerName: string,
  operation: () => Promise<T>,
  config?: Partial<CircuitBreakerConfig>
): Promise<T> {
  return circuitBreakerManager.execute(breakerName, operation, config);
}

// React hook for circuit breaker stats
export function useCircuitBreakerStats(breakerName?: string) {
  const [stats, setStats] = useState(() => 
    circuitBreakerManager.getStats(breakerName)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(circuitBreakerManager.getStats(breakerName));
    }, 1000);

    return () => clearInterval(interval);
  }, [breakerName]);

  return stats;
}

// Export types and utilities
export { CircuitBreakerError };
export default CircuitBreaker;

// Helper functions for common patterns
export const createApiCallWithCircuitBreaker = (
  apiName: string,
  config?: Partial<CircuitBreakerConfig>
) => {
  return <T>(operation: () => Promise<T>): Promise<T> => {
    const breakerConfig = { ...apiCircuitBreakerConfigs[apiName as keyof typeof apiCircuitBreakerConfigs], ...config };
    return withCircuitBreaker(apiName, operation, breakerConfig);
  };
};

// Pre-configured API circuit breakers
export const authApiCall = createApiCallWithCircuitBreaker('auth');
export const workspaceApiCall = createApiCallWithCircuitBreaker('workspace');
export const projectApiCall = createApiCallWithCircuitBreaker('projects');
export const taskApiCall = createApiCallWithCircuitBreaker('tasks');
export const teamApiCall = createApiCallWithCircuitBreaker('teams');
export const communicationApiCall = createApiCallWithCircuitBreaker('communication');
export const analyticsApiCall = createApiCallWithCircuitBreaker('analytics');