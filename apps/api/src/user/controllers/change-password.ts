import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { userTable } from "../../database/schema";
import { commonSchemas } from "../../lib/validation";
import { UnauthorizedError, ValidationError } from "../../utils/errors";
import revokeOtherSessions from "../utils/revoke-other-sessions";

async function changePassword(
  userEmail: string,
  currentPassword: string,
  newPassword: string,
  /** The caller's own session token, so it alone survives the revocation. */
  currentSessionToken?: string | null,
) {
  const db = getDatabase();

  const [user] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, userEmail))
    .limit(1);

  if (!user) {
    throw new UnauthorizedError("Current password is incorrect");
  }

  const isCurrentPasswordValid = await bcrypt.compare(
    currentPassword,
    user.password,
  );
  if (!isCurrentPasswordValid) {
    throw new UnauthorizedError("Current password is incorrect");
  }

  const validation = commonSchemas.password.safeParse(newPassword);
  if (!validation.success) {
    throw new ValidationError(
      validation.error.issues[0]?.message || "Invalid password",
    );
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const now = new Date();
  await db
    .update(userTable)
    .set({
      password: hashedPassword,
      // Gives the Security page's "Strong Password" check a real signal. It
      // previously scored whatever was typed into the unsubmitted form.
      passwordUpdatedAt: now,
      updatedAt: now,
    })
    .where(eq(userTable.id, user.id));

  // Evict every other session. Without this a password change left a stolen
  // session valid for the rest of its 30-day life.
  const revokedCount = await revokeOtherSessions(user.id, currentSessionToken);

  return { revokedSessions: revokedCount };
}

export default changePassword;
