import type { ContentfulStatusCode } from "hono/utils/http-status";

/** Narrow an unknown catch value to a printable message. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/** Narrow to an Error instance (wraps non-Errors). */
export function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(getErrorMessage(error));
}

/**
 * The HTTP status a thrown error asked for, defaulting to 500.
 *
 * Controllers throw CustomError subclasses (ForbiddenError, NotFoundError, …)
 * that carry a `statusCode`, but route handlers routinely discard it and
 * answer 500 for everything — which reports "you may not do that" and "that
 * does not exist" as server crashes. Narrowed structurally rather than with
 * `instanceof CustomError` so it also handles errors crossing module or
 * bundle boundaries.
 */
export function statusCodeOf(
  error: unknown,
  fallback: ContentfulStatusCode = 500,
): ContentfulStatusCode {
  if (error instanceof Error && "statusCode" in error) {
    const status = (error as Error & { statusCode?: unknown }).statusCode;
    if (
      typeof status === "number" &&
      Number.isInteger(status) &&
      status >= 400 &&
      status <= 599
    ) {
      return status as ContentfulStatusCode;
    }
  }
  return fallback;
}

/** Narrow an unknown catch value to an error "code" field, if present. */
export function getErrorCode(error: unknown): string | undefined {
  if (error instanceof Error && "code" in error) {
    const code = (error as Error & { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}
