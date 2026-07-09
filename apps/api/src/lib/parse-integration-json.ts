/**
 * Parse integration_connection jsonb fields that may be stored as JSON strings
 * or already materialized objects (Drizzle/pg driver).
 */
export function parseIntegrationJsonField(value: unknown): Record<string, unknown> {
  if (value == null || value === "") return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return value as Record<string, unknown>;
}
