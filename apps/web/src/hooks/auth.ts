import { useState, useEffect } from 'react';
import { MessageUser } from '../types/chat';
import { API_BASE_URL, API_URL } from '@/constants/urls';

interface AuthState {
  user: MessageUser | null;
  isLoading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/user/me`, {
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Authentication failed');

        const user = await response.json();
        setState({ user, isLoading: false, error: null });
      } catch (error) {
        setState({
          user: null,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Authentication failed',
        });
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) throw new Error('Login failed');
      
      const user = await response.json();
      setState({ user, isLoading: false, error: null });
      return true;
    } catch (error) {
      setState({
        user: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      });
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST' });
      setState({ user: null, isLoading: false, error: null });
      return true;
    } catch (error) {
      setState({
        ...state,
        error: error instanceof Error ? error.message : 'Logout failed',
      });
      return false;
    }
  };

  return {
    user: state.user,
    isLoading: state.isLoading,
    error: state.error,
    login,
    logout,
  };
}; 