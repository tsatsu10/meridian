import type { Context } from "hono";

export type SelfCheck =
  | { ok: true; userEmail: string }
  | { ok: false; response: Response };

/**
 * Authorization guard for the user-preferences router.
 *
 * Every route here identifies its target user by an email supplied by the
 * caller (`:userEmail`, `?userEmail`, or a JSON body field). The global
 * `/api/*` middleware authenticates the request and puts the session's address
 * in `userEmail`, but nothing compared the two — so any signed-in user could
 * read and overwrite anybody else's preferences just by changing the address in
 * the URL.
 *
 * On success this returns the *verified* address rather than a bare boolean, so
 * call sites go on to query with a value that has been both authorized and
 * narrowed to `string`, instead of the caller-supplied one.
 *
 * Comparison is exact, matching how `users.email` is matched everywhere else
 * (it is the FK target across the schema); a looser, case-insensitive check
 * would authorize more than the subsequent lookup would find.
 */
export function requireSelf(c: Context, targetEmail: unknown): SelfCheck {
  const sessionEmail = c.get("userEmail");

  if (typeof sessionEmail !== "string" || sessionEmail === "") {
    return {
      ok: false,
      response: c.json({ error: "Authentication required" }, 401),
    };
  }

  if (typeof targetEmail !== "string" || targetEmail === "") {
    return {
      ok: false,
      response: c.json({ error: "Missing userEmail parameter" }, 400),
    };
  }

  if (targetEmail !== sessionEmail) {
    // Deliberately says nothing about whether that account exists.
    return { ok: false, response: c.json({ error: "Forbidden" }, 403) };
  }

  return { ok: true, userEmail: sessionEmail };
}

export default requireSelf;
