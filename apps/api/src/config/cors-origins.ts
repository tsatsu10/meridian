/**
 * Pure CORS origin resolution — shared by Hono cors(), validateCors,
 * and createSecurityMiddleware (lib/security).
 */

const DEFAULT_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5200",
  "https://meridian.app",
  "https://www.meridian.app",
  "https://app.meridian.com",
] as const;

export type CorsResolveOptions = {
  corsOrigins?: string[];
  frontendUrl?: string;
  nodeEnv?: string;
};

/** Normalize an origin string for allowlist comparison (trim + strip trailing /). */
export function normalizeCorsOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, "");
}

/** Parse `CORS_ORIGINS` env value into a clean allowlist fragment. */
export function parseCorsOriginsEnv(raw: string | undefined): string[] {
  return (raw || "")
    .split(",")
    .map((origin) => normalizeCorsOrigin(origin))
    .filter(Boolean);
}

export function mergeAllowedCorsOrigins(
  options: CorsResolveOptions = {},
): string[] {
  const fromEnv = (options.corsOrigins ?? []).map(normalizeCorsOrigin);
  const frontend = options.frontendUrl
    ? [normalizeCorsOrigin(options.frontendUrl)]
    : [];
  return [
    ...new Set([...DEFAULT_ORIGINS, ...fromEnv, ...frontend].filter(Boolean)),
  ];
}

export function resolveCorsOrigin(
  origin: string | undefined,
  options: CorsResolveOptions = {},
): string | undefined {
  if (!origin) return undefined;
  const normalized = normalizeCorsOrigin(origin);
  if (!normalized) return undefined;
  if (mergeAllowedCorsOrigins(options).includes(normalized)) return normalized;
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV;
  if (nodeEnv !== "production" && normalized.startsWith("http://localhost:")) {
    return normalized;
  }
  return undefined;
}
