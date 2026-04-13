// Standardized API Response Interface
// @epic-1.1-rbac: Unified API response format for consistent data handling

export interface StandardAPIResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    hasMore?: boolean;
    timestamp?: string;
  };
}

export interface PaginatedAPIResponse<T = any> extends StandardAPIResponse<T[]> {
  meta: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
    totalPages: number;
    timestamp: string;
  };
}

export interface ErrorAPIResponse {
  success: false;
  error: string;
  message: string;
  details?: any;
  timestamp: string;
}

// Helper functions for creating standardized responses
export function createSuccessResponse<T>(
  first: T | { data: T; message?: string; meta?: StandardAPIResponse<T>["meta"] },
  message?: string,
  meta?: StandardAPIResponse<T>["meta"],
): StandardAPIResponse<T> {
  if (
    first !== null &&
    typeof first === "object" &&
    "data" in first &&
    "message" in first &&
    !("success" in first)
  ) {
    const legacy = first as {
      data: T;
      message?: string;
      meta?: StandardAPIResponse<T>["meta"];
    };
    return {
      success: true,
      data: legacy.data,
      message: legacy.message,
      meta: {
        timestamp: new Date().toISOString(),
        ...legacy.meta,
      },
    };
  }
  return {
    success: true,
    data: first as T,
    message,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

export function createErrorResponse(
  error: string,
  message?: string,
  details?: unknown,
): ErrorAPIResponse {
  return {
    success: false,
    error,
    message: message ?? error,
    ...(details !== undefined ? { details } : {}),
    timestamp: new Date().toISOString(),
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
): PaginatedAPIResponse<T> {
  const totalPages = Math.ceil(total / limit);
  const hasMore = page < totalPages;
  
  return {
    success: true,
    data,
    message,
    meta: {
      total,
      page,
      limit,
      hasMore,
      totalPages,
      timestamp: new Date().toISOString()
    }
  };
} 

