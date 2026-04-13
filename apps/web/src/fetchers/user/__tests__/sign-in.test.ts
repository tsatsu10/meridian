import { describe, it, expect, beforeEach, vi } from 'vitest';
import signIn from '../sign-in';

// Mock the constants
vi.mock('@/constants/urls', () => ({
  API_URL: 'http://localhost:3000',
}));

describe('signIn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  const mockUser = {
    id: 'user-123',
    email: 'user@example.com',
    name: 'Test User',
    workspaceId: 'workspace-123',
    token: 'jwt-token-123',
  };

  it('should sign in successfully with valid credentials', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    const result = await signIn({
      email: 'user@example.com',
      password: 'password123',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/users/sign-in',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'password123',
        }),
      }
    );

    expect(result).toEqual(mockUser);
  });

  it('should use POST method', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    await signIn({ email: 'test@example.com', password: 'pass' });

    const callOptions = (global.fetch as any).mock.calls[0][1];
    expect(callOptions.method).toBe('POST');
  });

  it('should include credentials for cookie handling', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    await signIn({ email: 'test@example.com', password: 'pass' });

    const callOptions = (global.fetch as any).mock.calls[0][1];
    expect(callOptions.credentials).toBe('include');
  });

  it('should set Content-Type header to application/json', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    await signIn({ email: 'test@example.com', password: 'pass' });

    const callOptions = (global.fetch as any).mock.calls[0][1];
    expect(callOptions.headers['Content-Type']).toBe('application/json');
  });

  it('should send email and password in request body', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    await signIn({ email: 'user@test.com', password: 'mypassword' });

    const callOptions = (global.fetch as any).mock.calls[0][1];
    const body = JSON.parse(callOptions.body);

    expect(body.email).toBe('user@test.com');
    expect(body.password).toBe('mypassword');
  });

  it('should throw error for invalid credentials', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      text: async () => 'Invalid email or password',
    });

    await expect(
      signIn({ email: 'wrong@example.com', password: 'wrongpass' })
    ).rejects.toThrow('Invalid email or password');
  });

  it('should throw error for unauthorized access (401)', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      text: async () => 'Unauthorized',
    });

    await expect(
      signIn({ email: 'user@example.com', password: 'wrong' })
    ).rejects.toThrow('Unauthorized');
  });

  it('should handle server errors (500)', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      text: async () => 'Internal server error',
    });

    await expect(
      signIn({ email: 'user@example.com', password: 'pass' })
    ).rejects.toThrow('Internal server error');
  });

  it('should handle network errors', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    await expect(
      signIn({ email: 'user@example.com', password: 'pass' })
    ).rejects.toThrow('Network error');
  });

  it('should return user object with token', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    const result = await signIn({
      email: 'user@example.com',
      password: 'password',
    });

    expect(result.id).toBe('user-123');
    expect(result.email).toBe('user@example.com');
    expect(result.token).toBe('jwt-token-123');
  });

  it('should handle email with special characters', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    await signIn({
      email: 'user+test@example.com',
      password: 'password',
    });

    const callOptions = (global.fetch as any).mock.calls[0][1];
    const body = JSON.parse(callOptions.body);

    expect(body.email).toBe('user+test@example.com');
  });

  it('should handle long passwords', async () => {
    const longPassword = 'a'.repeat(100);

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    await signIn({
      email: 'user@example.com',
      password: longPassword,
    });

    const callOptions = (global.fetch as any).mock.calls[0][1];
    const body = JSON.parse(callOptions.body);

    expect(body.password).toBe(longPassword);
  });

  it('should call correct API endpoint', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    await signIn({ email: 'user@example.com', password: 'pass' });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/users/sign-in',
      expect.any(Object)
    );
  });

  it('should be called only once per sign-in attempt', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    await signIn({ email: 'user@example.com', password: 'pass' });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should handle account locked error', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      text: async () => 'Account locked due to too many failed attempts',
    });

    await expect(
      signIn({ email: 'user@example.com', password: 'pass' })
    ).rejects.toThrow('Account locked due to too many failed attempts');
  });

  it('should handle email not verified error', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      text: async () => 'Email not verified',
    });

    await expect(
      signIn({ email: 'user@example.com', password: 'pass' })
    ).rejects.toThrow('Email not verified');
  });
});
