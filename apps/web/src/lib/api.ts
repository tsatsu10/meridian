import { fetchApi } from "./fetch";

// API client interface
interface ApiClient {
  get: (endpoint: string, options?: { params?: Record<string, string> }) => Promise<any>;
  post: (endpoint: string, data?: any, options?: RequestInit) => Promise<any>;
  put: (endpoint: string, data?: any, options?: RequestInit) => Promise<any>;
  delete: (endpoint: string, options?: RequestInit) => Promise<any>;
}

// Create API client instance
export const api: ApiClient = {
  get: async (endpoint: string, options?: { params?: Record<string, string> }) => {
    return fetchApi(endpoint, {
      method: "GET",
      params: options?.params,
    });
  },

  post: async (endpoint: string, data?: any, options?: RequestInit) => {
    return fetchApi(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  },

  put: async (endpoint: string, data?: any, options?: RequestInit) => {
    return fetchApi(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  },

  delete: async (endpoint: string, options?: RequestInit) => {
    return fetchApi(endpoint, {
      method: "DELETE",
      ...options,
    });
  },
};

export default api;