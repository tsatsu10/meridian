import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// @epic-1.2-dependencies: Team Leads need automated dependency management
// @epic-2.3-notifications: Auto-status updates should appear in all notifications
// @role-team-lead: Project coordination needs automated workflow management

// Utility function to generate unique IDs
const generateUniqueId = (prefix: string = ''): string => {
  return `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

interface AutoStatusUpdateData {
  taskId: string;
  newStatus: string;
  reason: string;
  triggeredBy?: string;
  dependentTasks?: string[];
}

interface NotificationData {
  id: string;
  type: 'auto-status-update';
  title: string;
  message: string;
  data: AutoStatusUpdateData;
  timestamp: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
}

// Mock API function - replace with actual API call
const triggerAutoStatusUpdate = async (data: AutoStatusUpdateData): Promise<{ 
  updatedTask: any; 
  notification: NotificationData 
}> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Create notification for the auto-status update
  const notification: NotificationData = {
    id: generateUniqueId('auto-'),
    type: 'auto-status-update',
    title: 'Task Status Auto-Updated',
    message: `Task status changed to "${data.newStatus}" - ${data.reason}`,
    data,
    timestamp: new Date().toISOString(),
    isRead: false,
    priority: 'medium',
  };
  
  return {
    updatedTask: { id: data.taskId, status: data.newStatus },
    notification
  };
};

// Store for managing notifications in memory
let notificationStore: NotificationData[] = [];

export const addNotificationToStore = (notification: NotificationData) => {
  notificationStore.unshift(notification);
  // Keep only last 100 notifications
  if (notificationStore.length > 100) {
    notificationStore = notificationStore.slice(0, 100);
  }
};

export const getNotificationsFromStore = (): NotificationData[] => {
  return notificationStore;
};

export const markNotificationAsRead = (notificationId: string) => {
  const notification = notificationStore.find(n => n.id === notificationId);
  if (notification) {
    notification.isRead = true;
  }
};

export const clearAllNotifications = () => {
  notificationStore = [];
};

export default function useAutoStatusUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: triggerAutoStatusUpdate,
    onSuccess: (data, variables) => {
      // Add notification to store
      addNotificationToStore(data.notification);
      
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      
      // Show toast notification
      toast.success(data.notification.message, {
        description: `Task ${variables.taskId} updated automatically`,
        action: {
          label: "View Details",
          onClick: () => {
            // Navigate to task or show details
          },
        },
      });
    },
    onError: (error, variables) => {
      console.error("Auto-status update failed:", error);
      toast.error(`Failed to update task ${variables.taskId}`, {
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    },
  });
}

// Helper function to check and trigger auto-status updates
export const checkDependenciesAndUpdate = async (
  completedTaskId: string,
  allTasks: any[],
  triggerUpdate: (data: AutoStatusUpdateData) => void
) => {
  // Find tasks that depend on the completed task
  const dependentTasks = allTasks.filter(task => 
    task.dependencies && 
    task.dependencies.includes(completedTaskId) &&
    task.status !== 'done'
  );

  for (const dependentTask of dependentTasks) {
    // Check if all dependencies are completed
    const allDependenciesCompleted = dependentTask.dependencies.every((depId: string) => {
      const depTask = allTasks.find(t => t.id === depId);
      return depTask && depTask.status === 'done';
    });

    if (allDependenciesCompleted && dependentTask.status === 'todo') {
      // Auto-update to in-progress
      triggerUpdate({
        taskId: dependentTask.id,
        newStatus: 'in_progress',
        reason: 'All dependencies completed',
        triggeredBy: completedTaskId,
        dependentTasks: dependentTask.dependencies,
      });
    }
  }
};

// Hook to monitor task status changes and trigger auto-updates
export const useTaskStatusMonitor = () => {
  const autoStatusUpdate = useAutoStatusUpdate();

  const handleTaskStatusChange = (
    taskId: string,
    newStatus: string,
    oldStatus: string,
    allTasks: any[]
  ) => {
    // If task is marked as done, check for dependent tasks
    if (newStatus === 'done' && oldStatus !== 'done') {
      checkDependenciesAndUpdate(
        taskId,
        allTasks,
        (updateData) => autoStatusUpdate.mutate(updateData)
      );
    }
  };

  return {
    handleTaskStatusChange,
    isUpdating: autoStatusUpdate.isPending,
  };
}; 