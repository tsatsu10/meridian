import type { TaskWithSubtasks } from "@/types/task";

export function canMoveTaskToParent(taskId: string, newParentId: string | null, allTasks: TaskWithSubtasks[]): boolean {
  // Prevent moving a task to itself
  if (taskId === newParentId) return false;
  
  // Prevent creating circular dependencies
  if (newParentId && isDescendant(newParentId, taskId, allTasks)) {
    return false;
  }
  
  return true;
}

function isDescendant(potentialDescendantId: string, ancestorId: string, allTasks: TaskWithSubtasks[]): boolean {
  const findTaskById = (id: string, tasks: TaskWithSubtasks[]): TaskWithSubtasks | null => {
    for (const task of tasks) {
      if (task.id === id) return task;
      if (task.subtasks) {
        const found = findTaskById(id, task.subtasks);
        if (found) return found;
      }
    }
    return null;
  };
  
  const ancestor = findTaskById(ancestorId, allTasks);
  if (!ancestor || !ancestor.subtasks) return false;
  
  for (const subtask of ancestor.subtasks) {
    if (subtask.id === potentialDescendantId) return true;
    if (isDescendant(potentialDescendantId, subtask.id, allTasks)) return true;
  }
  
  return false;
}

export function flattenTasks(tasks: TaskWithSubtasks[]): TaskWithSubtasks[] {
  const flattened: TaskWithSubtasks[] = [];
  
  function flatten(taskList: TaskWithSubtasks[]) {
    for (const task of taskList) {
      flattened.push(task);
      if (task.subtasks) {
        flatten(task.subtasks);
      }
    }
  }
  
  flatten(tasks);
  return flattened;
}

export function findTaskInHierarchy(taskId: string, tasks: TaskWithSubtasks[]): TaskWithSubtasks | null {
  for (const task of tasks) {
    if (task.id === taskId) return task;
    if (task.subtasks) {
      const found = findTaskInHierarchy(taskId, task.subtasks);
      if (found) return found;
    }
  }
  return null;
}

export function findAllChildrenOfTask(parentTaskId: string, allTasks: TaskWithSubtasks[]): TaskWithSubtasks[] {const children: TaskWithSubtasks[] = [];
  
  // Find direct children
  const directChildren = allTasks.filter(task => task.parentId === parentTaskId);children.push(...directChildren);
  
  // Recursively find nested children
  directChildren.forEach(child => {const nestedChildren = findAllChildrenOfTask(child.id, allTasks);children.push(...nestedChildren);
  });return children;
} 