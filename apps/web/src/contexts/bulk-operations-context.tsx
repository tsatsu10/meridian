import type { TaskWithSubtasks } from "@/types/task";
import { createContext, useContext, useState, type ReactNode } from "react";

interface BulkOperationsContextType {
  selectedTasks: Set<string>;
  isSelectionMode: boolean;
  toggleTaskSelection: (taskId: string) => void;
  selectAllSubtasks: (parentTaskId: string, subtasks: TaskWithSubtasks[]) => void;
  clearSelection: () => void;
  enterSelectionMode: () => void;
  exitSelectionMode: () => void;
  bulkUpdateStatus: (status: string) => void;
  bulkUpdatePriority: (priority: string) => void;
  bulkDelete: () => void;
  bulkAssign: (userEmail: string) => void;
}

const BulkOperationsContext = createContext<BulkOperationsContextType | undefined>(undefined);

interface BulkOperationsProviderProps {
  children: ReactNode;
  onBulkUpdate?: (taskIds: string[], updates: Partial<TaskWithSubtasks>) => void;
  onBulkDelete?: (taskIds: string[]) => void;
}

export function BulkOperationsProvider({ 
  children, 
  onBulkUpdate,
  onBulkDelete 
}: BulkOperationsProviderProps) {
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const selectAllSubtasks = (parentTaskId: string, subtasks: TaskWithSubtasks[]) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      const addSubtasks = (tasks: TaskWithSubtasks[]) => {
        tasks.forEach(task => {
          newSet.add(task.id);
          if (task.subtasks) {
            addSubtasks(task.subtasks);
          }
        });
      };
      addSubtasks(subtasks);
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedTasks(new Set());
  };

  const enterSelectionMode = () => {
    setIsSelectionMode(true);
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    clearSelection();
  };

  const bulkUpdateStatus = (status: string) => {
    if (onBulkUpdate && selectedTasks.size > 0) {
      onBulkUpdate(Array.from(selectedTasks), { status });
      clearSelection();
    }
  };

  const bulkUpdatePriority = (priority: string) => {
    if (onBulkUpdate && selectedTasks.size > 0) {
      onBulkUpdate(Array.from(selectedTasks), { priority });
      clearSelection();
    }
  };

  const bulkAssign = (userEmail: string) => {
    if (onBulkUpdate && selectedTasks.size > 0) {
      onBulkUpdate(Array.from(selectedTasks), { userEmail });
      clearSelection();
    }
  };

  const bulkDelete = () => {
    if (onBulkDelete && selectedTasks.size > 0) {
      onBulkDelete(Array.from(selectedTasks));
      clearSelection();
    }
  };

  return (
    <BulkOperationsContext.Provider
      value={{
        selectedTasks,
        isSelectionMode,
        toggleTaskSelection,
        selectAllSubtasks,
        clearSelection,
        enterSelectionMode,
        exitSelectionMode,
        bulkUpdateStatus,
        bulkUpdatePriority,
        bulkDelete,
        bulkAssign,
      }}
    >
      {children}
    </BulkOperationsContext.Provider>
  );
}

export function useBulkOperations() {
  const context = useContext(BulkOperationsContext);
  if (context === undefined) {
    throw new Error("useBulkOperations must be used within a BulkOperationsProvider");
  }
  return context;
} 