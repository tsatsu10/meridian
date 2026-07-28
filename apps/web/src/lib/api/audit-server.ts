import { API_BASE_URL } from "@/constants/urls";
import { apiErrorFrom } from "@/lib/api/api-error";

export type AuditLogEntry = {
  id: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  actorEmail: string | null;
  actorName: string | null;
  severity: string;
  category: string | null;
  description: string | null;
  ipAddress: string | null;
  userAgent?: string | null;
  changes: unknown;
  metadata?: unknown;
  timestamp: number;
};

export type AuditStats = {
  totalEvents: number;
  severityBreakdown: Record<string, number>;
  topActions: Array<{ action: string; count: number }>;
  recentSecurityFailures: Array<{
    id: string;
    action: string;
    actorEmail: string | null;
    severity: string | null;
    description: string | null;
    ipAddress: string | null;
    timestamp: number;
  }>;
  timeRange: { since: string; days: number };
};

export type AuditLogPage = {
  logs: AuditLogEntry[];
  total: number;
  hasMore: boolean;
};

export type AuditLogQuery = {
  limit?: number;
  offset?: number;
  severity?: string;
  action?: string;
  actorEmail?: string;
  resourceType?: string;
  days?: number;
};

/**
 * Client for the workspace audit trail.
 *
 * `credentials: "include"` on every call is load-bearing, not decorative: the
 * previous code omitted it, which happens to work in dev because API_BASE_URL
 * is the same-origin "/api" proxy, but sends no cookies the moment VITE_API_URL
 * points at another host — which is exactly what .env.production.template
 * configures. Verified: cross-origin without it returns 401.
 */
async function request<T>(path: string, params?: URLSearchParams): Promise<T> {
  const qs = params && [...params.keys()].length ? `?${params}` : "";
  const response = await fetch(`${API_BASE_URL}/audit${path}${qs}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw await apiErrorFrom(response);
  }

  return (await response.json()) as T;
}

function toParams(query: AuditLogQuery): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  return params;
}

export const AuditAPI = {
  async listLogs(
    workspaceId: string,
    query: AuditLogQuery = {},
  ): Promise<AuditLogPage> {
    const body = await request<{
      data: AuditLogEntry[];
      pagination: { total: number; hasMore: boolean };
    }>(`/${workspaceId}/logs`, toParams(query));
    return {
      logs: body.data ?? [],
      total: body.pagination?.total ?? 0,
      hasMore: body.pagination?.hasMore ?? false,
    };
  },

  async getStats(workspaceId: string, days = 7): Promise<AuditStats> {
    const body = await request<{ data: AuditStats }>(
      `/${workspaceId}/stats`,
      toParams({ days }),
    );
    return body.data;
  },

  async listSecurityLogs(
    workspaceId: string,
    limit = 20,
    days?: number,
  ): Promise<AuditLogEntry[]> {
    const body = await request<{ data: AuditLogEntry[] }>(
      `/${workspaceId}/security-logs`,
      toParams({ limit, days }),
    );
    return body.data ?? [];
  },

  /** Returns the export as a Blob so the caller can trigger a download. */
  async exportLogs(
    workspaceId: string,
    format: "csv" | "json" = "csv",
    days?: number,
  ): Promise<Blob> {
    const params = toParams({ days });
    params.set("format", format);
    const response = await fetch(
      `${API_BASE_URL}/audit/${workspaceId}/export?${params}`,
      { credentials: "include" },
    );
    if (!response.ok) {
      throw await apiErrorFrom(response);
    }
    return await response.blob();
  },
};

export default AuditAPI;
