/**
 * Turns a failed `Response` into an Error carrying the server's own message.
 *
 * Handlers across the app threw hardcoded strings on failure — `throw new
 * Error("Failed to create backup")` — which discarded whatever the API
 * actually said. That is how a precise 501 ("Backup creation is not
 * available: this deployment has no backup system configured.") reached the
 * user as the uninformative "Couldn't create the backup. Failed to create
 * backup." Pair this with `userMessage(error, action)` so the reason survives
 * to the toast.
 *
 * Both envelope shapes in this codebase are handled: `{ error: "..." }` and
 * the nested `{ error: { message: "..." } }`.
 */
export async function apiErrorFrom(
  response: Response,
  fallback?: string,
): Promise<Error> {
  const body = (await response.json().catch(() => null)) as {
    error?: { message?: string } | string;
    message?: string;
  } | null;

  const reason =
    (typeof body?.error === "string" ? body.error : body?.error?.message) ||
    body?.message;

  return new Error(
    reason || fallback || `Request failed with status ${response.status}`,
  );
}

export default apiErrorFrom;
