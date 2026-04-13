// @epic-2.2-realtime: Type definitions for real-time collaboration features

export interface EnhancedCursor {
  userEmail: string;
  userName: string;
  position: { x: number; y: number };
  selection?: {
    startOffset: number;
    endOffset: number;
    selectedText: string;
    elementId: string;
    selectionRect?: DOMRect;
  };
  elementContext?: {
    elementType: 'task' | 'comment' | 'form' | 'button' | 'text' | 'page';
    elementId: string;
    action: 'hover' | 'focus' | 'click' | 'select' | 'edit';
    metadata?: Record<string, any>;
  };
  lastUpdated: string;
  isActive: boolean;
}

export interface TaskEditSession {
  taskId: string;
  field: 'title' | 'description' | 'status' | 'priority' | 'assignee' | 'dueDate';
  editors: Array<{
    userEmail: string;
    userName: string;
    cursorPosition: number;
    lastEdit: string;
    isTyping: boolean;
  }>;
  conflictResolution: 'last-write-wins' | 'operational-transform';
  lastActivity: string;
  version: number;
}

export interface LiveComment {
  id: string;
  taskId: string;
  userEmail: string;
  userName: string;
  content: string;
  timestamp: string;
  isEditing?: boolean;
  editHistory?: Array<{
    content: string;
    timestamp: string;
    userEmail: string;
  }>;
  reactions?: Array<{
    emoji: string;
    userEmail: string;
    timestamp: string;
  }>;
  mentions?: string[];
  isResolved?: boolean;
  parentCommentId?: string;
  anchor?: {
    elementId: string;
    elementType: string;
    position: { x: number; y: number };
  };
}

export interface TypingIndicator {
  userEmail: string;
  userName: string;
  location: {
    type: 'comment' | 'task' | 'description';
    id: string;
  };
  timestamp: string;
}

export interface UserActivity {
  userEmail: string;
  userName: string;
  activity: {
    type: 'viewing' | 'editing' | 'commenting' | 'creating' | 'idle';
    target?: {
      type: 'task' | 'project' | 'workspace' | 'file';
      id: string;
      name: string;
    };
    details?: string;
  };
  timestamp: string;
}

export interface CollaborationConflict {
  id: string;
  type: 'task_edit' | 'comment_edit' | 'status_change' | 'assignment_change';
  resourceId: string;
  conflictingUsers: Array<{
    userEmail: string;
    userName: string;
    change: any;
    timestamp: string;
  }>;
  resolution?: {
    strategy: 'merge' | 'override' | 'manual';
    resolvedBy: string;
    resolvedAt: string;
    finalValue: any;
  };
  status: 'pending' | 'resolved' | 'ignored';
}

export interface RealtimeEvent {
  id: string;
  type: 'cursor_update' | 'task_edit' | 'comment_post' | 'presence_change' | 'typing_start' | 'typing_stop';
  data: any;
  userEmail: string;
  timestamp: string;
  workspaceId: string;
  resourceId?: string;
}

export interface CursorCluster {
  id: string;
  cursors: EnhancedCursor[];
  centerPosition: { x: number; y: number };
  radius: number;
  isExpanded: boolean;
}

export interface SelectionHighlight {
  id: string;
  userEmail: string;
  userName: string;
  elementId: string;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  color: string;
  timestamp: string;
}

export interface FocusIndicator {
  userEmail: string;
  userName: string;
  elementId: string;
  elementType: string;
  focusType: 'input' | 'textarea' | 'contenteditable' | 'button' | 'link';
  timestamp: string;
}

export interface RealtimeNotification {
  id: string;
  type: 'mention' | 'assignment' | 'comment' | 'status_change' | 'conflict';
  title: string;
  message: string;
  userEmail: string;
  targetUsers: string[];
  data?: any;
  timestamp: string;
  isRead: boolean;
} 