import { z } from "zod";

export const chatDashboardSearchSchema = z.object({
  channel: z.string().min(1).optional(),
  message: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
});

export type ChatDashboardSearch = z.infer<typeof chatDashboardSearchSchema>;

/** Treats whitespace-only as missing; otherwise returns the original string (no trim). */
function optionalNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (value.trim().length === 0) return undefined;
  return value;
}

/**
 * Parses validated search params for `/dashboard/chat` (shareable deep links).
 */
export function parseChatDashboardSearch(
  raw: Record<string, unknown>,
): ChatDashboardSearch {
  const result = chatDashboardSearchSchema.safeParse({
    channel: optionalNonEmptyString(raw.channel),
    message: optionalNonEmptyString(raw.message),
    userId: optionalNonEmptyString(raw.userId),
  });
  return result.success ? result.data : {};
}
