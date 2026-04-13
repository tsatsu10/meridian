/**
 * @epic-5.1-api-standardization - Unified API response format
 * @persona-all - Consistent API experience for all users
 */

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class APIResponseBuilder {
  static success<T>(data: T, meta?: Partial<APIResponse['meta']>): APIResponse<T> {
    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId(),
        version: process.env.API_VERSION || '1.0.0',
        ...meta,
      },
    };
  }

  static error(
    code: string,
    message: string,
    details?: any,
    meta?: Partial<APIResponse['meta']>
  ): APIResponse {
    return {
      success: false,
      error: {
        code,
        message,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId(),
        version: process.env.API_VERSION || '1.0.0',
        ...meta,
      },
    };
  }

  static paginated<T>(
    data: T[],
    pagination: Required<PaginationParams> & { total: number },
    meta?: Partial<APIResponse['meta']>
  ): APIResponse<T[]> {
    const totalPages = Math.ceil(pagination.total / pagination.limit);
    
    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId(),
        version: process.env.API_VERSION || '1.0.0',
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: pagination.total,
          totalPages,
        },
        ...meta,
      },
    };
  }

  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Common error codes
export const ErrorCodes = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  CONFLICT: 'CONFLICT', // Alias for RESOURCE_CONFLICT
  
  // Database
  DATABASE_ERROR: 'DATABASE_ERROR',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  
  // External Services
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Internal
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  
  // Real-time
  WEBSOCKET_ERROR: 'WEBSOCKET_ERROR',
  CONNECTION_FAILED: 'CONNECTION_FAILED',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]; 

