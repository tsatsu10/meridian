import { and, eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { workspaceTable, workspaceMembers, userTable, roleHistoryTable } from "../../database/schema";
import emailService from "../../services/email-service";
import { ForbiddenError, ValidationError, AlreadyExistsError } from "../../utils/errors";
import { auditLogger } from "../../utils/audit-logger";
import { logger } from "../../utils/logger";
import { createId } from "@paralleldrive/cuid2";
type WorkspaceRole = keyof typeof ROLE_HIERARCHY;


// @epic-1.1-rbac: Role hierarchy for permission validation
const ROLE_HIERARCHY = {
  'workspace-manager': 100,
  'department-head': 80,
  'admin': 70,
  'project-manager': 50,
  'team-lead': 40,
  'member': 20,
  'project-viewer': 10,
  'guest': 5,
};

// Roles that can invite others
const CAN_INVITE_ROLES = ['workspace-manager', 'admin', 'department-head'];

async function inviteWorkspaceUser(
  workspaceId: string, 
  userEmail: string, 
  inviterEmail: string,
  assignedRole: string = 'member'
) {
  const db = getDatabase();
  
  // Validate role
  if (!Object.keys(ROLE_HIERARCHY).includes(assignedRole)) {
    throw new ValidationError('Invalid role specified', {
      role: assignedRole,
      validRoles: Object.keys(ROLE_HIERARCHY),
    });
  }
  
  // 🔒 RBAC Check: Verify inviter has permission to invite
  const [inviterMembership] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userEmail, inviterEmail)
      )
    );

  if (!inviterMembership) {
    throw new ForbiddenError('You are not a member of this workspace', {
      workspaceId,
      inviterEmail,
    });
  }

  // Check if inviter has permission to invite
  const inviterRole = inviterMembership.role ?? "";
  if (!CAN_INVITE_ROLES.includes(inviterRole)) {
    throw new ForbiddenError('You do not have permission to invite members', {
      requiredRoles: CAN_INVITE_ROLES,
      currentRole: inviterRole,
    });
  }

  // 🔒 RBAC Check: Inviter cannot assign role higher than their own
  const inviterRoleLevel = ROLE_HIERARCHY[inviterMembership.role as keyof typeof ROLE_HIERARCHY] || 0;
  const assignedRoleLevel = ROLE_HIERARCHY[assignedRole as keyof typeof ROLE_HIERARCHY] || 0;

  if (assignedRoleLevel > inviterRoleLevel) {
    throw new ForbiddenError('Cannot assign a role higher than your own', {
      yourRole: inviterMembership.role,
      attemptedRole: assignedRole,
    });
  }

  const [workspace] = await db
    .select()
    .from(workspaceTable)
    .where(eq(workspaceTable.id, workspaceId));

  if (!workspace) {
    throw new ValidationError('Workspace not found', {
      workspaceId,
    });
  }

  const [existingMember] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userEmail, userEmail),
      ),
    );

  if (existingMember) {
    throw new AlreadyExistsError('User is already a member of this workspace', {
      userEmail,
      workspaceId,
      currentRole: existingMember.role,
    });
  }

  // Get inviter details
  const [inviter] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, inviterEmail));

  const inviterName = inviter?.name ?? inviterEmail.split('@')[0] ?? 'Workspace member';
  const inviterId = inviter?.id;

  // Create workspace member with assigned role
  const [invitedMember] = await db
    .insert(workspaceMembers)
    .values({
      userId: createId(), // Always create new ID for invited users
      userEmail,
      workspaceId,
      role: assignedRole as WorkspaceRole,
      invitedBy: inviterId ?? null,
      status: 'pending', // Pending until user accepts
    })
    .returning();
  if (!invitedMember) {
    throw new Error("Failed to create workspace invitation member");
  }

  // 📊 AUDIT: Log role assignment
  if (inviterId) {
    try {
      await db.insert(roleHistoryTable).values({
        userId: invitedMember.userId || 'pending',
        role: assignedRole,
        workspaceId,
        action: 'assigned',
        performedBy: inviterId,
        reason: 'Workspace invitation',
        notes: `Invited by ${inviterName} with role ${assignedRole}`,
        metadata: {
          invitedEmail: userEmail,
          invitedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.warn('Failed to create role history entry', { error });
    }
  }

  // 📊 AUDIT: Log invitation
  await auditLogger.logEvent({
    eventType: 'workspace_operation',
    action: 'member_invited',
    userId: inviterId,
    userEmail: inviterEmail,
    workspaceId,
    outcome: 'success',
    severity: 'medium',
    details: {
      invitedEmail: userEmail,
      assignedRole,
      workspaceName: workspace.name,
      inviterRole: inviterMembership.role,
    },
    metadata: {
      timestamp: new Date(),
    },
  });

  // Send invitation email
  try {
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const inviteUrl = `${appUrl}/auth/sign-up?email=${encodeURIComponent(userEmail)}&workspace=${encodeURIComponent(workspaceId)}`;

    await emailService.sendInvitationEmail({
      inviteeEmail: userEmail,
      inviterName,
      workspaceName: workspace.name ?? 'Untitled Workspace',
      inviteUrl,
    });

    logger.info('Invitation email sent', {
      invitedEmail: userEmail,
      workspaceId,
      assignedRole,
    });
  } catch (error) {
    logger.error('Failed to send invitation email', {
      invitedEmail: userEmail,
      error: error instanceof Error ? error.message : String(error),
    });
    
    // Don't fail the invitation if email fails
    // User can still be invited manually
  }

  return {
    ...invitedMember,
    roleName: AVAILABLE_ROLES.find(r => r.value === assignedRole)?.label || assignedRole,
  };
}

// Export role hierarchy for use in other modules
export { ROLE_HIERARCHY, CAN_INVITE_ROLES };

const AVAILABLE_ROLES = [
  { value: 'guest', label: 'Guest' },
  { value: 'project-viewer', label: 'Project Viewer' },
  { value: 'member', label: 'Member' },
  { value: 'team-lead', label: 'Team Lead' },
  { value: 'project-manager', label: 'Project Manager' },
  { value: 'admin', label: 'Admin' },
  { value: 'department-head', label: 'Department Head' },
  { value: 'workspace-manager', label: 'Workspace Manager' },
];

export default inviteWorkspaceUser;
