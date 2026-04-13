// @epic-3.6-communication: Enhanced channel management
// @persona-sarah: PM needs comprehensive channel management
// @persona-david: Team lead needs member management capabilities

import { Hono } from "hono";
import { and, eq, asc } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { 
  channelTable, 
  channelMembershipTable, 
  channelAuditLogTable,
  userTable 
} from "../../database/schema";
import { createId } from "@paralleldrive/cuid2";
import logger from '../../utils/logger';

const app = new Hono<{ Variables: { userEmail: string } }>();

// @epic-3.6-communication: Get channel members with roles and permissions
app.get("/:channelId/members", async (c) => {
  const channelId = c.req.param("channelId");
  const userEmail = c.get("userEmail");

  try {
    const db = getDatabase();
    // Check if user has access to this channel
    const [membership] = await db
      .select()
      .from(channelMembershipTable)
      .where(
        and(
          eq(channelMembershipTable.channelId, channelId),
          eq(channelMembershipTable.userEmail, userEmail)
        )
      );

    const [channel] = await db
      .select()
      .from(channelTable)
      .where(eq(channelTable.id, channelId));

    if (!channel) {
      return c.json({ error: "Channel not found" }, 404);
    }

    // Allow access if public channel or user is a member
    const isPublic = !channel.isPrivate;
    if (!isPublic && !membership) {
      return c.json({ error: "Access denied" }, 403);
    }

    // Get all members with role-based permissions
    const members = await db
      .select({
        id: channelMembershipTable.id,
        userEmail: channelMembershipTable.userEmail,
        role: channelMembershipTable.role, // Permissions derived from role
        joinedAt: channelMembershipTable.joinedAt,
        user: {
          name: userTable.name,
          email: userTable.email,
          avatar: userTable.avatar,
        },
      })
      .from(channelMembershipTable)
      .leftJoin(userTable, eq(channelMembershipTable.userEmail, userTable.email))
      .where(eq(channelMembershipTable.channelId, channelId))
      .orderBy(asc(channelMembershipTable.role), asc(userTable.name));

    return c.json({ members });
  } catch (error) {
    logger.error("Error fetching channel members:", error);
    return c.json({ error: "Failed to fetch members" }, 500);
  }
});

// @epic-3.6-communication: Add member to channel
app.post("/:channelId/members", async (c) => {
  const channelId = c.req.param("channelId");
  const userEmail = c.get("userEmail");
  const body = await c.req.json();

  const { memberEmail, role = "member" } = body;

  try {
    const db = getDatabase();
    // Check if user has permission to add members
    const [membership] = await db
      .select()
      .from(channelMembershipTable)
      .where(
        and(
          eq(channelMembershipTable.channelId, channelId),
          eq(channelMembershipTable.userEmail, userEmail)
        )
      );

    if (
      !membership ||
      !["owner", "admin", "moderator"].includes(membership.role)
    ) {
      return c.json({ error: "Permission denied" }, 403);
    }

    // Check if user exists
    const [user] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, memberEmail));

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Check if already a member
    const [existingMembership] = await db
      .select()
      .from(channelMembershipTable)
      .where(
        and(
          eq(channelMembershipTable.channelId, channelId),
          eq(channelMembershipTable.userEmail, memberEmail)
        )
      );

    if (existingMembership) {
      return c.json({ error: "User is already a member" }, 400);
    }

    // Add member
    const [newMembership] = await db
      .insert(channelMembershipTable)
      .values({
        id: createId(),
        channelId,
        userEmail: memberEmail,
        role,
        userId: user.id,
      })
      .returning();

    const [actorUser] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);

    await db.insert(channelAuditLogTable).values({
      channelId,
      action: "member_added",
      actorId: actorUser?.id,
      targetId: user.id,
      details: { role },
    });

    return c.json({ membership: newMembership });
  } catch (error) {
    logger.error("Error adding member:", error);
    return c.json({ error: "Failed to add member" }, 500);
  }
});

// @epic-3.6-communication: Remove member from channel
app.delete("/:channelId/members/:memberEmail", async (c) => {
  const channelId = c.req.param("channelId");
  const memberEmail = c.req.param("memberEmail");
  const userEmail = c.get("userEmail");

  try {
    const db = getDatabase();
    // Check if user has permission to remove members (owner, admin, or moderator)
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

    // Get target member
    const [targetMembership] = await db
      .select()
      .from(channelMembershipTable)
      .where(
        and(
          eq(channelMembershipTable.channelId, channelId),
          eq(channelMembershipTable.userEmail, memberEmail)
        )
      );

    if (!targetMembership) {
      return c.json({ error: "Member not found" }, 404);
    }

    // Prevent removing owners
    if (targetMembership.role === "owner") {
      return c.json({ error: "Cannot remove channel owner" }, 403);
    }

    // Prevent removing yourself if you're not an owner
    if (memberEmail === userEmail && targetMembership.role !== "owner") {
      return c.json({ error: "Cannot remove yourself" }, 403);
    }

    await db
      .delete(channelMembershipTable)
      .where(
        and(
          eq(channelMembershipTable.channelId, channelId),
          eq(channelMembershipTable.userEmail, memberEmail)
        )
      );

    const [actorUser] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);
    const [targetUser] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, memberEmail))
      .limit(1);

    await db.insert(channelAuditLogTable).values({
      channelId,
      action: "member_removed",
      actorId: actorUser?.id,
      targetId: targetUser?.id,
      details: {
        removedRole: targetMembership.role,
        removedByEmail: userEmail,
      },
    });

    return c.json({ message: "Member removed successfully" });
  } catch (error) {
    logger.error("Error removing member:", error);
    return c.json({ error: "Failed to remove member" }, 500);
  }
});

