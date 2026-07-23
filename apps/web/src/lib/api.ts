import { fetchApi } from "./fetch";

// Create API client instance. Return types are inferred from `fetchApi`
// (the parsed JSON payload); request bodies accept any serializable value.
export const api = {
  get: async (
    endpoint: string,
    options?: { params?: Record<string, string> },
  ) => {
    return fetchApi(endpoint, {
      method: "GET",
      params: options?.params,
    });
  },

  post: async (endpoint: string, data?: unknown, options?: RequestInit) => {
    return fetchApi(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  },

  put: async (endpoint: string, data?: unknown, options?: RequestInit) => {
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
