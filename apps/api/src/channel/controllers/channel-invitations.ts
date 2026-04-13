// @epic-3.6-communication: Channel invitation management
// @persona-sarah: PM needs to invite team members to channels
// @persona-david: Team lead needs to manage channel access

import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { 
  channelTable, 
  channelMembershipTable, 
  channelInvitationTable,
  channelAuditLogTable,
  userTable 
} from "../../database/schema";
import { createId } from "@paralleldrive/cuid2";
import logger from '../../utils/logger';

const app = new Hono<{ Variables: { userEmail: string } }>();

// @epic-3.6-communication: Invite users to channel
app.post("/:channelId/invite", async (c) => {
  const channelId = c.req.param("channelId");
  const userEmail = c.get("userEmail");
  const body = await c.req.json();

  const { userEmails, role = "member", message, expiresIn = 7 } = body; // expiresIn in days
  const emails = Array.isArray(userEmails) ? userEmails : [];

  try {
    const db = getDatabase();
    const [inviter] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);
    if (!inviter) {
      return c.json({ error: "Inviter not found" }, 401);
    }
    // Check if user has permission to invite members (owner, admin, or moderator)
    const [membership] = await db
      .select()
      .from(channelMembershipTable)
      .where(
        and(
          eq(channelMembershipTable.channelId, channelId),
          eq(channelMembershipTable.userEmail, userEmail)
        )
      );

    if (!membership) {
      return c.json({ error: "Not a member of this channel" }, 403);
    }

    // Check role-based permission
    const userRole = membership.role;
    if (userRole !== 'owner' && userRole !== 'admin' && userRole !== 'moderator') {
      return c.json({ error: "Permission denied. Only owners, admins, and moderators can invite members." }, 403);
    }

    // Get channel info
    const [channel] = await db
      .select()
      .from(channelTable)
      .where(eq(channelTable.id, channelId));

    if (!channel) {
      return c.json({ error: "Channel not found" }, 404);
    }

    const invitations = [];
    const expiresAt = new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000);

    for (const email of emails) {
      // Check if user already exists
      const [user] = await db
        .select()
        .from(userTable)
        .where(eq(userTable.email, email));

      if (!user) {
        continue; // Skip non-existent users
      }

      // Check if already a member
      const [existingMembership] = await db
        .select()
        .from(channelMembershipTable)
        .where(
          and(
            eq(channelMembershipTable.channelId, channelId),
            eq(channelMembershipTable.userEmail, email)
          )
        );

      if (existingMembership) {
        continue; // Skip existing members
      }

      // Check if invitation already exists
      const [existingInvitation] = await db
        .select()
        .from(channelInvitationTable)
        .where(
          and(
            eq(channelInvitationTable.channelId, channelId),
            eq(channelInvitationTable.invitedEmail, email),
            eq(channelInvitationTable.status, "pending")
          )
        );

      if (existingInvitation) {
        continue; // Skip existing pending invitations
      }

      // Create invitation
      const [invitation] = await db
        .insert(channelInvitationTable)
        .values({
          channelId,
          invitedBy: inviter.id,
          invitedUserId: user.id,
          invitedEmail: email,
          status: "pending",
          expiresAt,
        })
        .returning();

      invitations.push(invitation);

      await db.insert(channelAuditLogTable).values({
        channelId,
        actorId: inviter.id,
        action: "member_invited",
        targetId: user.id,
        details: {
          invitedEmail: email,
          role,
          message,
          expiresAt: expiresAt.toISOString(),
        },
      });
    }

    return c.json({ 
      invitations,
      message: `Invited ${invitations.length} users to ${channel.name}` 
    });
  } catch (error) {
    logger.error("Error inviting users:", error);
    return c.json({ error: "Failed to invite users" }, 500);
  }
});

// @epic-3.6-communication: Get pending invitations for a channel
app.get("/:channelId/invitations", async (c) => {
  const channelId = c.req.param("channelId");
  const userEmail = c.get("userEmail");

  try {
    const db = getDatabase();
    // Check if user has permission to view invitations (owner, admin, or moderator)
    const [membership] = await db
      .select()
      .from(channelMembershipTable)
      .where(
        and(
          eq(channelMembershipTable.channelId, channelId),
          eq(channelMembershipTable.userEmail, userEmail)
        )
      );

    if (!membership) {
      return c.json({ error: "Not a member of this channel" }, 403);
    }

    // Check role-based permission
    const userRole = membership.role;
    if (userRole !== 'owner' && userRole !== 'admin' && userRole !== 'moderator') {
      return c.json({ error: "Permission denied" }, 403);
    }

    // Get pending invitations
    const invitations = await db
      .select({
        id: channelInvitationTable.id,
        invitedEmail: channelInvitationTable.invitedEmail,
        invitedBy: channelInvitationTable.invitedBy,
        invitedUserId: channelInvitationTable.invitedUserId,
        status: channelInvitationTable.status,
        expiresAt: channelInvitationTable.expiresAt,
        createdAt: channelInvitationTable.createdAt,
      })
      .from(channelInvitationTable)
      .where(
        and(
          eq(channelInvitationTable.channelId, channelId),
          eq(channelInvitationTable.status, "pending")
        )
      )
      .orderBy(desc(channelInvitationTable.createdAt));

    return c.json({ invitations });
  } catch (error) {
    logger.error("Error fetching invitations:", error);
    return c.json({ error: "Failed to fetch invitations" }, 500);
  }
});

