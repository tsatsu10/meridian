// Phase 1.1: Project-Chat Context Bridge Types
// Defines the interface between chat system and project management workflow

export interface ProjectChatContext {
  workspaceId: string;
  projectId?: string;
  taskId?: string;
  milestoneId?: string;
  channelType?: 'general' | 'project-specific' | 'milestone-tracking' | 'task-discussion';
  parentContext?: {
    type: 'project' | 'task' | 'milestone';
    id: string;
    name: string;
  };
}

export interface TaskReference {
  id: string;
  title: string;
  status: string;
  projectId: string;
  assigneeEmail?: string;
  dueDate?: string;
  matched: {
    type: 'id' | 'title' | 'mention';
    text: string;
    position: number;
  };
}

export interface ProjectReference {
  id: string;
  name: string;
  status: string;
  workspaceId: string;
  matched: {
    type: 'id' | 'name' | 'mention';
    text: string;
    position: number;
  };
}

export interface MilestoneReference {
  id: string;
  title: string;
  status: 'upcoming' | 'achieved' | 'missed';
  projectId: string;
  dueDate: string;
  matched: {
    type: 'id' | 'title' | 'mention';
    text: string;
    position: number;
  };
}

export interface EnhancedMessage {
  id: string;
  content: string;
  userEmail: string;
  userName: string;
  messageType: 'text' | 'file' | 'system';
  createdAt: string;
  channelId: string;
  
  // Enhanced context
  projectContext?: ProjectChatContext;
  projectReferences?: ProjectReference[];
  taskReferences?: TaskReference[];
  milestoneReferences?: MilestoneReference[];
  
  // Workflow integration
  generatedTasks?: string[]; // Task IDs created from this message
  linkedMilestones?: string[]; // Milestone IDs linked to this message
  actionItems?: {
    id: string;
    text: string;
    assignee?: string;
    dueDate?: string;
    completed: boolean;
  }[];
  
  // Standard properties
  isEdited?: boolean;
  editedAt?: string;
  mentions?: string[];
  attachments?: any[];
  parentMessageId?: string;
  reactions?: any[];
  isPinned?: boolean;
  
  user: {
    email: string;
    name: string;
  };
}

export interface ChatWorkflowAction {
  type: 'create-task' | 'assign-to-project' | 'schedule-follow-up' | 'link-to-milestone' | 'mention-team';
  messageId: string;
  payload: {
    projectId?: string;
    taskTitle?: string;
    assigneeEmail?: string;
    dueDate?: string;
    milestoneId?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  };
}

export interface ChannelProjectBinding {
  channelId: string;
  projectId?: string;
  taskId?: string;
  milestoneId?: string;
  autoSync: boolean;
  notificationSettings: {
    taskUpdates: boolean;
    milestoneChanges: boolean;
    projectDeadlines: boolean;
    teamMentions: boolean;
  };
}