// API and WebSocket URLs
//
// Dev without VITE_API_URL: API_URL is "" so fetch(`${API_BASE_URL}/...`) hits the Vite dev
// server and `/api` is proxied to the API (see vite.config.ts). You must still run the API
// on the port in the proxy target (default 3005).
//
// Set VITE_API_URL when the browser must call the API host directly (e.g. mobile on LAN).

function resolveApiOrigin(): string {
  const raw = import.meta.env.VITE_API_URL as string | undefined;
  if (raw != null && String(raw).trim() !== "") {
    return String(raw).replace(/\/$/, "");
  }
  if (import.meta.env.DEV) {
    return "";
  }
  return "http://localhost:3005";
}

export const API_URL = resolveApiOrigin();

export const API_BASE_URL =
  API_URL === "" ? "/api" : `${API_URL}/api`;

export const WS_URL = (() => {
  const explicit = import.meta.env.VITE_WS_URL as string | undefined;
  if (explicit != null && String(explicit).trim() !== "") {
    return explicit;
  }
  if (API_URL === "") {
    return "ws://localhost:3005";
  }
  try {
    const base =
      API_URL.startsWith("http://") || API_URL.startsWith("https://")
        ? API_URL
        : `https://${API_URL}`;
    const u = new URL(base);
    const wsProto = u.protocol === "https:" ? "wss:" : "ws:";
    return `${wsProto}//${u.host}`;
  } catch {
    return "ws://localhost:3005";
  }
})();

export const isProductionMode = import.meta.env.VITE_PRODUCTION_MODE !== "false";
export const enableAnalytics = import.meta.env.VITE_ENABLE_ANALYTICS !== "false";
export const enableErrorReporting = import.meta.env.VITE_ENABLE_ERROR_REPORTING !== "false";
