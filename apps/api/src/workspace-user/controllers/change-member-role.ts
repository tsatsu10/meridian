/**
 * 🔄 Change Workspace Member Role Controller
 * 
 * @epic-3.4-teams - Team member role management
 * @persona-sarah - PM needs to assign appropriate roles
 * @persona-david - Team lead needs to promote team members
 */

import { Context } from 'hono';
import { createId } from "@paralleldrive/cuid2";
import { getDatabase } from '../../database/connection';
import { workspaceUserTable, roleHistoryTable, userTable } from '../../database/schema';
import { eq, and } from 'drizzle-orm';
import logger from '../../utils/logger';

// Valid workspace roles based on RBAC system
const VALID_ROLES = [
  'guest',
  'member',
  'team-lead',
  'project-viewer', 
  'project-manager',
  'department-head',
  'workspace-manager',
  'admin'
] as const;

type ValidRole = typeof VALID_ROLES[number];

// Role hierarchy for permission validation
const ROLE_HIERARCHY: Record<ValidRole, number> = {
  'guest': 1,
  'member': 2,
  'project-viewer': 3,
  'team-lead': 4,
  'project-manager': 5,
  'department-head': 6,
  'admin': 7,
  'workspace-manager': 8,
};

export async function changeMemberRole(c: Context) {
  const db = getDatabase();
  const workspaceId = c.req.param('workspaceId');
  const memberId = c.req.param('memberId');
  const { role } = await c.req.json();
  const currentUserEmail = c.get('userEmail');
  if (!workspaceId || !memberId || !currentUserEmail) {
    return c.json({ error: 'workspaceId, memberId, and authenticated user are required' }, 400);
  }
  
  logger.debug(`🔄 Role change request: workspace=${workspaceId}, member=${memberId}, newRole=${role}, by=${currentUserEmail}`);
  
  // Validate role
  if (!VALID_ROLES.includes(role)) {
    logger.debug(`❌ Invalid role: ${role}`);
    return c.json({ 
      error: 'Invalid role', 
      validRoles: VALID_ROLES 
    }, 400);
  }
  
  try {
    // Get current user's info and role
    const [currentUser] = await db
      .select({
        id: userTable.id,
        email: userTable.email,
        name: userTable.name,
        role: workspaceUserTable.role,
      })
      .from(workspaceUserTable)
      .leftJoin(userTable, eq(workspaceUserTable.userEmail, userTable.email))
      .where(
        and(
          eq(workspaceUserTable.workspaceId, workspaceId),
          eq(workspaceUserTable.userEmail, currentUserEmail)
        )
      )
      .limit(1);
    
    if (!currentUser) {
      logger.debug(`❌ Current user not found in workspace`);
      return c.json({ error: 'Unauthorized' }, 403);
    }
    
    // Get target member info
    const [targetMember] = await db
      .select({
        id: workspaceUserTable.id,
        userId: userTable.id,
        userEmail: workspaceUserTable.userEmail,
        userName: userTable.name,
        currentRole: workspaceUserTable.role,
        status: workspaceUserTable.status,
      })
      .from(workspaceUserTable)
      .leftJoin(userTable, eq(workspaceUserTable.userEmail, userTable.email))
      .where(
        and(
          eq(workspaceUserTable.workspaceId, workspaceId),
          eq(workspaceUserTable.id, memberId)
        )
      )
      .limit(1);
    
    if (!targetMember) {
      logger.debug(`❌ Target member not found: ${memberId}`);
      return c.json({ error: 'Member not found' }, 404);
    }
    
    // Check if already has this role
    if (targetMember.currentRole === role) {
      logger.debug(`⚠️ Member already has role: ${role}`);
      return c.json({ 
        success: true,
        message: 'Member already has this role',
        member: {
          id: memberId,
          role,
          unchanged: true
        }
      });
    }
    
    // Permission validation: Can only assign roles lower than own role
    const currentUserHierarchy = ROLE_HIERARCHY[currentUser.role as ValidRole] || 0;
    const newRoleHierarchy = ROLE_HIERARCHY[role as ValidRole];
    const targetCurrentHierarchy = ROLE_HIERARCHY[targetMember.currentRole as ValidRole] || 0;
    
    // Must have higher role than the role being assigned
    if (currentUserHierarchy <= newRoleHierarchy) {
      logger.debug(`❌ Insufficient permissions: currentUser=${currentUserHierarchy}, newRole=${newRoleHierarchy}`);
      return c.json({ 
        error: 'Cannot assign a role equal to or higher than your own',
        yourRole: currentUser.role,
        requiredRole: 'Higher than ' + role
      }, 403);
    }
    
    // Must have higher role than the target member's current role
    if (currentUserHierarchy <= targetCurrentHierarchy) {
      logger.debug(`❌ Insufficient permissions: cannot modify member with equal or higher role`);
      return c.json({ 
        error: 'Cannot modify members with equal or higher role than yours'
      }, 403);
    }
    
    const oldRole = targetMember.currentRole;
    if (!targetMember.userId || !currentUser.id) {
      return c.json({ error: 'Member linkage is invalid for role updates' }, 400);
    }
    
    // Update role in database
    await db
      .update(workspaceUserTable)
      .set({ 
        role,
        // updatedAt: new Date() // Uncomment if you have updatedAt field
      })
      .where(eq(workspaceUserTable.id, memberId));
    
    logger.debug(`✅ Role updated: ${oldRole} → ${role}`);
    
    // Log role change to history
    try {
      await db.insert(roleHistoryTable).values({
        id: createId(),
        userId: targetMember.userId,
        role,
        workspaceId,
        action: 'modified',
        performedBy: currentUser.id,
        reason: 'Manual role change via team management interface',
        metadata: {
          oldRole,
          newRole: role,
          performedByEmail: currentUserEmail
        }
      });
      logger.debug(`📝 Role change logged to history`);
    } catch (historyError) {
      // Don't fail the request if history logging fails
      logger.error('⚠️ Failed to log role history:', historyError);
    }
    
    // TODO: Broadcast via WebSocket for real-time updates
    // const io = c.get('io');
    // io.to(`workspace:${workspaceId}`).emit('team:role-changed', {
    //   memberId,
    //   memberName: targetMember.userName,
    //   memberEmail: targetMember.userEmail,
    //   oldRole,
    //   newRole: role,
    //   changedBy: currentUser.name,
    //   timestamp: new Date().toISOString()
    // });
    
    return c.json({
      success: true,
      message: `Role changed from ${oldRole} to ${role}`,
      member: {
        id: memberId,
        userId: targetMember.userId,
        email: targetMember.userEmail,
        name: targetMember.userName,
        role,
        oldRole,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    logger.error('❌ Error changing member role:', error);
    return c.json({ 
      error: 'Failed to change role',
      details: error.message 
    }, 500);
  }
}


