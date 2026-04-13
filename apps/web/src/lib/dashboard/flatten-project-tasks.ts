/**
 * Single source of truth for task lists on projects that may expose tasks on
 * `project.tasks`, inside Kanban `columns[].tasks`, or both (duplicates).
 */

export type ProjectLikeForTasks<T extends { id?: string }> = {
  tasks?: T[];
  columns?: Array<{ tasks?: T[] }>;
};

const MAX_FLATTENED_TASKS = 5000;

/**
 * Deduplicate by task `id` when present; tasks without ids are all kept (rare).
 */
export function flattenTasksForProject<T extends { id?: string }>(
  project: ProjectLikeForTasks<T>
): T[] {
  const byId = new Map<string, T>();
  const withoutId: T[] = [];

  const push = (task: T) => {
    if (task.id) {
      if (!byId.has(task.id)) {
        byId.set(task.id, task);
      }
    } else {
      withoutId.push(task);
    }
  };

  for (const col of project.columns ?? []) {
    for (const task of col.tasks ?? []) {
      push(task);
    }
  }
  for (const task of project.tasks ?? []) {
    push(task);
  }

  return [...byId.values(), ...withoutId];
}

export function flattenTasksFromProjects<T extends { id?: string }>(
  projects: ProjectLikeForTasks<T>[]
): T[] {
  const out: T[] = [];
  for (const project of projects) {
    for (const task of flattenTasksForProject(project)) {
      out.push(task);
      if (out.length >= MAX_FLATTENED_TASKS) {
        return out;
      }
    }
  }
  return out;
}
