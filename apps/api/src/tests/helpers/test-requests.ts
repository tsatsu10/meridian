/**
 * Test Request Utilities
 * Helper functions for creating test HTTP requests and responses
 */

import { vi } from 'vitest';

/**
 * Create a mock Hono context for testing
 */
export function createMockContext(options: {
  method?: string;
  path?: string;
  body?: any;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  params?: Record<string, string>;
  user?: any;
} = {}) {
  const {
    method = 'GET',
    path = '/',
    body = {},
    headers = {},
    query = {},
    params = {},
    user = null,
  } = options;

  const mockContext: any = {
    req: {
      method,
      path,
      url: `http://localhost${path}`,
      header: vi.fn((key: string) => headers[key.toLowerCase()]),
      query: vi.fn((key?: string) => (key ? query[key] : query)),
      param: vi.fn((key?: string) => (key ? params[key] : params)),
      json: vi.fn().mockResolvedValue(body),
      parseBody: vi.fn().mockResolvedValue(body),
      valid: vi.fn((type: string) => {
        if (type === 'json') return body;
        if (type === 'query') return query;
        if (type === 'param') return params;
        return {};
      }),
      raw: {},
    },
    res: {
      headers: new Map(),
    },
    json: vi.fn((data: any, status?: number) => {
      return {
        status: status || 200,
        body: data,
        headers: mockContext.res.headers,
      };
    }),
    text: vi.fn((text: string, status?: number) => {
      return {
        status: status || 200,
        body: text,
        headers: mockContext.res.headers,
      };
    }),
    html: vi.fn((html: string, status?: number) => {
      return {
        status: status || 200,
        body: html,
        headers: mockContext.res.headers,
      };
    }),
    redirect: vi.fn((url: string, status?: number) => {
      return {
        status: status || 302,
        headers: new Map([['Location', url]]),
      };
    }),
    status: vi.fn((code: number) => mockContext),
    header: vi.fn((name: string, value: string) => {
      mockContext.res.headers.set(name, value);
      return mockContext;
    }),
    cookie: vi.fn((name: string, value: string, options?: any) => {
      mockContext.res.headers.set('Set-Cookie', `${name}=${value}`);
      return mockContext;
    }),
    notFound: vi.fn(() => {
      return {
        status: 404,
        body: { error: 'Not Found' },
      };
    }),
    set: vi.fn((key: string, value: any) => {
      mockContext[key] = value;
    }),
    get: vi.fn((key: string) => {
      return mockContext[key];
    }),
    var: {
      user,
    },
    env: {},
    executionCtx: {},
    finalized: false,
    error: null,
  };

  return mockContext;
}

/**
 * Create a mock authenticated context with user
 */
export function createAuthenticatedContext(user: any, options: any = {}) {
  return createMockContext({
    ...options,
    user,
    headers: {
      ...options.headers,
      authorization: `Bearer mock-token-${user.id}`,
    },
  });
}

/**
 * Mock successful response
 */
export function mockSuccessResponse(data: any) {
  return {
    success: true,
    data,
  };
}

/**
 * Mock error response
 */
export function mockErrorResponse(message: string, code?: string) {
  return {
    success: false,
    error: {
      message,
      code: code || 'UNKNOWN_ERROR',
    },
  };
}

/**
 * Assert response structure
 */
export function assertSuccessResponse(response: any) {
  expect(response).toHaveProperty('status');
  expect(response).toHaveProperty('body');
  expect(response.status).toBeGreaterThanOrEqual(200);
  expect(response.status).toBeLessThan(300);
}

/**
 * Assert error response structure
 */
export function assertErrorResponse(response: any) {
  expect(response).toHaveProperty('status');
  expect(response).toHaveProperty('body');
  expect(response.status).toBeGreaterThanOrEqual(400);
}

