/**
 * Public web origin for emails, redirects, and absolute links.
 * Prefer FRONTEND_URL; APP_URL is a deprecated alias.
 * Whitespace and trailing slashes are stripped so callers can safely append `/path`.
 */
export function getFrontendBaseUrl(): string {
  const raw = (
    process.env.FRONTEND_URL ||
    process.env.APP_URL ||
    "http://localhost:5174"
  ).trim();
  return raw.replace(/\/+$/, "");
}
