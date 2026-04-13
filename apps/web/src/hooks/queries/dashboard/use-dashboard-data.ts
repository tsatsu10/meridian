import { useQuery } from "@tanstack/react-query";
import { logger } from "@/lib/logger";
import useWorkspaceStore from "@/store/workspace";
import getProjects from "@/fetchers/project/get-projects";
import getWorkspaceUsers from "@/fetchers/workspace-user/get-workspace-users";
import { getActivities } from "@/fetchers/activity/get-activities";
import { DashboardFilters } from "@/types/filters";
import {
  flattenTasksForProject,
  flattenTasksFromProjects,
} from "@/lib/dashboard/flatten-project-tasks";

export interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  dueTodayTasks?: number;
  activeProjects: number;
  teamMembers: number;
  productivity: number;
}

interface RecentActivity {
  id: string;
  type: "task_completed" | "task_created" | "project_created" | "team_joined";
  user: string;
  description: string;
  /** ISO 8601 — used for ordering and relative time in the UI */
  occurredAt: string;
  project?: string;
  projectId?: string;
}

interface UpcomingDeadline {
  id: string;
  title: string;
  project: string;
  dueDate: string;
  priority: "low" | "medium" | "high" | "urgent";
  assignee: string;
}

/** Shape of task objects returned on projects from the API (partial). */
interface ApiTask {
  id?: string;
  status?: string;
  dueDate?: string;
  title?: string;
  priority?: string;
}

interface ApiProject {
  id: string;
  name?: string;
  status?: string;
  priority?: string;
  createdAt?: string;
  updatedAt?: string;
  tasks?: ApiTask[];
  columns?: Array<{ tasks?: ApiTask[] }>;
  members?: unknown[];
  icon?: string;
  color?: string;
}

interface RecentProject {
  id: string;
  name: string;
  progress: number;
  lastActivity: string;
  teamSize: number;
  color?: string;
  status?: string;
  priority?: string;
  createdAt?: string;
  tasks?: ApiTask[];
  columns?: Array<{ tasks?: ApiTask[] }>;
}

interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  role?: string;
  status: "online" | "offline" | "away";
  activeTasks: number;
}

interface DashboardData {
  stats: DashboardStats;
  activities: RecentActivity[];
  deadlines: UpcomingDeadline[];
  projects: RecentProject[];
  teamMembers: TeamMember[];
}

interface DashboardContextOptions {
  dashboardId?: string | null;
  dashboardName?: string | null;
}

