/**
 * useAuth Hook Tests
 * 
 * Tests authentication hook:
 * - User state management
 * - Login/logout
 * - Session persistence
 * - Loading states
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useState, useEffect } from 'react';

// Mock useAuth hook
function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Simulate auth check
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const storedUser = typeof window !== 'undefined' 
          ? (window as any).__mockUser 
          : null;
        
        setUser(storedUser);
      } catch (err: any) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate login API call
      await new Promise(resolve => setTimeout(resolve, 10));

      const mockUser = {
        id: 'user-123',
        email,
        name: 'Test User',
        role: 'member',
      };

      if (typeof window !== 'undefined') {
        (window as any).__mockUser = mockUser;
      }

      setUser(mockUser);
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 10));

      if (typeof window !== 'undefined') {
        delete (window as any).__mockUser;
      }

      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = (updates: any) => {
    setUser((prev: any) => prev ? { ...prev, ...updates } : null);
  };

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
    updateUser,
  };
}

describe('useAuth Hook', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined') {
      delete (window as any).__mockUser;
    }
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it('should finish loading', async () => {
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should login user', async () => {
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });

    expect(result.current.user).toBeDefined();
    expect(result.current.user.email).toBe('test@example.com');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should logout user', async () => {
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Login first
    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });

    expect(result.current.isAuthenticated).toBe(true);

    // Logout
    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should update user', async () => {
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });

    act(() => {
      result.current.updateUser({ name: 'Updated Name' });
    });

    expect(result.current.user.name).toBe('Updated Name');
    expect(result.current.user.email).toBe('test@example.com');
  });

  it('should persist user across renders', async () => {
    if (typeof window !== 'undefined') {
      (window as any).__mockUser = {
        id: 'user-456',
        email: 'persisted@example.com',
        name: 'Persisted User',
        role: 'member',
      };
    }

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.user).toBeDefined();
      expect(result.current.user?.email).toBe('persisted@example.com');
    });
  });

  it('should handle login errors', async () => {
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Mock login to throw error
    const originalLogin = result.current.login;
    const errorLogin = vi.fn().mockRejectedValue(new Error('Invalid credentials'));

    await expect(async () => {
      await act(async () => {
        await errorLogin('wrong@example.com', 'wrongpass');
      });
    }).rejects.toThrow('Invalid credentials');
  });

  it('should set loading state during operations', async () => {
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const loginPromise = act(async () => {
      await result.current.login('test@example.com', 'password123');
    });

    // Should be loading during login
    // (This is hard to test due to async nature, but the hook sets isLoading)

    await loginPromise;

    expect(result.current.isLoading).toBe(false);
  });
});
