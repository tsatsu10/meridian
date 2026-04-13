import { and, eq, sql, count } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import {
  projectTable,
  taskTable,
  workspaceUserTable,
  userTable,
  timeEntryTable,
} from "../../database/schema";

interface AnalyticsOptions {
  workspaceId: string;
  timeRange?: "7d" | "30d" | "90d" | "1y" | "all";
  projectIds?: string[];
}

async function getAnalyticsSimple({ workspaceId, timeRange = "30d" }: AnalyticsOptions) {
  // Initialize database connection
  const db = getDatabase();
  
  // Calculate date range filter
  const now = new Date();
  let dateFilter: Date;
  
  switch (timeRange) {
    case "7d":
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      dateFilter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "1y":
      dateFilter = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      dateFilter = new Date(0); // All time
  }

  // Get project metrics
  const projects = await db
    .select({
      id: projectTable.id,
      name: projectTable.name,
      slug: projectTable.slug,
    })
    .from(projectTable)
    .where(eq(projectTable.workspaceId, workspaceId));

  // Get task metrics - use separate queries to avoid Drizzle ORM join issues
  const projectIds = projects.map(p => p.id);

  const tasks = projectIds.length > 0
    ? await db
        .select()
        .from(taskTable)
        .where(sql`${taskTable.projectId} = ANY(ARRAY[${sql.join(projectIds.map(id => sql`${id}`), sql`, `)}])`)
    : [];

  // Get team members - use separate queries to avoid Drizzle ORM join issues
  const workspaceUsers = await db
    .select()
    .from(workspaceUserTable)
    .where(eq(workspaceUserTable.workspaceId, workspaceId));

  // Fetch all users and create a lookup map
  const allUsers = await db
    .select()
    .from(userTable);

  const userMap = new Map(allUsers.map(u => [u.email, u]));

  // Match workspace users with their details
  const teamMembers = workspaceUsers
    .map(wu => {
      const user = userMap.get(wu.userEmail);
      return user ? {
        userEmail: user.email,
        name: user.name,
      } : null;
    })
    .filter(Boolean);

  // Get time entries - filter by task IDs in memory
  const taskIds = tasks.map(t => t.id);

  const timeEntries = taskIds.length > 0
    ? await db
        .select()
        .from(timeEntryTable)
        .where(sql`${timeEntryTable.taskId} = ANY(ARRAY[${sql.join(taskIds.map(id => sql`${id}`), sql`, `)}])`)
    : [];

  // Calculate metrics
  const totalProjects = projects.length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
  const overdueTasks = tasks.filter(t => 
    t.dueDate && 
    new Date(t.dueDate) < now && 
    t.status !== 'done'
  ).length;

  // Time metrics
  const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 3600; // Convert seconds to hours
  const avgTimePerTask = totalTasks > 0 ? totalHours / totalTasks : 0;

  // Project health analysis
  const projectHealth = projects.map(project => {
    const projectTasks = tasks.filter(t => t.projectId === project.id);
    const completedProjectTasks = projectTasks.filter(t => t.status === 'done').length;
    const completion = projectTasks.length > 0 ? (completedProjectTasks / projectTasks.length) * 100 : 0;
    const overdueProjectTasks = projectTasks.filter(t => 
      t.dueDate && 
      new Date(t.dueDate) < now && 
      t.status !== 'done'
    ).length;
    
    let health: "good" | "warning" | "critical" = "good";
    if (completion < 30 || overdueProjectTasks > projectTasks.length * 0.3) {
      health = "critical";
    } else if (completion < 70 || overdueProjectTasks > projectTasks.length * 0.1) {
      health = "warning";
    }

    return {
      id: project.id,
      name: project.name,
      slug: project.slug,
      completion: Math.round(completion),
      health,
      tasksCompleted: completedProjectTasks,
      totalTasks: projectTasks.length,
      teamSize: new Set(projectTasks.map(t => t.userEmail).filter(Boolean)).size,
      overdueTasks: overdueProjectTasks,
    };
  });

  // Resource utilization
  const resourceUtilization = teamMembers.map(member => {
    const memberTasks = tasks.filter(t => t.userEmail === member.userEmail);
    const completedMemberTasks = memberTasks.filter(t => t.status === 'done').length;
    const memberTimeEntries = timeEntries.filter(te => 
      memberTasks.some(mt => mt.id === te.taskId)
    );
    const memberHours = memberTimeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 3600;
    
    return {
      userEmail: member.userEmail,
      userName: member.name,
      taskCount: memberTasks.length,
      completedTasks: completedMemberTasks,
      totalHours: Math.round(memberHours),
      productivity: memberHours > 0 ? Math.round((completedMemberTasks / memberHours) * 100) / 100 : 0,
    };
  });

  // Performance benchmarks
  const avgProjectCompletion = projectHealth.length > 0 
    ? Math.round(projectHealth.reduce((sum, p) => sum + p.completion, 0) / projectHealth.length)
    : 0;

  const productivity = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const goodProjects = projectHealth.filter(p => p.health === 'good').length;
  const overallHealth = projectHealth.length > 0 ? Math.round((goodProjects / projectHealth.length) * 100) : 100;

  return {
    projectMetrics: {
      totalProjects,
      activeProjects: totalProjects, // Assume all are active for now
      completedProjects: projectHealth.filter(p => p.completion === 100).length,
      projectsAtRisk: projectHealth.filter(p => p.health === 'critical').length,
    },
    taskMetrics: {
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
    },
    teamMetrics: {
      totalMembers: teamMembers.length,
      activeMembers: teamMembers.length, // Assume all are active for now
      avgProductivity: productivity,
      teamEfficiency: productivity, // Use same as productivity for now
    },
    timeMetrics: {
      totalHours: Math.round(totalHours),
      billableHours: Math.round(totalHours), // Assume all hours are billable for now
      avgTimePerTask: Math.round(avgTimePerTask * 10) / 10,
      timeUtilization: teamMembers.length > 0 ? Math.round((totalHours / (teamMembers.length * 40 * 4)) * 100) : 0, // 40 hours/week, 4 weeks
    },
    projectHealth,
    resourceUtilization,
    performanceBenchmarks: {
      avgProjectCompletion,
      avgTaskCycleTime: 0, // Would need more complex calculation
      teamVelocity: 0, // Would need more complex calculation
      qualityScore: productivity,
      onTimeDelivery: 100, // Would need more complex calculation
    },
    summary: {
      timeRange,
      generatedAt: new Date().toISOString(),
      totalProjects,
      totalTasks,
      totalMembers: teamMembers.length,
      overallHealth,
    },
  };
}

export default getAnalyticsSimple; 
