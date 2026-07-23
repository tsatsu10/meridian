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

/** Narrow an unknown catch value to an error "code" field, if present. */
export function getErrorCode(error: unknown): string | undefined {
  if (error instanceof Error && "code" in error) {
    const code = (error as Error & { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}