// @epic-3.6-communication: Accept channel invitation
app.post("/invitations/:invitationId/accept", async (c) => {
  const invitationId = c.req.param("invitationId");
  const userEmail = c.get("userEmail");

  try {
    const db = getDatabase();
    // Get invitation
    const [invitation] = await db
      .select()
      .from(channelInvitationTable)
      .where(
        and(
          eq(channelInvitationTable.id, invitationId),
          eq(channelInvitationTable.invitedEmail, userEmail),
          eq(channelInvitationTable.status, "pending")
        )
      );

    if (!invitation) {
      return c.json({ error: "Invitation not found or expired" }, 404);
    }

    // Check if invitation has expired
    if (invitation.expiresAt && new Date() > invitation.expiresAt) {
      // Mark as expired
      await db
        .update(channelInvitationTable)
        .set({ status: "expired" })
        .where(eq(channelInvitationTable.id, invitationId));

      return c.json({ error: "Invitation has expired" }, 400);
    }

    const [memberUser] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);
    if (!memberUser) {
      return c.json({ error: "User not found" }, 404);
    }

    await db.insert(channelMembershipTable).values({
      id: createId(),
      channelId: invitation.channelId,
      userEmail,
      userId: memberUser.id,
      role: "member",
      joinedAt: new Date(),
    });

    await db
      .update(channelInvitationTable)
      .set({ status: "accepted", acceptedAt: new Date() })
      .where(eq(channelInvitationTable.id, invitationId));

    await db.insert(channelAuditLogTable).values({
      channelId: invitation.channelId,
      actorId: memberUser.id,
      action: "invitation_accepted",
      targetId: invitation.invitedUserId ?? memberUser.id,
      details: { invitedEmail: invitation.invitedEmail },
    });

    return c.json({ message: "Invitation accepted successfully" });
  } catch (error) {
    logger.error("Error accepting invitation:", error);
    return c.json({ error: "Failed to accept invitation" }, 500);
  }
});

// @epic-3.6-communication: Decline channel invitation
app.post("/invitations/:invitationId/decline", async (c) => {
  const invitationId = c.req.param("invitationId");
  const userEmail = c.get("userEmail");

  try {
    const db = getDatabase();
    // Get invitation
    const [invitation] = await db
      .select()
      .from(channelInvitationTable)
      .where(
        and(
          eq(channelInvitationTable.id, invitationId),
          eq(channelInvitationTable.invitedEmail, userEmail),
          eq(channelInvitationTable.status, "pending")
        )
      );

    if (!invitation) {
      return c.json({ error: "Invitation not found" }, 404);
    }

    // Update invitation status
    await db
      .update(channelInvitationTable)
      .set({ status: "declined", declinedAt: new Date() })
      .where(eq(channelInvitationTable.id, invitationId));

    // Log the decline
    const [actor] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);
    await db.insert(channelAuditLogTable).values({
      channelId: invitation.channelId,
      actorId: actor?.id,
      action: "invitation_declined",
      targetId: invitation.invitedUserId ?? undefined,
      details: { invitedEmail: invitation.invitedEmail },
    });

    return c.json({ message: "Invitation declined" });
  } catch (error) {
    logger.error("Error declining invitation:", error);
    return c.json({ error: "Failed to decline invitation" }, 500);
  }
});

// @epic-3.6-communication: Cancel invitation
app.delete("/invitations/:invitationId", async (c) => {
  const invitationId = c.req.param("invitationId");
  const userEmail = c.get("userEmail");

  try {
    const db = getDatabase();
    // Get invitation
    const [invitation] = await db
      .select()
      .from(channelInvitationTable)
      .where(eq(channelInvitationTable.id, invitationId));

    if (!invitation) {
      return c.json({ error: "Invitation not found" }, 404);
    }

    // Check if user can cancel this invitation (owner, admin, moderator, or inviter)
    const [membership] = await db
      .select()
      .from(channelMembershipTable)
      .where(
        and(
          eq(channelMembershipTable.channelId, invitation.channelId),
          eq(channelMembershipTable.userEmail, userEmail)
        )
      );

    const [canceller] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);
    const userRole = membership?.role;
    const canCancel =
      userRole === "owner" ||
      userRole === "admin" ||
      userRole === "moderator" ||
      (canceller?.id !== undefined && invitation.invitedBy === canceller.id);

    if (!canCancel) {
      return c.json({ error: "Permission denied" }, 403);
    }

    // Delete invitation
    await db
      .delete(channelInvitationTable)
      .where(eq(channelInvitationTable.id, invitationId));

    // Log the cancellation
    await db.insert(channelAuditLogTable).values({
      channelId: invitation.channelId,
      actorId: canceller?.id,
      action: "invitation_cancelled",
      targetId: invitation.invitedUserId ?? undefined,
      details: { invitedEmail: invitation.invitedEmail },
    });

    return c.json({ message: "Invitation cancelled" });
  } catch (error) {
    logger.error("Error cancelling invitation:", error);
    return c.json({ error: "Failed to cancel invitation" }, 500);
  }
});

export default app; 
