import { Hono } from "hono";
import { and, eq, isNull, or } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { getDatabase } from "../database/connection";
import { channelTable, channelMembershipTable, userTable, workspaceTable } from "../database/schema";
import getSettings from "../utils/get-settings";
import { checkRateLimit, RATE_LIMITS } from "../middlewares/chat-rate-limiter";
import { sanitizeChannelName, sanitizeChannelDescription } from "../lib/chat-sanitization";

// Debug: Check if channelTable is defined
logger.debug('🔍 Channel import check:', {
  channelTable: typeof channelTable,
  hasId: channelTable && 'id' in channelTable ? 'yes' : 'no'
});

// Import enhanced controllers
import channelPermissions from "./controllers/channel-permissions";
import channelInvitations from "./controllers/channel-invitations";
import enhancedChannelManagement from "./controllers/enhanced-channel-management";
import logger from '../utils/logger';

const app = new Hono<{ Variables: { userEmail: string } }>();

// Mount enhanced controllers
app.route("/permissions", channelPermissions);
app.route("/invitations", channelInvitations);
app.route("/management", enhancedChannelManagement);

// @epic-3.6-communication: List channels for a workspace
app.get("/:workspaceId", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const userEmail = c.get("userEmail");

  try {
    logger.debug(`🔍 Fetching channels for workspace: ${workspaceId}, user: ${userEmail}`);
    
    // ✅ Demo mode disabled - return only real channels from database
    const db = getDatabase();
    
    // First, get all channels for the workspace that are public or user has access to
    const publicChannels = await db
      .select({
        id: channelTable.id,
        name: channelTable.name,
        description: channelTable.description,
        workspaceId: channelTable.workspaceId,
        createdBy: channelTable.createdBy,
        isPrivate: channelTable.isPrivate,
        isArchived: channelTable.isArchived,
        createdAt: channelTable.createdAt,
      })
      .from(channelTable)
      .where(
        and(
          eq(channelTable.workspaceId, workspaceId),
          eq(channelTable.isArchived, false),
          eq(channelTable.isPrivate, false) // Only public channels
        )
      );

    // Then get channels where user is a member (including private ones)
    const memberChannels = await db
      .select({
        id: channelTable.id,
        name: channelTable.name,
        description: channelTable.description,
        workspaceId: channelTable.workspaceId,
        createdBy: channelTable.createdBy,
        isPrivate: channelTable.isPrivate,
        isArchived: channelTable.isArchived,
        createdAt: channelTable.createdAt,
        memberRole: channelMembershipTable.role,
      })
      .from(channelTable)
      .innerJoin(
        channelMembershipTable,
        eq(channelMembershipTable.channelId, channelTable.id)
      )
      .where(
        and(
          eq(channelTable.workspaceId, workspaceId),
          eq(channelTable.isArchived, false),
          eq(channelMembershipTable.userEmail, userEmail)
        )
      );

    // Combine and deduplicate channels
    const channelMap = new Map();
    
    // Add public channels
    publicChannels.forEach(channel => {
      channelMap.set(channel.id, { ...channel, memberRole: null });
    });
    
    // Add/update with member channels (this will override public channels with member info)
    memberChannels.forEach(channel => {
      channelMap.set(channel.id, channel);
    });

    const channels = Array.from(channelMap.values());
    
    logger.debug(`✅ Found ${channels.length} channels for workspace ${workspaceId}`);
    return c.json({ channels });
  } catch (error) {
    logger.error("❌ Error fetching channels:", error);
    logger.error("Stack trace:", error instanceof Error ? error.stack : 'Unknown error');
    // Return empty channels instead of error to prevent frontend crashes
    return c.json({ channels: [] });
  }
});

