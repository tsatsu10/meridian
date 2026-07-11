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
