/**
 * Test client for making authenticated API requests
 */

import type { Hono } from 'hono';

interface TestRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  body?: any;
  headers?: Record<string, string>;
  session?: string;
}

export class TestClient {
  constructor(private app: Hono) {}

  async request(options: TestRequestOptions) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (options.session) {
      headers['Cookie'] = `session=${options.session}`;
    }

    const request = new Request(`http://localhost${options.path}`, {
      method: options.method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    return this.app.fetch(request);
  }

  async get(path: string, session?: string) {
    return this.request({ method: 'GET', path, session });
  }

  async post(path: string, body?: any, session?: string) {
    return this.request({ method: 'POST', path, body, session });
  }

  async put(path: string, body?: any, session?: string) {
    return this.request({ method: 'PUT', path, body, session });
  }

  async delete(path: string, session?: string) {
    return this.request({ method: 'DELETE', path, session });
  }

  async patch(path: string, body?: any, session?: string) {
    return this.request({ method: 'PATCH', path, body, session });
  }
}

/**
 * Helper to create a test client from Hono app
 */
export function createTestClient(app: Hono) {
  return new TestClient(app);
}

