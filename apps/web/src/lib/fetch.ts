import { API_URL } from "@/constants/urls";

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

/** Base URL for `new URL(relative, base)` when VITE_API_URL is unset (dev uses same-origin `/api`). */
function resolveFetchOrigin(): string {
  const raw = API_URL;
  if (raw != null && String(raw).trim() !== "") {
    return String(raw).replace(/\/$/, "");
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "http://localhost:5174";
}

export async function fetchApi(endpoint: string, options: FetchOptions = {}) {
  const { params, ...init } = options;

  // Ensure endpoint starts with /api for proxy routing
  const apiEndpoint = endpoint.startsWith("/api") ? endpoint : `/api${endpoint}`;

  // `new URL` requires a valid absolute base; API_URL is "" in dev (same-origin).
  const url = new URL(apiEndpoint, resolveFetchOrigin());
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  // Add default headers
  const headers = new Headers(init.headers);
  // Always set Content-Type for JSON API requests (especially when body is present)
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Make the request
  const response = await fetch(url.toString(), {
    ...init,
    headers,
    credentials: "include", // Important for cookies
  });

  // Handle non-2xx responses
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "An error occurred" }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  // Parse JSON response
  return response.json();
} 