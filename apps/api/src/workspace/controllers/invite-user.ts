import { HTTPException } from "hono/http-exception";
import { createId } from "@paralleldrive/cuid2";
import { eq, and } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { workspaceTable, userTable, workspaceInvitationTable, roleAssignmentTable } from "../../database/schema";
import { publishEvent } from "../../events";
import crypto from "crypto";
import logger from '../../utils/logger';

interface InviteUserRequest {
  workspaceId: string;
  inviteeEmail: string;
  roleToAssign: string;
  message?: string;
}

/**
 * 📧 SECURE INVITATION: Send workspace invitation to user
 * Only workspace owners/managers can invite users
 */
async function inviteUser(inviterEmail: string, data: InviteUserRequest) {
  const { workspaceId, inviteeEmail, roleToAssign, message } = data;
  const db = getDatabase();

  // 🛡️ SECURITY: Validate inviter has permission to invite users
  const inviter = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, inviterEmail))
    .limit(1);

  const inviterRow = inviter[0];
  if (!inviterRow) {
    throw new HTTPException(401, {
      message: "Inviter not found",
    });
  }

  // Check if inviter has workspace management permissions
  const inviterRole = await db
    .select()
    .from(roleAssignmentTable)
    .where(
      and(
        eq(roleAssignmentTable.userId, inviterRow.id),
        eq(roleAssignmentTable.workspaceId, workspaceId),
        eq(roleAssignmentTable.isActive, true)
      )
    )
    .limit(1);
  const inviterRoleRow = inviterRole[0];

  if (!inviterRoleRow || !["workspace-manager", "department-head"].includes(inviterRoleRow.role)) {
    throw new HTTPException(403, {
      message: "Insufficient permissions to invite users to this workspace",
    });
  }

  // Validate workspace exists
  const workspace = await db
    .select()
    .from(workspaceTable)
    .where(eq(workspaceTable.id, workspaceId))
    .limit(1);
  const workspaceRow = workspace[0];

  if (!workspaceRow) {
    throw new HTTPException(404, {
      message: "Workspace not found",
    });
  }

  // 🚨 SECURITY: Check for existing pending invitations
  const existingInvitation = await db
    .select()
    .from(workspaceInvitationTable)
    .where(
      and(
        eq(workspaceInvitationTable.workspaceId, workspaceId),
        eq(workspaceInvitationTable.inviteeEmail, inviteeEmail),
        eq(workspaceInvitationTable.status, "pending")
      )
    )
    .limit(1);

  if (existingInvitation.length) {
    throw new HTTPException(409, {
      message: "Pending invitation already exists for this user",
    });
  }

  // Check if user is already a workspace member
  const existingMemberQuery = await db
    .select()
    .from(roleAssignmentTable)
    .innerJoin(userTable, eq(userTable.id, roleAssignmentTable.userId))
    .where(
      and(
        eq(roleAssignmentTable.workspaceId, workspaceId),
        eq(roleAssignmentTable.isActive, true),
        eq(userTable.email, inviteeEmail)
      )
    )
    .limit(1);

  if (existingMemberQuery.length) {
    throw new HTTPException(409, {
      message: "User is already a member of this workspace",
    });
  }

  // 🔐 Generate secure invitation token
  const invitationToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Create invitation record
  const invitation = await db
    .insert(workspaceInvitationTable)
    .values({
      id: createId(),
      workspaceId,
      inviterUserId: inviterRow.id,
      inviteeEmail,
      roleToAssign,
      token: invitationToken,
      message: message || null,
      expiresAt,
      status: "pending",
    })
    .returning();
  const invitationRow = invitation[0];

  if (!invitationRow) {
    throw new HTTPException(500, {
      message: "Failed to create invitation",
    });
  }

  // 📧 Publish invitation event for email notification
  publishEvent("workspace.invitation.created", {
    invitationId: invitationRow.id,
    workspaceId,
    workspaceName: workspaceRow.name,
    inviterEmail,
    inviteeEmail,
    roleToAssign,
    message,
    invitationToken,
    expiresAt: expiresAt.toISOString(),
  });

  logger.debug(`📧 Workspace invitation sent: ${inviteeEmail} → ${workspaceRow.name} (${roleToAssign})`);

  return {
    id: invitationRow.id,
    workspaceName: workspaceRow.name,
    inviteeEmail,
    roleToAssign,
    expiresAt,
    status: "pending",
  };
}

export default inviteUser; 
