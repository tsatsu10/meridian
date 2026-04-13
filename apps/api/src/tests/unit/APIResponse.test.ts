/**
 * @epic-5.1-api-standardization - API Response unit tests
 * @persona-all - Testing standardized API responses
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { APIResponseBuilder, ErrorCodes, type APIResponse } from '../../core/APIResponse';

describe('APIResponseBuilder', () => {
  beforeEach(() => {
    // Reset environment for consistent testing
    process.env.API_VERSION = '1.0.0';
  });

  describe('success', () => {
    it('should create a successful response with data', () => {
      const data = { id: '123', name: 'Test User' };
      const response = APIResponseBuilder.success(data);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.error).toBeUndefined();
      expect(response.meta).toBeDefined();
      expect(response.meta?.timestamp).toBeDefined();
      expect(response.meta?.requestId).toBeDefined();
      expect(response.meta?.version).toBe('1.0.0');
    });

    it('should create a successful response with custom meta', () => {
      const data = { id: '123' };
      const customMeta = {
        timestamp: '2024-01-01T00:00:00.000Z',
        requestId: 'custom-req-id',
        version: '2.0.0',
      };
      const response = APIResponseBuilder.success(data, customMeta);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.meta).toEqual(customMeta);
    });

    it('should generate unique request IDs', () => {
      const response1 = APIResponseBuilder.success({});
      const response2 = APIResponseBuilder.success({});

      expect(response1.meta?.requestId).toBeDefined();
      expect(response2.meta?.requestId).toBeDefined();
      expect(response1.meta?.requestId).not.toBe(response2.meta?.requestId);
    });
  });

  describe('error', () => {
    it('should create an error response', () => {
      const errorCode = ErrorCodes.VALIDATION_ERROR;
      const errorMessage = 'Invalid input data';
      const errorDetails = { field: 'email', issue: 'Invalid format' };

      const response = APIResponseBuilder.error(errorCode, errorMessage, errorDetails);

      expect(response.success).toBe(false);
      expect(response.data).toBeUndefined();
      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(errorCode);
      expect(response.error?.message).toBe(errorMessage);
      expect(response.error?.details).toEqual(errorDetails);
      expect(response.meta).toBeDefined();
    });

    it('should create an error response without details', () => {
      const response = APIResponseBuilder.error(ErrorCodes.NOT_FOUND, 'Resource not found');

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(ErrorCodes.NOT_FOUND);
      expect(response.error?.message).toBe('Resource not found');
      expect(response.error?.details).toBeUndefined();
    });

    it('should create an error response with custom meta', () => {
      const customMeta = {
        timestamp: '2024-01-01T00:00:00.000Z',
        requestId: 'error-req-id',
        version: '2.0.0',
      };

      const response = APIResponseBuilder.error(
        ErrorCodes.INTERNAL_ERROR,
        'Server error',
        undefined,
        customMeta
      );

      expect(response.meta).toEqual(customMeta);
    });
  });

  describe('paginated', () => {
    it('should create a paginated response', () => {
      const data = [
        { id: '1', name: 'User 1' },
        { id: '2', name: 'User 2' },
      ];
      const pagination = {
        page: 1,
        limit: 10,
        total: 25,
        sortBy: 'name',
        sortOrder: 'asc' as const,
      };

      const response = APIResponseBuilder.paginated(data, pagination);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.meta?.pagination).toBeDefined();
      expect(response.meta?.pagination?.page).toBe(1);
      expect(response.meta?.pagination?.limit).toBe(10);
      expect(response.meta?.pagination?.total).toBe(25);
      expect(response.meta?.pagination?.totalPages).toBe(3); // Math.ceil(25/10)
    });

    it('should calculate total pages correctly', () => {
      const data = [{ id: '1' }];
      const pagination = {
        page: 1,
        limit: 5,
        total: 12,
        sortBy: 'id',
        sortOrder: 'asc' as const,
      };

      const response = APIResponseBuilder.paginated(data, pagination);

      expect(response.meta?.pagination?.totalPages).toBe(3); // Math.ceil(12/5)
    });

    it('should handle edge case with exact division', () => {
      const data = [{ id: '1' }, { id: '2' }];
      const pagination = {
        page: 1,
        limit: 2,
        total: 2,
        sortBy: 'id',
        sortOrder: 'asc' as const,
      };

      const response = APIResponseBuilder.paginated(data, pagination);

      expect(response.meta?.pagination?.totalPages).toBe(1); // Math.ceil(2/2)
    });

    it('should handle empty data set', () => {
      const data: any[] = [];
      const pagination = {
        page: 1,
        limit: 10,
        total: 0,
        sortBy: 'id',
        sortOrder: 'asc' as const,
      };

      const response = APIResponseBuilder.paginated(data, pagination);

      expect(response.success).toBe(true);
      expect(response.data).toEqual([]);
      expect(response.meta?.pagination?.totalPages).toBe(0);
    });
  });
});

describe('ErrorCodes', () => {
  it('should have all required error codes', () => {
    expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND');
    expect(ErrorCodes.UNAUTHORIZED).toBe('UNAUTHORIZED');
    expect(ErrorCodes.FORBIDDEN).toBe('FORBIDDEN');
    expect(ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
    expect(ErrorCodes.CONFLICT).toBe('CONFLICT');
    expect(ErrorCodes.RATE_LIMIT_EXCEEDED).toBe('RATE_LIMIT_EXCEEDED');
    expect(ErrorCodes.SERVICE_UNAVAILABLE).toBe('SERVICE_UNAVAILABLE');
  });

  it('should have consistent error code format', () => {
    const errorCodes = Object.values(ErrorCodes);
    errorCodes.forEach(code => {
      expect(code).toMatch(/^[A-Z_]+$/);
    });
  });
});

describe('APIResponse Type', () => {
  it('should allow generic typing', () => {
    const userData = { id: '123', name: 'John' };
    const response: APIResponse<typeof userData> = APIResponseBuilder.success(userData);

    expect(response.data?.id).toBe('123');
    expect(response.data?.name).toBe('John');
  });

  it('should handle complex nested types', () => {
    interface ComplexData {
      users: Array<{ id: string; name: string }>;
      metadata: { total: number; page: number };
    }

    const complexData: ComplexData = {
      users: [{ id: '1', name: 'John' }, { id: '2', name: 'Jane' }],
      metadata: { total: 2, page: 1 },
    };

    const response: APIResponse<ComplexData> = APIResponseBuilder.success(complexData);

    expect(response.data?.users).toHaveLength(2);
    expect(response.data?.metadata.total).toBe(2);
  });
}); 

