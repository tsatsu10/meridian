import { useMemo } from "react";
import type { ProjectDashboardRow } from "@/types/project";

export type ProjectHealth = "on-track" | "at-risk" | "delayed";

export interface HealthMetrics {
  health: ProjectHealth;
  color: string;
  bgColor: string;
  icon: string;
  label: string;
  score: number;
}

/**
 * Calculate project health based on tasks and deadlines
 * Uses local project data - NO API calls
 */
export function useProjectHealth(project: ProjectDashboardRow | null | undefined): HealthMetrics {
  return useMemo(() => {
    if (!project) {
      return {
        health: "at-risk" as ProjectHealth,
        color: "text-yellow-600",
        bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
        icon: "⚠️",
        label: "Unknown",
        score: 50,
      };
    }

    // Use tasks from project data (already included)
    const tasks = project.tasks || [];
    const totalTasks = tasks.length;
    
    if (totalTasks === 0) {
      // No tasks - consider as starting/planning
      return {
        health: "on-track" as ProjectHealth,
        color: "text-blue-600",
        bgColor: "bg-blue-100 dark:bg-blue-900/20",
        icon: "🚀",
        label: "Starting",
        score: 100,
      };
    }

    // Calculate completion rate
    const completedTasks = tasks.filter((t) => {
      const status = t.status?.toLowerCase();
      return status === "completed" || status === "done";
    }).length;
    const completionRate = (completedTasks / totalTasks) * 100;

    // Check for overdue tasks
    const now = new Date();
    const overdueTasks = tasks.filter((t) => {
      if (!t.dueDate) return false;
      const dueDate = new Date(t.dueDate);
      const status = t.status?.toLowerCase();
      const isComplete = status === "completed" || status === "done";
      return !isComplete && dueDate < now;
    }).length;
    const overdueRate = totalTasks > 0 ? (overdueTasks / totalTasks) * 100 : 0;

    // Check project due date
    let projectOverdue = false;
    if (project.dueDate) {
      const projectDue = new Date(project.dueDate);
      const projectStatus = project.status?.toLowerCase();
      const isComplete = projectStatus === "completed" || projectStatus === "done";
      projectOverdue = !isComplete && projectDue < now;
    }

    // Calculate health score (0-100)
    let score = completionRate;
    score -= overdueRate * 0.5; // Penalize for overdue tasks
    if (projectOverdue) score -= 20; // Penalty for project overdue
    score = Math.max(0, Math.min(100, score));

    // Determine health status
    if (score >= 75 && overdueRate < 10 && !projectOverdue) {
      return {
        health: "on-track" as ProjectHealth,
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-100 dark:bg-green-900/20",
        icon: "✓",
        label: "On Track",
        score,
      };
    } else if (score >= 40 && overdueRate < 30) {
      return {
        health: "at-risk" as ProjectHealth,
        color: "text-yellow-600 dark:text-yellow-400",
        bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
        icon: "⚠",
        label: "At Risk",
        score,
      };
    } else {
      return {
        health: "delayed" as ProjectHealth,
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-100 dark:bg-red-900/20",
        icon: "!",
        label: "Delayed",
        score,
      };
    }
  }, [project]);
}

/**
 * Pure helper for Projects hub filtering — matches filter chip values (on-track, at-risk, behind, ahead).
 */
export function getProjectHealthFilterKey(project: {
  tasks?: Array<{ status?: string; dueDate?: string | Date | null }>;
  dueDate?: string | Date | null;
  status?: string;
}): "on-track" | "at-risk" | "behind" | "ahead" {
  const tasks = project.tasks ?? [];
  const totalTasks = tasks.length;
  if (totalTasks === 0) {
    return "on-track";
  }
  const completedTasks = tasks.filter((t) => {
    const status = t.status?.toLowerCase();
    return status === "completed" || status === "done";
  }).length;
  const completionRate = (completedTasks / totalTasks) * 100;
  const now = new Date();
  const overdueTasks = tasks.filter((t) => {
    if (!t.dueDate) return false;
    const dueDate = new Date(t.dueDate);
    const status = t.status?.toLowerCase();
    const isComplete = status === "completed" || status === "done";
    return !isComplete && dueDate < now;
  }).length;
  const overdueRate = totalTasks > 0 ? (overdueTasks / totalTasks) * 100 : 0;
  let projectOverdue = false;
  if (project.dueDate) {
    const projectDue = new Date(project.dueDate);
    const projectStatus = project.status?.toLowerCase();
    const isComplete = projectStatus === "completed" || projectStatus === "done";
    projectOverdue = !isComplete && projectDue < now;
  }
  let score = completionRate;
  score -= overdueRate * 0.5;
  if (projectOverdue) score -= 20;
  score = Math.max(0, Math.min(100, score));

  if (score >= 75 && overdueRate < 10 && !projectOverdue) {
    return score >= 92 ? "ahead" : "on-track";
  }
  if (score >= 40 && overdueRate < 30) {
    return "at-risk";
  }
  return "behind";
}

export default useProjectHealth;

