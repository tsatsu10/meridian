import type { AppType } from "@meridian/api";
import { hc } from "hono/client";

// Enhanced API client with timeout and better error handling
// Note: All API routes are under /api/ prefix. In Vite dev without VITE_API_URL, use same-origin
// `/api` so the dev server proxy can reach the API (still requires API running on proxy target).
const fromEnv = import.meta.env.VITE_API_URL as string | undefined;
const trimmed =
  fromEnv != null && String(fromEnv).trim() !== ""
    ? String(fromEnv).replace(/\/$/, "")
    : import.meta.env.DEV
      ? ""
      : "http://localhost:3005";
const apiUrl =
  trimmed === ""
    ? "/api"
    : trimmed.endsWith("/api")
      ? trimmed
      : `${trimmed}/api`;

export const client = hc<AppType>(
  apiUrl,
  {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => {
      // Create timeout controller (30 seconds for most operations, 60 for uploads)
      const isUpload = init?.body instanceof FormData;
      const timeoutMs = isUpload ? 60000 : 30000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      return fetch(input, {
        ...init,
        headers: {
          ...init?.headers,
          "Content-Type": "application/json",
        },
        credentials: "include",
        signal: controller.signal,
      }).finally(() => {
        clearTimeout(timeoutId);
      });
    },
  },
);