// @epic-3.6-communication: Change member role
app.put("/:channelId/members/:memberEmail/role", async (c) => {
  const channelId = c.req.param("channelId");
  const memberEmail = c.req.param("memberEmail");
  const userEmail = c.get("userEmail");
  const body = await c.req.json();

  const { role } = body;

  try {
    const db = getDatabase();
    // Check if user has permission to manage permissions
    const [membership] = await db
      .select()
      .from(channelMembershipTable)
      .where(
        and(
          eq(channelMembershipTable.channelId, channelId),
          eq(channelMembershipTable.userEmail, userEmail)
        )
      );

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return c.json({ error: "Permission denied" }, 403);
    }

    // Get target member
    const [targetMembership] = await db
      .select()
      .from(channelMembershipTable)
      .where(
        and(
          eq(channelMembershipTable.channelId, channelId),
          eq(channelMembershipTable.userEmail, memberEmail)
        )
      );

    if (!targetMembership) {
      return c.json({ error: "Member not found" }, 404);
    }

    // Prevent changing owner role
    if (targetMembership.role === "owner") {
      return c.json({ error: "Cannot change owner role" }, 403);
    }

    // Update role (permissions are derived from role, not stored)
    const [updatedMembership] = await db
      .update(channelMembershipTable)
      .set({
        role, // Permissions are determined by role, not individual fields
      })
      .where(
        and(
          eq(channelMembershipTable.channelId, channelId),
          eq(channelMembershipTable.userEmail, memberEmail)
        )
      )
      .returning();

    const [actorUser] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);
    const [targetUser] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, memberEmail))
      .limit(1);

    await db.insert(channelAuditLogTable).values({
      channelId,
      action: "role_changed",
      actorId: actorUser?.id,
      targetId: targetUser?.id,
      details: {
        oldRole: targetMembership.role,
        newRole: role,
      },
    });

    return c.json({ membership: updatedMembership });
  } catch (error) {
    logger.error("Error changing member role:", error);
    return c.json({ error: "Failed to change member role" }, 500);
  }
});

// @epic-3.6-communication: Leave channel
app.post("/:channelId/leave", async (c) => {
  const channelId = c.req.param("channelId");
  const userEmail = c.get("userEmail");

  try {
    const db = getDatabase();
    // Get membership
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
      return c.json({ error: "Not a member of this channel" }, 404);
    }

    // Prevent owners from leaving (they must transfer ownership first)
    if (membership.role === "owner") {
      return c.json({ error: "Channel owner cannot leave. Transfer ownership first." }, 403);
    }

    await db
      .delete(channelMembershipTable)
      .where(
        and(
          eq(channelMembershipTable.channelId, channelId),
          eq(channelMembershipTable.userEmail, userEmail)
        )
      );

    const [leavingUser] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);

    await db.insert(channelAuditLogTable).values({
      channelId,
      action: "member_left",
      actorId: leavingUser?.id,
      targetId: leavingUser?.id,
      details: { userEmail },
    });

    return c.json({ message: "Left channel successfully" });
  } catch (error) {
    logger.error("Error leaving channel:", error);
    return c.json({ error: "Failed to leave channel" }, 500);
  }
});

// Helper function to check role permissions (for logic, not database storage)
// Permissions are NOT stored in the database, only the role is stored
function hasPermission(role: string, permission: string): boolean {
  const rolePermissions: Record<string, string[]> = {
    'owner': ['canSendMessages', 'canEditMessages', 'canDeleteMessages', 'canPinMessages', 
              'canInviteMembers', 'canRemoveMembers', 'canManageChannel', 'canManagePermissions'],
    'admin': ['canSendMessages', 'canEditMessages', 'canDeleteMessages', 'canPinMessages',
              'canInviteMembers', 'canRemoveMembers', 'canManageChannel'],
    'moderator': ['canSendMessages', 'canEditMessages', 'canDeleteMessages', 'canPinMessages', 'canInviteMembers'],
    'member': ['canSendMessages'],
    'viewer': [], // Read-only
  };
  
  return rolePermissions[role]?.includes(permission) || false;
}

export default app; 