export function useDashboardData(filters?: DashboardFilters, context: DashboardContextOptions = {}) {
  const { workspace } = useWorkspaceStore();

  return useQuery({
    queryKey: ["dashboard", workspace?.id, context?.dashboardId ?? "default", filters],
    queryFn: async (): Promise<DashboardData> => {
      logger.debug("[Dashboard] query start", {
        workspaceId: workspace?.id,
        filters,
        dashboardId: context?.dashboardId,
        dashboardName: context?.dashboardName,
      });

      if (!workspace?.id) {
        logger.debug("[Dashboard] no workspace id, returning empty data");
        return {
          stats: {
            totalTasks: 0,
            completedTasks: 0,
            overdueTasks: 0,
            dueTodayTasks: 0,
            activeProjects: 0,
            teamMembers: 0,
            productivity: 0,
          },
          activities: [],
          deadlines: [],
          projects: [],
          teamMembers: [],
        };
      }

      const [projects, workspaceUsers] = await Promise.all([
        getProjects({ workspaceId: workspace.id }),
        getWorkspaceUsers({ param: { workspaceId: workspace.id } }),
      ]);
      logger.debug("[Dashboard] projects fetched", {
        count: Array.isArray(projects) ? projects.length : (projects?.projects?.length || 0),
      });

      const teamMembersData = workspaceUsers?.users || [];

      let filteredProjects: ApiProject[] = Array.isArray(projects)
        ? projects
        : (projects?.projects || []);

      if (filters) {
        filteredProjects = filteredProjects.filter((project: ApiProject) => {
          // Status filter
          if (filters.status && filters.status.length > 0) {
            if (!filters.status.includes(project.status)) return false;
          }
          
          // Priority filter
          if (filters.priority && filters.priority.length > 0) {
            if (!filters.priority.includes(project.priority || "medium")) return false;
          }
          
          // Project filter
          if (filters.projectIds && filters.projectIds.length > 0) {
            if (!filters.projectIds.includes(project.id)) return false;
          }
          
          // Time range filter
          if (filters.timeRange && filters.timeRange !== "all") {
            const createdAt = new Date(project.createdAt);
            const now = new Date();
            let startDate: Date;
            
            switch (filters.timeRange) {
              case "today":
                startDate = new Date(now.setHours(0, 0, 0, 0));
                break;
              case "week":
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
              case "month":
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
              default:
                startDate = new Date(0);
            }
            
            if (createdAt < startDate) return false;
          }
          
          return true;
        });
      }
      
      const allWorkspaceTasks = flattenTasksFromProjects(filteredProjects);

      const isDone = (status?: string) =>
        status === "done" || status === "completed";

      const totalTasks = allWorkspaceTasks.length;

      const completedTasks = allWorkspaceTasks.filter((task) => isDone(task.status)).length;

      const now = new Date();
      const overdueTasks = allWorkspaceTasks.filter((task) => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate < now && !isDone(task.status);
      }).length;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const dueTodayTasks = allWorkspaceTasks.filter((task) => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        return (
          dueDate >= todayStart &&
          dueDate <= todayEnd &&
          !isDone(task.status)
        );
      }).length;

      const activeProjects = filteredProjects.filter(p => p.status !== 'completed' && p.status !== 'archived').length;

      const mappedProjects = filteredProjects.map((project: ApiProject) => {
        const projectTasks = flattenTasksForProject(project);
        const completed = projectTasks.filter(
          (t) => t.status === "done" || t.status === "completed"
        ).length;
        const progress = projectTasks.length > 0 ? Math.round((completed / projectTasks.length) * 100) : 0;

        return {
          id: project.id,
          name: project.name,
          icon: project.icon,
          progress,
          lastActivity: project.updatedAt || project.createdAt,
          teamSize: project.members?.length || 0,
          color: project.color,
          status: project.status,
          tasks: projectTasks,
          columns: project.columns || [],
        };
      });

      let realActivities: RecentActivity[] = [];
      
      try {
        const activitiesData = await getActivities({
          workspaceId: workspace.id,
          limit: 20,
        });
        
        realActivities = activitiesData.activities.map((activity) => {
          // Map API activity type to dashboard activity type
          const typeMap: Record<string, RecentActivity['type']> = {
            'created': 'task_created',
            'completed': 'task_completed',
            'updated': 'task_created', // Use task_created icon for updates
            'deleted': 'task_created', // Use task_created icon for deletes
          };
          const created = new Date(activity.createdAt);
          
          return {
            id: activity.id,
            type: typeMap[activity.action] || 'task_created',
            user: activity.user?.username || activity.user?.email || 'Team Member',
            description: activity.description || activity.entityTitle || `${activity.action} ${activity.entityType}`,
            occurredAt: Number.isNaN(created.getTime()) ? new Date().toISOString() : created.toISOString(),
            project: activity.metadata?.projectName,
            projectId: activity.projectId,
          };
        });
        
        logger.debug("[Dashboard] activities fetched", { count: realActivities.length });
      } catch (error) {
        logger.error(
          "[Dashboard] failed to fetch activities",
          error instanceof Error ? error : new Error(String(error))
        );
        // Don't fail - will use empty array as fallback
      }

      // Collect all tasks with their project context (for deadlines calculation)
      type TaskWithProject = ApiTask & { projectName?: string; projectId?: string };
      const allTasksWithContext: TaskWithProject[] = [];
      filteredProjects.forEach((project: ApiProject) => {
        flattenTasksForProject(project).forEach((task) => {
          allTasksWithContext.push({
            ...task,
            projectName: project.name,
            projectId: project.id,
          });
        });
      });

      // Generate upcoming deadlines from tasks
      const upcomingDeadlines: UpcomingDeadline[] = [];
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // Next 7 days

      allTasksWithContext
        .filter(task => {
          if (!task.dueDate || task.status === 'done' || task.status === 'completed') return false;
          const dueDate = new Date(task.dueDate);
          return dueDate > new Date() && dueDate <= futureDate;
        })
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 5)
        .forEach((task) => {
          if (!task.id || !task.dueDate || !task.title || !task.projectName) return;
          upcomingDeadlines.push({
            id: task.id,
            title: task.title,
            project: task.projectName,
            dueDate: new Date(task.dueDate).toLocaleDateString(),
            priority: (task.priority as UpcomingDeadline["priority"]) || "medium",
            assignee: "Team Member",
          });
        });

      const dashboardData: DashboardData = {
        stats: {
          totalTasks,
          completedTasks,
          overdueTasks,
          dueTodayTasks,
          activeProjects,
          teamMembers: teamMembersData.length, // ✅ Now using real workspace members count
          productivity: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        },
        activities: realActivities, // ✅ Now using real API activities
        deadlines: upcomingDeadlines,
        projects: mappedProjects,
        teamMembers: teamMembersData.map(
          (member: {
            id: string;
            name?: string;
            email?: string;
            avatar?: string;
            role?: string;
          }): TeamMember => ({
            id: member.id,
            name: member.name ?? "Team member",
            email: member.email,
            avatar: member.avatar,
            role: member.role,
            status: "online",
            activeTasks: 0,
          })
        ),
      };
      
      logger.debug("[Dashboard] aggregate complete", {
        projectsCount: dashboardData.projects.length,
        activitiesCount: dashboardData.activities.length,
      });

      return applyDashboardContext(dashboardData, context);
    },
    enabled: !!workspace?.id,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}

