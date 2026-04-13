/**
 * Secure API Client - Cookie-Based Authentication
 * 
 * SECURITY: This file implements a secure API client that uses httpOnly cookies
 * instead of localStorage tokens for authentication.
 */

import { API_URL } from '../constants/urls';

// Request timeout (30 seconds)
const REQUEST_TIMEOUT = 30 * 1000;

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly details?: any;

  constructor(message: string, status: number, code?: string, details?: any) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Create a timeout promise for requests
 */
const createTimeoutPromise = (timeout: number): Promise<never> => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new ApiClientError('Request timeout', 408, 'TIMEOUT'));
    }, timeout);
  });
};

/**
 * Secure API client with cookie-based authentication
 */
export class SecureApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest', // CSRF protection
    };
  }

  /**
   * Make a secure API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    // Merge headers and ensure credentials are included
    const headers = {
      ...this.defaultHeaders,
      ...options.headers,
    };

    const config: RequestInit = {
      ...options,
      headers,
      credentials: 'include', // SECURITY: Always include httpOnly cookies
    };

    try {
      // Race between fetch and timeout
      const response = await Promise.race([
        fetch(url, config),
        createTimeoutPromise(REQUEST_TIMEOUT)
      ]);

      // Handle different response status codes
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // Return empty object for non-JSON responses (like 204 No Content)
        return {} as T;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }
      
      // Handle network errors
      throw new ApiClientError(
        'Network error occurred',
        0,
        'NETWORK_ERROR',
        error
      );
    }
  }

  /**
   * Handle error responses
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: any = {};
    
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json();
      }
    } catch {
      // Ignore JSON parsing errors for error responses
    }

    const message = errorData.message || errorData.error || `HTTP ${response.status}`;
    const code = errorData.code || response.statusText;

    throw new ApiClientError(message, response.status, code, errorData);
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    let url = endpoint;
    
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return this.request<T>(url, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  /**
   * Upload file
   */
  async upload<T>(endpoint: string, file: File, additionalData?: Record<string, any>): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    // Don't set Content-Type for FormData - browser will set it with boundary
    const headers = { ...this.defaultHeaders };
    delete headers['Content-Type'];

    return this.request<T>(endpoint, {
      method: 'POST',
      headers,
      body: formData,
    });
  }

  /**
   * Download file
   */
  async download(endpoint: string, filename?: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    const blob = await response.blob();
    
    // Trigger download if filename provided
    if (filename) {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }

    return blob;
  }
}

// Create singleton instance
export const apiClient = new SecureApiClient();

// Convenience functions for common API patterns
export const api = {
  // Authentication
  auth: {
    signIn: (credentials: { email: string; password: string; rememberMe?: boolean }) =>
      apiClient.post('/user/sign-in', credentials),
    signUp: (userData: { email: string; password: string; displayName: string; inviteCode?: string }) =>
      apiClient.post('/user/sign-up', userData),
    signOut: () => apiClient.post('/user/sign-out'),
    refresh: () => apiClient.post('/user/refresh'),
    me: () => apiClient.get('/user/me'),
    changePassword: (passwords: { currentPassword: string; newPassword: string }) =>
      apiClient.post('/user/change-password', passwords),
  },

  // User management
  users: {
    list: (params?: { page?: number; limit?: number; search?: string }) =>
      apiClient.get('/users', params),
    get: (id: string) => apiClient.get(`/users/${id}`),
    update: (id: string, data: any) => apiClient.patch(`/users/${id}`, data),
    delete: (id: string) => apiClient.delete(`/users/${id}`),
  },

  // Team management
  teams: {
    list: () => apiClient.get('/teams'),
    get: (id: string) => apiClient.get(`/teams/${id}`),
    create: (data: any) => apiClient.post('/teams', data),
    update: (id: string, data: any) => apiClient.patch(`/teams/${id}`, data),
    delete: (id: string) => apiClient.delete(`/teams/${id}`),
    members: (id: string) => apiClient.get(`/teams/${id}/members`),
    addMember: (id: string, userId: string, role?: string) =>
      apiClient.post(`/teams/${id}/members`, { userId, role }),
    removeMember: (teamId: string, userId: string) =>
      apiClient.delete(`/teams/${teamId}/members/${userId}`),
  },

  // Project management
  projects: {
    list: (teamId?: string) => apiClient.get('/projects', teamId ? { teamId } : undefined),
    get: (id: string) => apiClient.get(`/projects/${id}`),
    create: (data: any) => apiClient.post('/projects', data),
    update: (id: string, data: any) => apiClient.patch(`/projects/${id}`, data),
    delete: (id: string) => apiClient.delete(`/projects/${id}`),
  },

  // Task management  
  tasks: {
    list: (projectId?: string, params?: any) => 
      apiClient.get('/tasks', projectId ? { projectId, ...params } : params),
    get: (id: string) => apiClient.get(`/tasks/${id}`),
    create: (data: any) => apiClient.post('/tasks', data),
    update: (id: string, data: any) => apiClient.patch(`/tasks/${id}`, data),
    delete: (id: string) => apiClient.delete(`/tasks/${id}`),
  },

  // File uploads
  files: {
    upload: (file: File, type?: string) => 
      apiClient.upload('/files/upload', file, type ? { type } : undefined),
    download: (id: string, filename?: string) => 
      apiClient.download(`/files/${id}/download`, filename),
    delete: (id: string) => apiClient.delete(`/files/${id}`),
  },
};

export default apiClient;