// @epic-3.6-communication: Create new channel
app.post("/", async (c) => {
  const userEmail = c.get("userEmail");
  const userId = c.get("userId");
  const body = await c.req.json();
  
  let {
    name,
    description,
    workspaceId,
    isPrivate = false,
  } = body;

  if (!name || !workspaceId) {
    return c.json({ error: "Name and workspace ID are required" }, 400);
  }

  // 🔒 SECURITY: Rate limit channel creation (5 per minute)
  if (userId) {
    try {
      await checkRateLimit(userId, RATE_LIMITS.CREATE_CHANNEL);
    } catch (rateLimitError) {
      logger.warn('Channel creation rate limit exceeded', { userId });
      return c.json({ error: 'Too many channels created. Please wait a moment.' }, 429);
    }
  }

  // 🔒 SECURITY: Sanitize channel name and description
  name = sanitizeChannelName(name);
  description = description ? sanitizeChannelDescription(description) : undefined;

  if (!name || name.length === 0) {
    return c.json({ error: "Channel name is invalid or contains dangerous content" }, 400);
  }

  try {
    // ✅ Demo mode disabled - create real channels only
    const db = getDatabase();
    
    // Check if user has permission to create channels in this workspace
    const workspace = await db
      .select()
      .from(workspaceTable)
      .where(eq(workspaceTable.id, workspaceId))
      .limit(1);

    if (workspace.length === 0) {
      return c.json({ error: "Workspace not found" }, 404);
    }

    // Create the channel (only persist columns that exist in current schema)
    const newChannels = await db
      .insert(channelTable)
      .values({
        id: createId(),
        name,
        description,
        workspaceId,
        createdBy: userEmail,
        isPrivate,
      })
      .returning();

    const newChannel = newChannels[0];
    if (!newChannel) {
      return c.json({ error: "Failed to create channel" }, 500);
    }

    // Add creator as channel owner
    await db.insert(channelMembershipTable).values({
      id: createId(),
      channelId: newChannel.id,
      userEmail,
      role: "owner",
      // Note: Permissions are determined by role, not individual fields
      // owner role has all permissions
    });

    return c.json({ channel: newChannel }, 201);
  } catch (error) {
    logger.error("Error creating channel:", error);
    return c.json(
      {
        error: "Failed to create channel",
        details: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

// @epic-3.6-communication: Update channel
app.put("/:channelId", async (c) => {
  const db = getDatabase(); // FIX: Initialize database connection
  const channelId = c.req.param("channelId");
  const userEmail = c.get("userEmail");
  const body = await c.req.json();

  try {
    // Check if user has permission to manage this channel (must be owner or admin)
    const membership = await db
      .select()
      .from(channelMembershipTable)
      .where(
        and(
          eq(channelMembershipTable.channelId, channelId),
          eq(channelMembershipTable.userEmail, userEmail)
        )
      )
      .limit(1);

    const [memberRow] = membership;
    if (!memberRow) {
      return c.json({ error: "Not a member of this channel" }, 403);
    }

    // Only owners and admins can update channels
    const userRole = memberRow.role;
    if (userRole !== 'owner' && userRole !== 'admin') {
      return c.json({ error: "Only channel owners and admins can update channels" }, 403);
    }

    // Only update fields that exist in the channel table schema
    const updateData: Record<string, any> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.isPrivate !== undefined) updateData.isPrivate = body.isPrivate;
    
    const [updatedChannel] = await db
      .update(channelTable)
      .set(updateData)
      .where(eq(channelTable.id, channelId))
      .returning();

    return c.json({ channel: updatedChannel });
  } catch (error) {
    logger.error("Error updating channel:", error);
    return c.json({ error: "Failed to update channel" }, 500);
  }
});

// @epic-3.6-communication: Archive/Delete channel
app.delete("/:channelId", async (c) => {
  const db = getDatabase();
  const channelId = c.req.param("channelId");
  const userEmail = c.get("userEmail");

  try {
    logger.debug(`🗑️ DELETE channel request: ${channelId} by ${userEmail}`);
    
    if (!channelId) {
      return c.json({ error: "Channel ID is required" }, 400);
    }

    if (!userEmail) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // First, check if the channel exists and if user is the creator
    const [channelInfo] = await db
      .select()
      .from(channelTable)
      .where(eq(channelTable.id, channelId))
      .limit(1);

    if (!channelInfo) {
      logger.warn(`⛔ Channel not found: ${channelId}`);
      return c.json({ error: "Channel not found" }, 404);
    }

    // Check if user created the channel (they can always delete their own channel)
    const isCreator = channelInfo.createdBy === userEmail;

    if (!isCreator) {
      // Check if user has permission via membership (must be owner or admin)
      const membership = await db
        .select()
        .from(channelMembershipTable)
        .where(
          and(
            eq(channelMembershipTable.channelId, channelId),
            eq(channelMembershipTable.userEmail, userEmail)
          )
        )
        .limit(1);

      const [memberRow] = membership;
      if (!memberRow) {
        logger.warn(`⛔ User not a member and not creator: ${userEmail} cannot delete channel ${channelId}`);
        return c.json({ error: "You must be the channel creator, owner, or admin to delete this channel" }, 403);
      }

      // Only owners and admins can delete channels
      const userRole = memberRow.role;
      if (userRole !== 'owner' && userRole !== 'admin') {
        logger.warn(`⛔ Permission denied: ${userEmail} (role: ${userRole}) cannot delete channel ${channelId}`);
        return c.json({ error: "Only channel owners and admins can delete channels" }, 403);
      }
    } else {
      logger.info(`✅ User ${userEmail} is the creator of channel ${channelId}, allowing deletion`);
    }

    // Archive the channel (soft delete)
    const result = await db
      .update(channelTable)
      .set({ isArchived: true })
      .where(eq(channelTable.id, channelId))
      .returning();

    if (!result || result.length === 0) {
      logger.error(`❌ Channel not found for deletion: ${channelId}`);
      return c.json({ error: "Channel not found" }, 404);
    }

    logger.info(`✅ Channel archived successfully: ${channelId}`);
    return c.json({ success: true, channel: result[0] });
  } catch (error) {
    logger.error("❌ Error archiving channel:", error);
    logger.error("Error details:", {
      channelId,
      userEmail,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return c.json({ error: "Failed to archive channel" }, 500);
  }
});

// @epic-3.6-communication: Join channel
app.post("/:channelId/join", async (c) => {
  const channelId = c.req.param("channelId");
  const userEmail = c.get("userEmail");
  const userId = c.get("userId");

  try {
    // 🔒 SECURITY: Rate limit channel joins (10 per minute)
    if (userId) {
      try {
        await checkRateLimit(userId, RATE_LIMITS.JOIN_CHANNEL);
      } catch (rateLimitError) {
        logger.warn('Channel join rate limit exceeded', { userId, channelId });
        return c.json({ error: 'Too many channel joins. Please wait a moment.' }, 429);
      }
    }

    // ✅ Demo mode disabled - only real channels allowed
    const db = getDatabase();
    
    // Check if channel exists and is not archived
    const channel = await db
      .select()
      .from(channelTable)
      .where(
        and(
          eq(channelTable.id, channelId),
          eq(channelTable.isArchived, false) // ✅ Fixed: Use isArchived instead of archived
        )
      )
      .limit(1);

    if (channel.length === 0) {
      return c.json({ error: "Channel not found" }, 404);
    }

    // Check if already a member
    const existingMembership = await db
      .select()
      .from(channelMembershipTable)
      .where(
        and(
          eq(channelMembershipTable.channelId, channelId),
          eq(channelMembershipTable.userEmail, userEmail)
        )
      )
      .limit(1);

    if (existingMembership.length > 0) {
      return c.json({ message: "Already a member" });
    }

    // Add user to channel
    await db.insert(channelMembershipTable).values({
      id: createId(),
      channelId,
      userEmail,
      role: "member",
    });

    return c.json({ success: true });
  } catch (error) {
    logger.error("Error joining channel:", error);
    return c.json({ error: "Failed to join channel" }, 500);
  }
});

// @epic-3.6-communication: Get channel members
// List all members of a channel with their roles and permissions
app.get("/:channelId/members", async (c) => {
  const db = getDatabase();
  const channelId = c.req.param("channelId");
  const userEmail = c.get("userEmail");

  try {
    // Check if channel exists
    const [channel] = await db
      .select()
      .from(channelTable)
      .where(eq(channelTable.id, channelId))
      .limit(1);

    if (!channel || channel.isArchived) { // ✅ Fixed: Use isArchived
      return c.json({ error: "Channel not found" }, 404);
    }

    // Check if user has access to see members
    const [membership] = await db
      .select()
      .from(channelMembershipTable)
      .where(
        and(
          eq(channelMembershipTable.channelId, channelId),
          eq(channelMembershipTable.userEmail, userEmail)
        )
      )
      .limit(1);

    // If private channel and not a member, deny access
    if (channel.isPrivate && !membership) {
      return c.json({ error: "Access denied" }, 403);
    }

    // Get all members with user details
    // Get channel members with role-based permissions
    const members = await db
      .select({
        id: channelMembershipTable.id,
        userEmail: channelMembershipTable.userEmail,
        userName: userTable.name,
        userAvatar: userTable.avatar,
        role: channelMembershipTable.role,
        joinedAt: channelMembershipTable.joinedAt,
        // Note: Permissions are derived from role on the client/logic side:
        // owner: all permissions
        // admin: all except channel deletion
        // member: basic permissions
      })
      .from(channelMembershipTable)
      .leftJoin(userTable, eq(userTable.email, channelMembershipTable.userEmail))
      .where(eq(channelMembershipTable.channelId, channelId))
      .orderBy(channelMembershipTable.joinedAt);

    return c.json({ members }, 200);
  } catch (error) {
    logger.error("Error fetching channel members:", error);
    return c.json({ error: "Failed to fetch members" }, 500);
  }
});

// @epic-3.6-communication: Add member to channel
// Invite/add a user to a channel
app.post("/:channelId/members", async (c) => {
  const db = getDatabase();
  const channelId = c.req.param("channelId");
  const userEmail = c.get("userEmail");
  const body = await c.req.json();
  const { userEmailToAdd, role = "member" } = body;

  if (!userEmailToAdd) {
    return c.json({ error: "User email is required" }, 400);
  }

  try {
    // Check if requester has permission to invite (role-based)
    const [membership] = await db
      .select()
      .from(channelMembershipTable)
      .where(
        and(
          eq(channelMembershipTable.channelId, channelId),
          eq(channelMembershipTable.userEmail, userEmail)
        )
      )
      .limit(1);

    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      return c.json({ error: "Permission denied" }, 403);
    }

    // Check if user exists
    const [userToAdd] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, userEmailToAdd))
      .limit(1);

    if (!userToAdd) {
      return c.json({ error: "User not found" }, 404);
    }

    // Check if already a member
    const [existingMember] = await db
      .select()
      .from(channelMembershipTable)
      .where(
        and(
          eq(channelMembershipTable.channelId, channelId),
          eq(channelMembershipTable.userEmail, userEmailToAdd)
        )
      )
      .limit(1);

    if (existingMember) {
      return c.json({ error: "User is already a member" }, 409);
    }

    // Add user to channel with role
    // Permissions are determined by role:
    // - owner: all permissions
    // - admin: all permissions except channel deletion
    // - member: basic read/write permissions
    const [newMember] = await db
      .insert(channelMembershipTable)
      .values({
        id: createId(),
        channelId,
        userEmail: userEmailToAdd,
        role, // Permissions derived from role, not stored as separate fields
      })
      .returning();

    // Note: memberCount and lastActivityAt fields don't exist in channel table
    // Member count can be calculated on-demand if needed
    
    return c.json({ member: newMember }, 201);
  } catch (error) {
    logger.error("Error adding member:", error);
    return c.json({ error: "Failed to add member" }, 500);
  }
});

// @epic-3.6-communication: Remove member from channel
app.delete("/:channelId/members/:memberEmail", async (c) => {
  const db = getDatabase();
  const channelId = c.req.param("channelId");
  const memberEmail = decodeURIComponent(c.req.param("memberEmail"));
  const userEmail = c.get("userEmail");

  try {
    // Check if requester has permission to remove members
    const [membership] = await db
      .select()
      .from(channelMembershipTable)
      .where(
        and(
          eq(channelMembershipTable.channelId, channelId),
          eq(channelMembershipTable.userEmail, userEmail)
        )
      )
      .limit(1);

    if (!membership) {
      return c.json({ error: "Not a member of this channel" }, 403);
    }

    // Can remove self, otherwise require owner/admin role
    const isSelf = memberEmail === userEmail;
    if (!isSelf && membership.role !== "owner" && membership.role !== "admin") {
      return c.json({ error: "Permission denied" }, 403);
    }

    // Check if member exists
    const [memberToRemove] = await db
      .select()
      .from(channelMembershipTable)
      .where(
        and(
          eq(channelMembershipTable.channelId, channelId),
          eq(channelMembershipTable.userEmail, memberEmail)
        )
      )
      .limit(1);

    if (!memberToRemove) {
      return c.json({ error: "Member not found" }, 404);
    }

    // Cannot remove channel owner (only owner can transfer ownership)
    if (memberToRemove.role === "owner" && !isSelf) {
      return c.json({ error: "Cannot remove channel owner" }, 403);
    }

    // Remove member
    await db
      .delete(channelMembershipTable)
      .where(
        and(
          eq(channelMembershipTable.channelId, channelId),
          eq(channelMembershipTable.userEmail, memberEmail)
        )
      );

    return c.json({ success: true }, 200);
  } catch (error) {
    logger.error("Error removing member:", error);
    return c.json({ error: "Failed to remove member" }, 500);
  }
});

// @epic-3.6-communication: Update member role/permissions
app.put("/:channelId/members/:memberEmail/role", async (c) => {
  const db = getDatabase();
  const channelId = c.req.param("channelId");
  const memberEmail = decodeURIComponent(c.req.param("memberEmail"));
  const userEmail = c.get("userEmail");
  const body = await c.req.json();
  const { role, permissions } = body;

  if (!role) {
    return c.json({ error: "Role is required" }, 400);
  }

  try {
    // Check if requester has permission to manage permissions (role-based)
    const [membership] = await db
      .select()
      .from(channelMembershipTable)
      .where(
        and(
          eq(channelMembershipTable.channelId, channelId),
          eq(channelMembershipTable.userEmail, userEmail)
        )
      )
      .limit(1);

    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      return c.json({ error: "Permission denied" }, 403);
    }

    // Check if member exists
    const [memberToUpdate] = await db
      .select()
      .from(channelMembershipTable)
      .where(
        and(
          eq(channelMembershipTable.channelId, channelId),
          eq(channelMembershipTable.userEmail, memberEmail)
        )
      )
      .limit(1);

    if (!memberToUpdate) {
      return c.json({ error: "Member not found" }, 404);
    }

    // Cannot change owner role
    if (memberToUpdate.role === "owner") {
      return c.json({ error: "Cannot change owner role" }, 403);
    }

    // Update role and permissions
    const [updatedMember] = await db
      .update(channelMembershipTable)
      .set({
        role,
        ...permissions,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(channelMembershipTable.channelId, channelId),
          eq(channelMembershipTable.userEmail, memberEmail)
        )
      )
      .returning();

    return c.json({ member: updatedMember }, 200);
  } catch (error) {
    logger.error("Error updating member role:", error);
    return c.json({ error: "Failed to update member role" }, 500);
  }
});

// @epic-3.6-communication: Get a single channel by ID
// Sarah (PM) and Mike (Dev) need to fetch channel details for real-time collaboration
app.get("/channel/:channelId", async (c) => {
  const db = getDatabase(); // FIX: Initialize database connection
  const channelId = c.req.param("channelId");
  const userEmail = c.get("userEmail");

  try {
    // Fetch the channel and membership info
    const result = await db
      .select({
        id: channelTable.id,
        name: channelTable.name,
        description: channelTable.description,
        workspaceId: channelTable.workspaceId,
        createdBy: channelTable.createdBy,
        isArchived: channelTable.isArchived, // ✅ Fixed: Use isArchived
        isPrivate: channelTable.isPrivate,
        createdAt: channelTable.createdAt,
        memberRole: channelMembershipTable.role,
      })
      .from(channelTable)
      .leftJoin(
        channelMembershipTable,
        and(
          eq(channelMembershipTable.channelId, channelTable.id),
          eq(channelMembershipTable.userEmail, userEmail)
        )
      )
      .where(eq(channelTable.id, channelId));

    const channel = result[0];
    if (!channel || channel.isArchived) { // ✅ Fixed: Use isArchived
      return c.json({ error: "Channel not found" }, 404);
    }

    // Only allow if public or user is a member
    const isPublic = !channel.isPrivate;
    const isMember = !!channel.memberRole;
    if (!isPublic && !isMember) {
      return c.json({ error: "Not authorized" }, 404);
    }

    return c.json({ channel });
  } catch (error) {
    logger.error("Error fetching channel:", error);
    return c.json({ error: "Failed to fetch channel" }, 500);
  }
});

export default app; 