function applyDashboardContext(data: DashboardData, context: DashboardContextOptions): DashboardData {
  if (!context.dashboardId) return data;

  const layoutState = getDashboardLayout(context.dashboardId);
  const variant = determineDashboardVariant(context.dashboardName || layoutState?.variant);

  const derivedProjects = transformProjects(data.projects, variant, layoutState);
  const derivedActivities = transformActivities(data.activities, variant, layoutState);
  const derivedDeadlines = transformDeadlines(data.deadlines, variant, layoutState);
  const derivedTeamMembers = transformTeamMembers(data.teamMembers, variant, layoutState);
  const stats = transformStats(data.stats);

  return {
    stats,
    activities: derivedActivities,
    deadlines: derivedDeadlines,
    projects: derivedProjects,
    teamMembers: derivedTeamMembers,
  };
}

type DashboardVariant = "team" | "analytics" | "personal" | "custom";

interface DashboardLayoutState {
  variant: DashboardVariant;
  favouriteProjectIds?: string[];
  hiddenProjectIds?: string[];
  hiddenActivityTypes?: Array<RecentActivity["type"]>;
  hiddenDeadlineIds?: string[];
  favouriteMemberIds?: string[];
  lastComputed?: DashboardData;
}

function determineDashboardVariant(name?: string | null): DashboardVariant {
  const normalized = (name || "").toLowerCase();
  if (normalized.includes("team")) return "team";
  if (normalized.includes("personal") || normalized.includes("my")) return "personal";
  if (normalized.includes("executive") || normalized.includes("analytics")) return "analytics";
  if (normalized.includes("project-manager") || normalized.includes("project manager")) return "analytics";
  return "custom";
}

