import { Hono } from "hono";
import { authMiddleware } from "../middlewares/secure-auth";
import { getDatabase } from "../database/connection";
import { workspaceInvites } from "../database/schema";
import { eq, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import logger from "../utils/logger";

const inviteRoutes = new Hono();

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Resend invitation
inviteRoutes.post("/resend", authMiddleware, async (c) => {
  try {
    const workspaceId = c.get("workspaceId") as string | undefined;
    const userId = c.get("userId") as string | undefined;
    const { email, role } = await c.req.json();
    const db = getDatabase();

    if (!workspaceId || !userId) {
      return c.json({ error: "Workspace ID and User ID are required" }, 400);
    }

    const inviteeEmail = String(email ?? "").trim();
    const roleToAssign = String(role ?? "").trim();
    if (!inviteeEmail || !roleToAssign) {
      return c.json({ error: "email and role are required" }, 400);
    }

    const existingInvite = await db
      .select()
      .from(workspaceInvites)
      .where(
        and(
          eq(workspaceInvites.workspaceId, workspaceId),
          eq(workspaceInvites.inviteeEmail, inviteeEmail),
          eq(workspaceInvites.status, "pending"),
        ),
      )
      .limit(1);

    const token = createId();
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    if (existingInvite.length > 0) {
      const row = existingInvite[0];
      if (!row) {
        return c.json({ error: "Failed to resolve existing invite row" }, 500);
      }
      await db
        .update(workspaceInvites)
        .set({
          roleToAssign,
          token,
          expiresAt,
          inviterUserId: userId,
        })
        .where(eq(workspaceInvites.id, row.id));

      return c.json({
        success: true,
        message: `Invitation resent to ${inviteeEmail}`,
        inviteToken: token,
      });
    }

    await db.insert(workspaceInvites).values({
      id: createId(),
      workspaceId,
      inviteeEmail,
      inviterUserId: userId,
      roleToAssign,
      token,
      status: "pending",
      expiresAt,
    });

    return c.json({
      success: true,
      message: `Invitation sent to ${inviteeEmail}`,
      inviteToken: token,
    });
  } catch (error) {
    logger.error("Error resending invitation:", error);
    return c.json({ error: "Failed to resend invitation" }, 500);
  }
});

// Generate invite link
inviteRoutes.post("/generate-link", authMiddleware, async (c) => {
  try {
    const workspaceId = c.get("workspaceId") as string | undefined;
    const userId = c.get("userId") as string | undefined;
    const { email, role } = await c.req.json();
    const db = getDatabase();

    if (!workspaceId || !userId) {
      return c.json({ error: "Workspace ID and User ID are required" }, 400);
    }

    const inviteeEmail = String(email ?? "").trim();
    const roleToAssign = String(role ?? "").trim();
    if (!inviteeEmail || !roleToAssign) {
      return c.json({ error: "email and role are required" }, 400);
    }

    const token = createId();
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    const existingInvite = await db
      .select()
      .from(workspaceInvites)
      .where(
        and(
          eq(workspaceInvites.workspaceId, workspaceId),
          eq(workspaceInvites.inviteeEmail, inviteeEmail),
        ),
      )
      .limit(1);

    if (existingInvite.length > 0) {
      const row = existingInvite[0];
      if (!row) {
        return c.json({ error: "Failed to resolve existing invite row" }, 500);
      }
      await db
        .update(workspaceInvites)
        .set({
          roleToAssign,
          token,
          expiresAt,
          status: "pending",
          inviterUserId: userId,
        })
        .where(eq(workspaceInvites.id, row.id));
    } else {
      await db.insert(workspaceInvites).values({
        id: createId(),
        workspaceId,
        inviteeEmail,
        inviterUserId: userId,
        roleToAssign,
        token,
        status: "pending",
        expiresAt,
      });
    }

    const baseUrl = process.env.APP_URL || "http://localhost:5173";
    const inviteLink = `${baseUrl}/invite/${token}`;

    return c.json({
      success: true,
      inviteLink,
      inviteToken: token,
      expiresAt,
      message: "Invite link generated successfully",
    });
  } catch (error) {
    logger.error("Error generating invite link:", error);
    return c.json({ error: "Failed to generate invite link" }, 500);
  }
});

export default inviteRoutes;
