/**
 * 🗑️ Remove Workspace Member Controller
 * 
 * @epic-3.4-teams - Team member removal with proper cleanup
 * @persona-sarah - PM needs to remove inactive members
 * @persona-david - Team lead needs to manage team composition
 */

import { Context } from 'hono';
import { createId } from "@paralleldrive/cuid2";
import { getDatabase } from '../../database/connection';
import { 
  workspaceUserTable, 
  userTable,
  taskTable,
  activityTable,
  projectTable
} from '../../database/schema';
import { eq, and } from 'drizzle-orm';
import logger from '../../utils/logger';

// Role hierarchy for permission validation
const ROLE_HIERARCHY: Record<string, number> = {
  'guest': 1,
  'member': 2,
  'project-viewer': 3,
  'team-lead': 4,
  'project-manager': 5,
  'department-head': 6,
  'admin': 7,
  'workspace-manager': 8,
};

export async function removeMember(c: Context) {
  const db = getDatabase();
  const workspaceId = c.req.param('workspaceId');
  const memberId = c.req.param('memberId');
  const currentUserEmail = c.get('userEmail');
  if (!workspaceId || !memberId || !currentUserEmail) {
    return c.json({ error: 'workspaceId, memberId, and authenticated user are required' }, 400);
  }
  
  logger.debug(`🗑️ Remove member request: workspace=${workspaceId}, member=${memberId}, by=${currentUserEmail}`);
  
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
        role: workspaceUserTable.role,
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
    
    // Cannot remove yourself
    if (targetMember.userEmail === currentUserEmail) {
      logger.debug(`❌ Cannot remove yourself`);
      return c.json({ 
        error: 'Cannot remove yourself from the workspace',
        hint: 'Ask another admin to remove you or leave the workspace instead'
      }, 400);
    }
    
    // Permission validation: Must have higher role than target member
    const currentUserHierarchy = ROLE_HIERARCHY[currentUser.role as string] || 0;
    const targetMemberHierarchy = ROLE_HIERARCHY[targetMember.role as string] || 0;
    
    if (currentUserHierarchy <= targetMemberHierarchy) {
      logger.debug(`❌ Insufficient permissions: currentUser=${currentUserHierarchy}, targetMember=${targetMemberHierarchy}`);
      return c.json({ 
        error: 'Cannot remove members with equal or higher role than yours',
        yourRole: currentUser.role,
        targetRole: targetMember.role
      }, 403);
    }
    if (!currentUser.id) {
      return c.json({ error: 'Current user linkage is invalid for member removal' }, 400);
    }
    
    // Get all projects in workspace to check for ownership
    const workspaceProjects = await db
      .select({ 
        id: projectTable.id, 
        name: projectTable.name,
        ownerId: projectTable.ownerId
      })
      .from(projectTable)
      .where(eq(projectTable.workspaceId, workspaceId));
    
    // Check if member owns any projects
    const ownedProjects = workspaceProjects.filter(p => p.ownerId === targetMember.userId);
    
    if (ownedProjects.length > 0) {
      logger.debug(`⚠️ Member owns ${ownedProjects.length} projects`);
      return c.json({ 
        error: 'Cannot remove member who owns projects',
        ownedProjects: ownedProjects.map(p => ({ id: p.id, name: p.name })),
        hint: 'Reassign project ownership first, then try removing the member'
      }, 400);
    }
    
    // Get count of assigned tasks
    const assignedTasks = await db
      .select({ count: taskTable.id })
      .from(taskTable)
      .where(eq(taskTable.userEmail, targetMember.userEmail));
    
    const taskCount = assignedTasks.length;
    logger.debug(`📋 Member has ${taskCount} assigned tasks`);
    
    // Unassign all tasks
    if (taskCount > 0) {
      await db
        .update(taskTable)
        .set({ 
          userEmail: null,
          assigneeId: null,
          // updatedAt: new Date() // Uncomment if you have updatedAt field
        })
        .where(eq(taskTable.userEmail, targetMember.userEmail));
      
      logger.debug(`✅ Unassigned ${taskCount} tasks`);
    }
    
    // Log removal activity
    try {
      await db.insert(activityTable).values({
        id: createId(),
        taskId: null, // Workspace-level activity
        userId: currentUser.id,
        type: 'member_removed',
        content: {
          action: 'removed',
          details: `Removed ${targetMember.userName} (${targetMember.userEmail}) from workspace. ${taskCount} tasks were unassigned.`,
        },
        metadata: {
          removedMemberId: targetMember.id,
          removedMemberEmail: targetMember.userEmail,
          removedMemberName: targetMember.userName,
          removedMemberRole: targetMember.role,
          unassignedTasks: taskCount,
          removedBy: currentUserEmail,
          removedByName: currentUser.name
        }
      });
      logger.debug(`📝 Removal logged to activity`);
    } catch (activityError) {
      // Don't fail the request if activity logging fails
      logger.error('⚠️ Failed to log activity:', activityError);
    }
    
    // Remove member from workspace
    await db
      .delete(workspaceUserTable)
      .where(eq(workspaceUserTable.id, memberId));
    
    logger.debug(`✅ Member removed successfully`);
    
    // TODO: Broadcast via WebSocket for real-time updates
    // const io = c.get('io');
    // io.to(`workspace:${workspaceId}`).emit('team:member-removed', {
    //   memberId,
    //   memberName: targetMember.userName,
    //   memberEmail: targetMember.userEmail,
    //   removedBy: currentUser.name,
    //   unassignedTasks: taskCount,
    //   timestamp: new Date().toISOString()
    // });
    
    return c.json({
      success: true,
      message: `Successfully removed ${targetMember.userName} from workspace`,
      member: {
        id: memberId,
        userId: targetMember.userId,
        email: targetMember.userEmail,
        name: targetMember.userName,
        role: targetMember.role
      },
      impact: {
        unassignedTasks: taskCount,
        projectsAffected: 0 // No projects owned
      },
      removedAt: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('❌ Error removing member:', error);
    return c.json({ 
      error: 'Failed to remove member',
      details: error.message 
    }, 500);
  }
}