function getDashboardLayout(dashboardId: string): DashboardLayoutState | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(`meridian.dashboard.layout.${dashboardId}`);
    if (!raw) return undefined;

    const parsed = JSON.parse(raw);
    if (parsed?.lastComputed) {
      parsed.lastComputed.activities = parsed.lastComputed.activities || [];
      parsed.lastComputed.deadlines = parsed.lastComputed.deadlines || [];
      parsed.lastComputed.projects = parsed.lastComputed.projects || [];
      parsed.lastComputed.teamMembers = parsed.lastComputed.teamMembers || [];
    }
    return parsed;
  } catch (error) {
    logger.warn("Failed to read dashboard layout state", {
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}

function transformProjects(projects: RecentProject[], variant: DashboardVariant, layout?: DashboardLayoutState): RecentProject[] {
  if (!projects.length) return projects;

  const favourites = layout?.favouriteProjectIds || [];
  const hidden = new Set(layout?.hiddenProjectIds || []);
  const visibleProjects = projects.filter(project => !hidden.has(project.id));

  const favouriteProjects = visibleProjects.filter(project => favourites.includes(project.id));
  const otherProjects = visibleProjects.filter(project => !favourites.includes(project.id));

  let transformedProjects: RecentProject[] = [];

  switch (variant) {
    case "team": {
      const byTeamSize = [...otherProjects].sort((a, b) => (b.teamSize || 0) - (a.teamSize || 0));
      transformedProjects = [...favouriteProjects, ...byTeamSize].slice(0, Math.max(4, favouriteProjects.length));
      break;
    }
    case "personal": {
      transformedProjects = [...favouriteProjects, ...otherProjects].slice(0, 3);
      break;
    }
    case "analytics": {
      const byProgress = [...otherProjects].sort((a, b) => (b.progress || 0) - (a.progress || 0));
      transformedProjects = [...favouriteProjects, ...byProgress].slice(0, 5);
      break;
    }
    case "custom":
    default: {
      transformedProjects = [...favouriteProjects, ...otherProjects];
    }
  }

  if (!transformedProjects.length && projects.length) {
    transformedProjects = projects.slice(0, Math.min(3, projects.length));
  }

  return transformedProjects;
}

function transformActivities(
  activities: RecentActivity[],
  variant: DashboardVariant,
  layout?: DashboardLayoutState
): RecentActivity[] {
  if (!activities.length) return activities;

  const hiddenTypes = new Set(layout?.hiddenActivityTypes || []);
  const filtered = activities.filter(activity => !hiddenTypes.has(activity.type));

  if (!filtered.length) return activities;

  switch (variant) {
    case "team":
      return filtered.filter(activity => activity.type === "task_completed" || activity.type === "team_joined");
    case "personal":
      return filtered.slice(0, Math.min(5, filtered.length));
    case "analytics":
      return filtered.slice(0, Math.min(8, filtered.length));
    case "custom":
    default:
      return filtered;
  }
}

function transformDeadlines(
  deadlines: UpcomingDeadline[],
  variant: DashboardVariant,
  layout?: DashboardLayoutState
): UpcomingDeadline[] {
  if (!deadlines.length) return deadlines;

  const hidden = new Set(layout?.hiddenDeadlineIds || []);
  const filtered = deadlines.filter(deadline => !hidden.has(deadline.id));

  if (!filtered.length) return deadlines;

  switch (variant) {
    case "team":
      return filtered.slice(0, Math.min(6, filtered.length));
    case "analytics":
      return filtered.slice(0, Math.min(5, filtered.length));
    case "personal":
      return filtered.slice(0, Math.min(3, filtered.length));
    case "custom":
    default:
      return filtered;
  }
}

function transformTeamMembers(
  members: TeamMember[],
  variant: DashboardVariant,
  layout?: DashboardLayoutState
): TeamMember[] {
  if (!members.length) return members;

  const favourites = new Set(layout?.favouriteMemberIds || []);
  const favouriteMembers = members.filter(member => favourites.has(member.id));
  const otherMembers = members.filter(member => !favourites.has(member.id));

  switch (variant) {
    case "team":
      return [...favouriteMembers, ...otherMembers].slice(0, Math.max(8, favouriteMembers.length));
    case "personal":
      return [...favouriteMembers, ...otherMembers].slice(0, 3);
    case "analytics":
      return [...favouriteMembers, ...otherMembers].slice(0, 6);
    case "custom":
    default:
      return [...favouriteMembers, ...otherMembers];
  }
}

/** Exported for tests — must remain a pass-through of computed KPIs (no variant inflation). */
export function transformStats(stats: DashboardStats): DashboardStats {
  // KPIs must reflect computed workspace data only; variant affects lists via transform* helpers, not metric fabrication.
  return { ...stats };
}