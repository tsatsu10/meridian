import { HTTPException } from "hono/http-exception";
import { createId } from "@paralleldrive/cuid2";
import { eq, and } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { workspaceTable, userTable, workspaceInvites, roleAssignmentTable, roleHistoryTable } from "../../database/schema";
import { publishEvent } from "../../events";
import logger from '../../utils/logger';

/**
 * ✅ ACCEPT INVITATION: User accepts workspace invitation
 * Validates token and creates role assignment
 */
async function acceptInvitation(userEmail: string, invitationToken: string) {
  const db = getDatabase();
  
  // Get user ID
  const user = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, userEmail))
    .limit(1);

  if (!user.length || !user[0]) {
    throw new HTTPException(401, {
      message: "User not found",
    });
  }

  const userId = user[0].id;

  // 🔐 SECURITY: Validate invitation token and status
  const invitation = await db
    .select({
      invitationRow: workspaceInvites,
      workspaceRow: workspaceTable,
    })
    .from(workspaceInvites)
    .innerJoin(workspaceTable, eq(workspaceTable.id, workspaceInvites.workspaceId))
    .where(
      and(
        eq(workspaceInvites.token, invitationToken),
        eq(workspaceInvites.inviteeEmail, userEmail),
        eq(workspaceInvites.status, "pending")
      )
    )
    .limit(1);

  const joined = invitation[0];
  if (!joined) {
    throw new HTTPException(404, {
      message: "Invalid or expired invitation",
    });
  }

  const invitationData = joined.invitationRow;
  const workspaceData = joined.workspaceRow;

  // Check if invitation has expired
  if (new Date() > invitationData.expiresAt) {
    // Mark invitation as expired
    await db
      .update(workspaceInvites)
      .set({
        status: "expired",
      })
      .where(eq(workspaceInvites.id, invitationData.id));

    throw new HTTPException(410, {
      message: "Invitation has expired",
    });
  }

  // Check if user is already a workspace member
  const existingAssignment = await db
    .select()
    .from(roleAssignmentTable)
    .where(
      and(
        eq(roleAssignmentTable.userId, userId),
        eq(roleAssignmentTable.workspaceId, invitationData.workspaceId),
        eq(roleAssignmentTable.isActive, true)
      )
    )
    .limit(1);

  if (existingAssignment.length && existingAssignment[0]) {
    // Mark invitation as accepted but user was already a member
    await db
      .update(workspaceInvites)
      .set({
        status: "accepted",
        acceptedAt: new Date(),
      })
      .where(eq(workspaceInvites.id, invitationData.id));

    return {
      workspaceName: workspaceData.name,
      workspaceId: invitationData.workspaceId,
      message: "You are already a member of this workspace",
      role: existingAssignment[0].role,
    };
  }

  // 🏆 Create role assignment for the invited user
  try {
    const assignmentId = createId();
    await db.insert(roleAssignmentTable).values({
      id: assignmentId,
      userId: userId,
      role: invitationData.roleToAssign,
      workspaceId: invitationData.workspaceId,
      assignedAt: new Date(),
      isActive: true,
    });

    // Record in role history
    await db.insert(roleHistoryTable).values({
      id: createId(),
      userId: userId,
      role: invitationData.roleToAssign,
      action: "assigned",
      performedBy: invitationData.inviterUserId,
      reason: "Workspace invitation accepted",
      workspaceId: invitationData.workspaceId,
    });

    // Mark invitation as accepted
    await db
      .update(workspaceInvites)
      .set({
        status: "accepted",
        acceptedAt: new Date(),
      })
      .where(eq(workspaceInvites.id, invitationData.id));

    // 📧 Publish acceptance event
    publishEvent("workspace.invitation.accepted", {
      invitationId: invitationData.id,
      workspaceId: invitationData.workspaceId,
      workspaceName: workspaceData.name,
      userEmail,
      role: invitationData.roleToAssign,
      inviterUserId: invitationData.inviterUserId,
    });

    logger.debug(`✅ Invitation accepted: ${userEmail} joined ${workspaceData.name} as ${invitationData.roleToAssign}`);

    return {
      workspaceName: workspaceData.name,
      workspaceId: invitationData.workspaceId,
      role: invitationData.roleToAssign,
      message: `Welcome to ${workspaceData.name}!`,
    };
  } catch (error) {
    logger.error("Failed to create role assignment:", error);
    throw new HTTPException(500, {
      message: "Failed to accept invitation",
    });
  }
}

export default acceptInvitation; 
