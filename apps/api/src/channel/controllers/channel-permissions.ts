// @epic-3.6-communication: Channel permissions management
// @persona-sarah: PM needs to manage channel access and permissions
// @persona-david: Team lead needs to control who can do what in channels

import { Hono } from "hono";
import { and, eq, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDatabase } from "../../database/connection";
import { 
  channelMembershipTable, 
  channelAuditLogTable,
  userTable 
} from "../../database/schema";
import logger from '../../utils/logger';

const app = new Hono<{ Variables: { userEmail: string } }>();

// @epic-3.6-communication: Get channel permissions for a user
app.get("/:channelId/permissions", async (c) => {
  const channelId = c.req.param("channelId");
  const userEmail = c.get("userEmail");

  try {
    const db = getDatabase();
    
    // Get channel and user membership
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

    // Derive permissions from role
    const permissions = getRolePermissions(membership.role);

    return c.json({
      permissions,
      role: membership.role,
    });
  } catch (error) {
    logger.error("Error fetching channel permissions:", error);
    return c.json({ error: "Failed to fetch permissions" }, 500);
  }
});

// @epic-3.6-communication: Update member role (which determines permissions)
// Note: Individual permissions can't be updated - use role to change permissions
app.put("/:channelId/members/:memberEmail/permissions", async (c) => {
  const channelId = c.req.param("channelId");
  const memberEmail = c.req.param("memberEmail");
  const userEmail = c.get("userEmail");
  const body = await c.req.json();

  try {
    const db = getDatabase();
    
    // Check if user has permission to manage permissions (owner only)
    const [managerMembership] = await db
      .select()
      .from(channelMembershipTable)
      .where(
        and(
          eq(channelMembershipTable.channelId, channelId),
          eq(channelMembershipTable.userEmail, userEmail)
        )
      );

    if (!managerMembership || managerMembership.role !== 'owner') {
      return c.json({ error: "Only channel owners can change member roles" }, 403);
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
      return c.json({ error: "Cannot modify owner role" }, 403);
    }

    // Update role if provided (permissions are derived from role)
    if (!body.role) {
      return c.json({ error: "Role is required (owner/admin/moderator/member/viewer)" }, 400);
    }

    const [updatedMembership] = await db
      .update(channelMembershipTable)
      .set({
        role: body.role,
      })
      .where(
        and(
          eq(channelMembershipTable.channelId, channelId),
          eq(channelMembershipTable.userEmail, memberEmail)
        )
      )
      .returning();

    if (!updatedMembership) {
      return c.json({ error: "Failed to update role" }, 500);
    }

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
      action: "role_updated",
      actorId: actorUser?.id,
      targetId: targetUser?.id,
      details: {
        oldRole: targetMembership.role,
        newRole: body.role,
      },
    });

    return c.json({ 
      membership: updatedMembership,
      role: updatedMembership.role,
      permissions: getRolePermissions(updatedMembership.role),
    });
  } catch (error) {
    logger.error("Error updating channel role:", error);
    return c.json({ error: "Failed to update role" }, 500);
  }
});

// @epic-3.6-communication: Mute/unmute — no mute columns on channel_membership; not implemented
app.post("/:channelId/members/:memberEmail/mute", async (c) => {
  return c.json(
    {
      error:
        "Member mute is not available in this deployment (no mute fields in the channel membership schema).",
    },
    501
  );
});

app.post("/:channelId/members/:memberEmail/unmute", async (c) => {
  return c.json(
    {
      error:
        "Member unmute is not available in this deployment (no mute fields in the channel membership schema).",
    },
    501
  );
});

// @epic-3.6-communication: Get channel audit log
app.get("/:channelId/audit-log", async (c) => {
  const channelId = c.req.param("channelId");
  const userEmail = c.get("userEmail");
  const limit = parseInt(c.req.query("limit") || "50");
  const offset = parseInt(c.req.query("offset") || "0");

  try {
    const db = getDatabase();
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
      (membership.role !== "owner" && membership.role !== "admin")
    ) {
      return c.json({ error: "Permission denied" }, 403);
    }

    const actorUser = alias(userTable, "channel_audit_actor");
    const targetUser = alias(userTable, "channel_audit_target");

    const auditLog = await db
      .select({
        id: channelAuditLogTable.id,
        action: channelAuditLogTable.action,
        details: channelAuditLogTable.details,
        createdAt: channelAuditLogTable.createdAt,
        actorId: channelAuditLogTable.actorId,
        targetId: channelAuditLogTable.targetId,
        actor: {
          name: actorUser.name,
          email: actorUser.email,
        },
        targetUserProfile: {
          name: targetUser.name,
          email: targetUser.email,
        },
      })
      .from(channelAuditLogTable)
      .leftJoin(actorUser, eq(channelAuditLogTable.actorId, actorUser.id))
      .leftJoin(targetUser, eq(channelAuditLogTable.targetId, targetUser.id))
      .where(eq(channelAuditLogTable.channelId, channelId))
      .orderBy(desc(channelAuditLogTable.createdAt))
      .limit(limit)
      .offset(offset);

    return c.json({ auditLog });
  } catch (error) {
    logger.error("Error fetching audit log:", error);
    return c.json({ error: "Failed to fetch audit log" }, 500);
  }
});

// Helper function to get role-based permissions
function getRolePermissions(role: string) {
  const permissionSets: Record<string, Record<string, boolean>> = {
    'owner': {
      canSendMessages: true,
      canEditMessages: true,
      canDeleteMessages: true,
      canPinMessages: true,
      canInviteMembers: true,
      canRemoveMembers: true,
      canManageChannel: true,
      canManagePermissions: true,
    },
    'admin': {
      canSendMessages: true,
      canEditMessages: true,
      canDeleteMessages: true,
      canPinMessages: true,
      canInviteMembers: true,
      canRemoveMembers: true,
      canManageChannel: true,
      canManagePermissions: false,
    },
    'moderator': {
      canSendMessages: true,
      canEditMessages: true,
      canDeleteMessages: true,
      canPinMessages: true,
      canInviteMembers: true,
      canRemoveMembers: false,
      canManageChannel: false,
      canManagePermissions: false,
    },
    'member': {
      canSendMessages: true,
      canEditMessages: false,
      canDeleteMessages: false,
      canPinMessages: false,
      canInviteMembers: false,
      canRemoveMembers: false,
      canManageChannel: false,
      canManagePermissions: false,
    },
    'viewer': {
      canSendMessages: false,
      canEditMessages: false,
      canDeleteMessages: false,
      canPinMessages: false,
      canInviteMembers: false,
      canRemoveMembers: false,
      canManageChannel: false,
      canManagePermissions: false,
    },
  };

  return permissionSets[role] || permissionSets['member'];
}

export default app; 
