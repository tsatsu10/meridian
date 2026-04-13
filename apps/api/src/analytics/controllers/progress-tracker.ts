import { getDatabase } from '../../database/connection';
import { tasks, projects, milestone } from '../../database/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../../utils/logger';

interface ProgressData {
  overall: number;
  projects: Array<{
    projectId: string;
    projectName: string;
    progress: number;
    tasksCompleted: number;
    tasksTotal: number;
  }>;
  milestones: Array<{
    milestoneId: string;
    milestoneName: string;
    progress: number;
    isCompleted: boolean;
    dueDate?: Date;
  }>;
}

/**
 * Get workspace progress with project and milestone breakdowns
 */
export async function getWorkspaceProgress(workspaceId: string): Promise<ProgressData> {
  const db = getDatabase();
  
  try {
    // Get all projects in workspace
    const workspaceProjects = await db
      .select({
        id: projects.id,
        name: projects.name,
      })
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId));
    
    // Calculate progress for each project
    const projectProgress = [];
    let totalTasks = 0;
    let totalCompleted = 0;
    
    for (const project of workspaceProjects) {
      const projectTasks = await db
        .select({
          id: tasks.id,
          status: tasks.status,
        })
        .from(tasks)
        .where(eq(tasks.projectId, project.id));
      
      const completed = projectTasks.filter(t => t.status === 'done').length;
      const total = projectTasks.length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      projectProgress.push({
        projectId: project.id,
        projectName: project.name,
        progress,
        tasksCompleted: completed,
        tasksTotal: total,
      });
      
      totalTasks += total;
      totalCompleted += completed;
    }
    
    // Get milestones
    const workspaceMilestones = await db
      .select({
        id: milestone.id,
        name: milestone.title,
        dueDate: milestone.dueDate,
        status: milestone.status,
      })
      .from(milestone)
      .innerJoin(projects, eq(milestone.projectId, projects.id))
      .where(eq(projects.workspaceId, workspaceId));
    
    const milestoneProgress = workspaceMilestones.map(ms => {
      const isCompleted = ms.status === 'completed';
      return {
        milestoneId: ms.id,
        milestoneName: ms.name,
        progress: isCompleted ? 100 : 0,
        isCompleted,
        dueDate: ms.dueDate,
      };
    });
    
    const overall = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;
    
    return {
      overall,
      projects: projectProgress,
      milestones: milestoneProgress,
    };
  } catch (error) {
    logger.error('Failed to get workspace progress:', error);
    throw new Error('Failed to get workspace progress');
  }
}


