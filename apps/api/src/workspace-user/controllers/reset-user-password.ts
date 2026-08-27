import type { Context } from "hono";
import bcrypt from "bcrypt";
import * as crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { users } from "../../database/schema";
import emailService from "../../services/email-service";
import logger from "../../utils/logger";
import { getErrorMessage } from "../../utils/error-utils";
import { requireCanManageMember } from "../utils/role-hierarchy";

// @epic-3.4-teams: Reset user password (admin action, scoped to a shared workspace)
async function resetUserPassword(c: Context) {
  const workspaceId = c.req.param("workspaceId");
  const userEmail = c.req.param("userEmail");
  const currentUserEmail = c.get("userEmail");

  if (!workspaceId || !userEmail || !currentUserEmail) {
    return c.json(
      { error: "workspaceId, userEmail, and authenticated user are required" },
      400,
    );
  }

  // SECURITY: only a workspace admin/manager who shares the target's
  // workspace may reset that member's password — this used to have no
  // check at all, letting any authenticated user reset anyone's password.
  const denied = await requireCanManageMember(c, workspaceId, userEmail);
  if (denied) return denied;

  try {
    const db = getDatabase();
    const tempPassword = crypto.randomBytes(12).toString("hex");
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const [updatedUser] = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.email, userEmail))
      .returning({ email: users.email });

    if (!updatedUser) {
      return c.json({ error: "User not found" }, 404);
    }

    // Deliver the temporary password out-of-band — it must never be
    // returned in the API response.
    await emailService.sendNotificationEmail(
      userEmail,
      "Your Meridian password has been reset",
      `A workspace administrator reset your password. Your new temporary password is: ${tempPassword}\n\nPlease sign in and change it immediately.`,
    );

    return c.json({
      success: true,
      message:
        "Password reset — a temporary password has been emailed to the user.",
    });
  } catch (error) {
    logger.error("❌ Error resetting user password:", error);
    return c.json(
      { error: "Failed to reset password", details: getErrorMessage(error) },
      500,
    );
  }
}

export default resetUserPassword;
