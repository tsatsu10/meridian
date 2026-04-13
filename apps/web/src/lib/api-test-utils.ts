// API Testing Utilities for Error/Timeout Simulation
// Development and testing tool for verifying error handling

import { APIError, APIErrorHandler } from './api-error-handler';

export interface TestScenario {
  name: string;
  description: string;
  simulate: () => Promise<void>;
  expectedErrorType: APIError['type'];
}

/**
 * API Test Scenarios for Error Handling Verification
 */
export class APITestUtils {
  
  /**
   * Simulate network timeout
   */
  static async simulateTimeout(timeoutMs: number = 1000): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        const error = new Error('AbortError');
        error.name = 'AbortError';
        reject(error);
      }, timeoutMs);
    });
  }

  /**
   * Simulate network connection failure
   */
  static async simulateNetworkFailure(): Promise<never> {
    throw new TypeError('Failed to fetch');
  }

  /**
   * Simulate HTTP error responses
   */
  static async simulateHTTPError(status: number, message?: string): Promise<never> {
    const response = new Response(
      JSON.stringify({ 
        error: message || APIErrorHandler['getStatusMessage'](status),
        status 
      }),
      { 
        status,
        statusText: message || 'Error',
        headers: { 'Content-Type': 'application/json' }
      }
    );
    throw response;
  }

  /**
   * Simulate server overload (503)
   */
  static async simulateServerOverload(): Promise<never> {
    return this.simulateHTTPError(503, 'Service temporarily unavailable due to high load');
  }

  /**
   * Simulate rate limiting (429)
   */
  static async simulateRateLimit(): Promise<never> {
    return this.simulateHTTPError(429, 'Too many requests. Please try again later.');
  }

  /**
   * Simulate permission denied (403)
   */
  static async simulatePermissionDenied(): Promise<never> {
    return this.simulateHTTPError(403, 'You do not have permission to perform this action');
  }

  /**
   * Simulate validation error (422)
   */
  static async simulateValidationError(): Promise<never> {
    return this.simulateHTTPError(422, 'Invalid data provided');
  }

  /**
   * Get all test scenarios
   */
  static getTestScenarios(): TestScenario[] {
    return [
      {
        name: 'Network Timeout',
        description: 'Simulates a request that times out after 5 seconds',
        simulate: () => this.simulateTimeout(5000),
        expectedErrorType: 'timeout'
      },
      {
        name: 'Network Connection Failure',
        description: 'Simulates complete network connectivity loss',
        simulate: () => this.simulateNetworkFailure(),
        expectedErrorType: 'network'
      },
      {
        name: 'Server Error (500)',
        description: 'Simulates internal server error',
        simulate: () => this.simulateHTTPError(500),
        expectedErrorType: 'server'
      },
      {
        name: 'Service Unavailable (503)',
        description: 'Simulates server overload/maintenance',
        simulate: () => this.simulateServerOverload(),
        expectedErrorType: 'server'
      },
      {
        name: 'Rate Limited (429)',
        description: 'Simulates API rate limiting',
        simulate: () => this.simulateRateLimit(),
        expectedErrorType: 'server'
      },
      {
        name: 'Permission Denied (403)',
        description: 'Simulates insufficient permissions',
        simulate: () => this.simulatePermissionDenied(),
        expectedErrorType: 'permission'
      },
      {
        name: 'Validation Error (422)',
        description: 'Simulates invalid request data',
        simulate: () => this.simulateValidationError(),
        expectedErrorType: 'validation'
      },
      {
        name: 'Not Found (404)',
        description: 'Simulates resource not found',
        simulate: () => this.simulateHTTPError(404),
        expectedErrorType: 'validation'
      }
    ];
  }

  /**
   * Run a comprehensive error handling test
   */
  static async runErrorHandlingTest(scenario: TestScenario): Promise<{
    passed: boolean;
    actualError: APIError;
    details: string;
  }> {
    try {
      await scenario.simulate();
      return {
        passed: false,
        actualError: { type: 'unknown', status: 0, message: 'No error thrown' },
        details: 'Expected an error to be thrown, but none was'
      };
    } catch (error) {
      const apiError = await APIErrorHandler.handleAPIError(error, scenario.name);
      const passed = apiError.type === scenario.expectedErrorType;
      
      return {
        passed,
        actualError: apiError,
        details: passed 
          ? 'Error type matches expected' 
          : `Expected '${scenario.expectedErrorType}', got '${apiError.type}'`
      };
    }
  }

  /**
   * Test retry logic with exponential backoff
   */
  static async testRetryLogic(
    maxRetries: number = 3,
    operation: () => Promise<any>
  ): Promise<{
    success: boolean;
    attempts: number;
    errors: APIError[];
    totalTime: number;
  }> {
    const startTime = Date.now();
    const errors: APIError[] = [];
    let attempts = 0;

    for (let i = 0; i <= maxRetries; i++) {
      attempts++;
      
      try {
        await operation();
        return {
          success: true,
          attempts,
          errors,
          totalTime: Date.now() - startTime
        };
      } catch (error) {
        const apiError = await APIErrorHandler.handleAPIError(error);
        errors.push(apiError);
        
        // Don't retry if error is not retryable
        if (!APIErrorHandler.isRetryable(apiError)) {
          break;
        }
        
        // Don't wait after the last attempt
        if (i < maxRetries) {
          const delay = APIErrorHandler.getRetryDelay(i);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    return {
      success: false,
      attempts,
      errors,
      totalTime: Date.now() - startTime
    };
  }

  /**
   * Create a mock API function that fails with specified pattern
   */
  static createFailingAPI(
    failurePattern: 'always' | 'intermittent' | 'first-n-times',
    failureType: APIError['type'] = 'server',
    failCount: number = 2
  ) {
    let callCount = 0;

    return async (): Promise<{ success: true; data: any }> => {
      callCount++;

      const shouldFail = (
        failurePattern === 'always' ||
        (failurePattern === 'intermittent' && Math.random() < 0.5) ||
        (failurePattern === 'first-n-times' && callCount <= failCount)
      );

      if (shouldFail) {
        switch (failureType) {
          case 'network':
            throw new TypeError('Failed to fetch');
          case 'timeout':
            const error = new Error('AbortError');
            error.name = 'AbortError';
            throw error;
          case 'server':
            throw new Response('Internal Server Error', { status: 500 });
          case 'permission':
            throw new Response('Forbidden', { status: 403 });
          case 'validation':
            throw new Response('Bad Request', { status: 400 });
          default:
            throw new Error('Unknown error');
        }
      }

      return { success: true, data: { message: 'Operation successful', callCount } };
    };
  }
}

/**
 * Development-only error testing component
 */
export function createErrorTestingPanel() {
  if (import.meta.env.PROD) {
    return null; // Don't show in production
  }

  return {
    scenarios: APITestUtils.getTestScenarios(),
    runTest: APITestUtils.runErrorHandlingTest,
    testRetry: APITestUtils.testRetryLogic,
    createFailingAPI: APITestUtils.createFailingAPI,
  };
}

/**
 * Monkey patch fetch to simulate network conditions (development only)
 */
export function enableNetworkSimulation(options: {
  latency?: number; // ms
  errorRate?: number; // 0-1
  timeoutRate?: number; // 0-1
}) {
  if (import.meta.env.PROD) {
    console.warn('Network simulation should not be enabled in production');
    return;
  }

  const originalFetch = window.fetch;
  
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    // Simulate latency
    if (options.latency && options.latency > 0) {
      await new Promise(resolve => setTimeout(resolve, options.latency));
    }

    // Simulate timeout
    if (options.timeoutRate && Math.random() < options.timeoutRate) {
      const error = new Error('AbortError');
      error.name = 'AbortError';
      throw error;
    }

    // Simulate general errors
    if (options.errorRate && Math.random() < options.errorRate) {
      throw new TypeError('Simulated network error');
    }

    return originalFetch(input, init);
  };// Return cleanup function
  return () => {
    window.fetch = originalFetch;};
}

// Export for use in development tools
export const DevTools = {
  APITestUtils,
  createErrorTestingPanel,
  enableNetworkSimulation,
}; 