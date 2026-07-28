import { API_BASE_URL } from "@/constants/urls";

/**
 * Client for /api/security/sessions/*.
 *
 * The Security settings page previously had no session client at all — it
 * fabricated a single "current device" entry from navigator.userAgent plus a
 * timezone->city guess, always claimed that was the user's only active
 * session, and shipped its "View All Sessions" / "End All Others" buttons
 * permanently disabled. The API had been there the whole time.
 *
 * Auth is the HttpOnly session cookie, so every call sets
 * `credentials: "include"`.
 */

export type ActiveSession = {
  id: string;
  userId: string;
  userEmail: string;
  deviceType: "desktop" | "mobile" | "tablet" | "unknown";
  deviceName: string;
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  location: string | null;
  isCurrentSession: boolean;
  createdAt: string | null;
  lastActivity: string | null;
  expiresAt: string;
  isSuspicious: boolean;
  status: "active";
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/security/sessions${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(
      body?.error || `Request failed with status ${response.status}`,
    );
  }

  return (await response.json()) as T;
}

export const SessionsAPI = {
  async listActive(): Promise<ActiveSession[]> {
    const body = await request<{ data?: ActiveSession[] }>("/active");
    return body.data ?? [];
  },

  async terminate(sessionId: string): Promise<void> {
    await request(`/${encodeURIComponent(sessionId)}/terminate`, {
      method: "POST",
    });
  },

  async terminateAllOthers(): Promise<void> {
    await request("/terminate-all", { method: "POST" });
  },
};

export default SessionsAPI;
