import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchApi } from '../fetch';

// Mock the constants
vi.mock('@/constants/urls', () => ({
  API_URL: 'http://localhost:3000',
}));

describe('fetchApi', () => {
  beforeEach(() => {
    // Mock global fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should make a GET request with correct URL', async () => {
    const mockResponse = { data: 'test' };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await fetchApi('/users');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/users',
      expect.objectContaining({
        credentials: 'include',
        headers: expect.any(Headers),
      })
    );
    expect(result).toEqual(mockResponse);
  });

  it('should add /api prefix if not present', async () => {
    const mockResponse = { data: 'test' };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    await fetchApi('/users');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/users',
      expect.any(Object)
    );
  });

  it('should not duplicate /api prefix', async () => {
    const mockResponse = { data: 'test' };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    await fetchApi('/api/users');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/users',
      expect.any(Object)
    );
  });

  it('should include query parameters', async () => {
    const mockResponse = { data: 'test' };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    await fetchApi('/users', {
      params: { id: '123', status: 'active' },
    });

    const callUrl = (global.fetch as any).mock.calls[0][0];
    expect(callUrl).toContain('id=123');
    expect(callUrl).toContain('status=active');
  });

  it('should set Content-Type header to application/json by default', async () => {
    const mockResponse = { data: 'test' };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    await fetchApi('/users');

    const callOptions = (global.fetch as any).mock.calls[0][1];
    const headers = callOptions.headers;
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('should include credentials: include for cookies', async () => {
    const mockResponse = { data: 'test' };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    await fetchApi('/users');

    const callOptions = (global.fetch as any).mock.calls[0][1];
    expect(callOptions.credentials).toBe('include');
  });

  it('should pass custom headers', async () => {
    const mockResponse = { data: 'test' };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    await fetchApi('/users', {
      headers: {
        'X-Custom-Header': 'custom-value',
      },
    });

    const callOptions = (global.fetch as any).mock.calls[0][1];
    const headers = callOptions.headers;
    expect(headers.get('X-Custom-Header')).toBe('custom-value');
  });

  it('should handle POST requests with body', async () => {
    const mockResponse = { id: 1, name: 'Test' };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const body = { name: 'Test' };
    const result = await fetchApi('/users', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/users',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(body),
      })
    );
    expect(result).toEqual(mockResponse);
  });

  it('should throw error on non-ok response with error message', async () => {
    const errorMessage = 'User not found';
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ message: errorMessage }),
    });

    await expect(fetchApi('/users/999')).rejects.toThrow(errorMessage);
  });

  it('should throw error on non-ok response without error message', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => { throw new Error('Invalid JSON'); },
    });

    await expect(fetchApi('/users')).rejects.toThrow('An error occurred');
  });

  it('should handle network errors', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    await expect(fetchApi('/users')).rejects.toThrow('Network error');
  });

  it('should parse JSON response correctly', async () => {
    const mockData = {
      users: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ],
    };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const result = await fetchApi('/users');

    expect(result).toEqual(mockData);
  });

  it('should handle PUT requests', async () => {
    const mockResponse = { id: 1, name: 'Updated' };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    await fetchApi('/users/1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated' }),
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/users/1',
      expect.objectContaining({
        method: 'PUT',
      })
    );
  });

  it('should handle DELETE requests', async () => {
    const mockResponse = { success: true };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    await fetchApi('/users/1', {
      method: 'DELETE',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/users/1',
      expect.objectContaining({
        method: 'DELETE',
      })
    );
  });
});
