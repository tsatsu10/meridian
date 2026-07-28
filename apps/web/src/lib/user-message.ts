/**
 * Builds the error text a user actually sees.
 *
 * Error copy across the app used to be a dead end: 112 `toast.error` calls said
 * only "Failed to <verb>", and 70 of those sat inside a catch block holding an
 * error whose message explained precisely what went wrong — the server's reason
 * was caught and discarded. At the same time, passing the raw message straight
 * through is no better: it leaks "Failed to fetch", "Request failed with status
 * 500" and JSON parse errors at people.
 *
 * So this decides between three outcomes, in order:
 *   1. the server explained itself  → say what happened, and why
 *   2. the request never landed     → say so, and suggest checking the connection
 *   3. anything else                → own it, and suggest retrying
 *
 * Callers pass the action in plain words, as the user would describe it:
 *   userMessage(error, "save your changes")
 */

/** Raw messages that mean "the request never reached the server". */
const NETWORK_SIGNATURES = [
  "failed to fetch",
  "networkerror",
  "load failed",
  "connection appears to be offline",
  "err_internet_disconnected",
  "err_connection",
  "fetch failed",
  "socket hang up",
  "econnrefused",
  "network request failed",
];

/**
 * Raw messages that carry no meaning for a user — transport noise, framework
 * strings, or a bare status code.
 */
const OPAQUE_SIGNATURES = [
  "request failed with status",
  "internal server error",
  "unexpected token",
  "is not valid json",
  "unexpected end of json input",
  "bad gateway",
  "service unavailable",
  "gateway timeout",
  "aborterror",
  "the operation was aborted",
];

function rawMessageOf(error: unknown): string {
  if (typeof error === "string") {
    return error.trim();
  }
  if (error instanceof Error) {
    return error.message.trim();
  }
  // Deliberately not JSON.stringify — an object here means we have nothing
  // worth showing, and a serialized blob is worse than a plain apology.
  return "";
}

function matchesAny(haystack: string, needles: readonly string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

/** Adds a full stop unless the text already ends in terminal punctuation. */
function terminate(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

/**
 * Strips a leading "Failed to " / "Couldn't " / "Unable to " from a server
 * message so it doesn't read as a duplicate of our own prefix.
 */
function isEchoOfAction(reason: string, action: string): boolean {
  const normalised = reason
    .toLowerCase()
    .replace(/^(failed to|couldn't|could not|unable to)\s+/, "")
    .replace(/[.!?]$/, "")
    .trim();

  const normalisedAction = action
    .toLowerCase()
    .replace(/^(the|your|that)\s+/, "")
    .trim();

  return (
    normalised === normalisedAction ||
    normalised.replace(/^(the|your|that)\s+/, "") === normalisedAction
  );
}

export function userMessage(error: unknown, action?: string): string {
  const raw = rawMessageOf(error);
  const lowered = raw.toLowerCase();

  // No action given: the reason has to stand on its own.
  if (!action) {
    return raw &&
      !matchesAny(lowered, [...NETWORK_SIGNATURES, ...OPAQUE_SIGNATURES])
      ? terminate(raw)
      : "Something went wrong — please try again.";
  }

  const prefix = `Couldn't ${action}`;

  if (raw && matchesAny(lowered, NETWORK_SIGNATURES)) {
    return `${prefix} — the server didn't respond. Check your connection and try again.`;
  }

  // A bare status code or transport string means the failure really was ours.
  if (!raw || /^\d{3}$/.test(raw) || matchesAny(lowered, OPAQUE_SIGNATURES)) {
    return `${prefix}. Something went wrong on our end — please try again.`;
  }

  // The server answered, but only by restating the action ("Failed to save the
  // milestone"). We know it failed and genuinely don't know why, so don't
  // guess at whose fault it was.
  if (isEchoOfAction(raw, action)) {
    return `${prefix}. Please try again.`;
  }

  // The server's own sentence, kept verbatim: lower-casing it to splice after a
  // dash would mangle acronyms ("SMTP" → "sMTP").
  return `${prefix}. ${terminate(raw)}`;
}

export default userMessage;
