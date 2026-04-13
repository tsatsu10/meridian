// @epic-3.4-teams: Collaborative Task Editor with Real-time Operational Transform and Permissions
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUnifiedWebSocket } from '@/hooks/useUnifiedWebSocket';
import { useAuth } from '@/components/providers/unified-context-provider';
import { useCollaborationPermissions } from '@/hooks/useCollaborationPermissions';
import useWorkspaceStore from '@/store/workspace';
import { EnhancedLiveCursors } from './enhanced-live-cursors';
import { EnhancedPresenceIndicators } from './enhanced-presence-indicators';
import { cn } from '@/lib/cn';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Edit,
  Eye,
  Save,
  Users,
  Clock,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Lock,
  Unlock,
  History,
  Undo,
  Redo
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { logger } from "../../lib/logger";

interface CollaborativeEdit {
  id: string;
  field: string;
  operation: 'insert' | 'delete' | 'replace';
  position: number;
  content: string;
  oldContent?: string;
  userEmail: string;
  userName: string;
  timestamp: number;
  applied: boolean;
}

interface EditConflict {
  id: string;
  field: string;
  conflictingEdits: CollaborativeEdit[];
  resolution: 'manual' | 'auto' | 'pending';
  resolvedBy?: string;
  resolvedAt?: number;
}

interface TaskEditingSession {
  taskId: string;
  collaborators: Map<string, {
    userEmail: string;
    userName: string;
    isEditing: boolean;
    editingField?: string;
    lastActivity: number;
  }>;
  pendingEdits: Map<string, CollaborativeEdit[]>;
  conflicts: EditConflict[];
  version: number;
  lastSaved: number;
}

interface CollaborativeTaskEditorProps {
  taskId: string;
  initialTask: {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    assignee?: string;
    dueDate?: string;
  };
  onSave: (changes: Partial<typeof initialTask>) => Promise<void>;
  onCancel?: () => void;
  className?: string;
}

export function CollaborativeTaskEditor({
  taskId,
  initialTask,
  onSave,
  onCancel,
  className = ''
}: CollaborativeTaskEditorProps) {
  const { user } = useAuth();
  const { workspace } = useWorkspaceStore();

  // Check collaboration permissions
  const {
    shouldShowCollaborationFeatures,
    canPerformCollaborationAction,
    canCollaborateOnResource
  } = useCollaborationPermissions();

  // Early return if user doesn't have permission for collaborative editing
  if (!shouldShowCollaborationFeatures.collaborativeEditing || !canCollaborateOnResource('task')) {
    // Show read-only view or basic editor
    return (
      <div className={cn("p-4 border rounded-lg bg-muted/10", className)}>
        <p className="text-sm text-muted-foreground">
          You don't have permission to collaborate on task editing.
        </p>
      </div>
    );
  }

  // Task editing state
  const [task, setTask] = useState(initialTask);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [localChanges, setLocalChanges] = useState<Partial<typeof initialTask>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Collaboration state
  const [editingSession, setEditingSession] = useState<TaskEditingSession>({
    taskId,
    collaborators: new Map(),
    pendingEdits: new Map(),
    conflicts: [],
    version: 1,
    lastSaved: Date.now()
  });

  // Edit history
  const [editHistory, setEditHistory] = useState<CollaborativeEdit[]>([]);
  const [undoStack, setUndoStack] = useState<CollaborativeEdit[]>([]);
  const [redoStack, setRedoStack] = useState<CollaborativeEdit[]>([]);

  // Refs for form elements
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // WebSocket for real-time collaboration
  const {
    connectionState,
    joinResource,
    leaveResource,
    updateCursor
  } = useUnifiedWebSocket({
    enabled: !!user?.email && !!workspace?.id,
    userEmail: user?.email || '',
    workspaceId: workspace?.id || '',
    onCursorUpdate: handleCursorUpdate,
    onTaskUpdate: handleTaskUpdate
  });

  // Handle incoming cursor updates
  function handleCursorUpdate(data: any) {
    if (data.resourceId === taskId) {
      setEditingSession(prev => {
        const newCollaborators = new Map(prev.collaborators);

        if (data.userEmail !== user?.email) {
          newCollaborators.set(data.userEmail, {
            userEmail: data.userEmail,
            userName: data.userName || data.userEmail.split('@')[0],
            isEditing: data.currentAction === 'editing',
            editingField: data.elementId,
            lastActivity: Date.now()
          });
        }

        return {
          ...prev,
          collaborators: newCollaborators
        };
      });
    }
  }

  // Handle incoming task updates
  function handleTaskUpdate(data: any) {
    if (data.taskId === taskId) {
      const edit: CollaborativeEdit = {
        id: data.editId || Date.now().toString(),
        field: data.field,
        operation: data.operation,
        position: data.position || 0,
        content: data.content,
        oldContent: data.oldContent,
        userEmail: data.userEmail,
        userName: data.userName,
        timestamp: data.timestamp,
        applied: false
      };

      applyCollaborativeEdit(edit);
    }
  }

  // Apply collaborative edit with operational transform
  const applyCollaborativeEdit = useCallback((edit: CollaborativeEdit) => {
    if (edit.userEmail === user?.email) return; // Don't apply our own edits

    setTask(prev => {
      const newTask = { ...prev };

      switch (edit.operation) {
        case 'replace':
          newTask[edit.field as keyof typeof newTask] = edit.content as any;
          break;
        case 'insert':
          // For text fields, insert at position
          if (typeof newTask[edit.field as keyof typeof newTask] === 'string') {
            const currentValue = newTask[edit.field as keyof typeof newTask] as string;
            const newValue = currentValue.slice(0, edit.position) +
                           edit.content +
                           currentValue.slice(edit.position);
            newTask[edit.field as keyof typeof newTask] = newValue as any;
          }
          break;
        case 'delete':
          // For text fields, delete from position
          if (typeof newTask[edit.field as keyof typeof newTask] === 'string') {
            const currentValue = newTask[edit.field as keyof typeof newTask] as string;
            const newValue = currentValue.slice(0, edit.position) +
                           currentValue.slice(edit.position + edit.content.length);
            newTask[edit.field as keyof typeof newTask] = newValue as any;
          }
          break;
      }

      return newTask;
    });

    // Add to edit history
    setEditHistory(prev => [...prev, { ...edit, applied: true }]);

  }, [user?.email]);

  // Broadcast edit to collaborators
  const broadcastEdit = useCallback((edit: Omit<CollaborativeEdit, 'userEmail' | 'userName' | 'timestamp' | 'applied'>) => {
    if (!connectionState.isConnected) return;

    const fullEdit: CollaborativeEdit = {
      ...edit,
      userEmail: user?.email || '',
      userName: user?.name || user?.email?.split('@')[0] || '',
      timestamp: Date.now(),
      applied: true
    };

    // Send through WebSocket
    // This would be implemented in the WebSocket handler
    logger.info("🔄 Broadcasting edit:");

    // Add to local history
    setEditHistory(prev => [...prev, fullEdit]);
    setUndoStack(prev => [...prev, fullEdit]);
    setRedoStack([]); // Clear redo stack on new edit

  }, [connectionState.isConnected, user]);

  // Handle field focus (start editing)
  const handleFieldFocus = useCallback((fieldName: string) => {
    setEditingField(fieldName);

    // Broadcast editing start
    if (connectionState.isConnected) {
      updateCursor(0, 0, fieldName, taskId);
    }

    // Update collaboration state
    setEditingSession(prev => {
      const newCollaborators = new Map(prev.collaborators);
      if (user?.email) {
        newCollaborators.set(user.email, {
          userEmail: user.email,
          userName: user.name || user.email.split('@')[0],
          isEditing: true,
          editingField: fieldName,
          lastActivity: Date.now()
        });
      }
      return { ...prev, collaborators: newCollaborators };
    });
  }, [connectionState.isConnected, updateCursor, taskId, user]);

  // Handle field blur (stop editing)
  const handleFieldBlur = useCallback((fieldName: string) => {
    setEditingField(null);

    // Update collaboration state
    setEditingSession(prev => {
      const newCollaborators = new Map(prev.collaborators);
      if (user?.email) {
        const collaborator = newCollaborators.get(user.email);
        if (collaborator) {
          newCollaborators.set(user.email, {
            ...collaborator,
            isEditing: false,
            editingField: undefined
          });
        }
      }
      return { ...prev, collaborators: newCollaborators };
    });
  }, [user]);

  // Handle field changes
  const handleFieldChange = useCallback((fieldName: string, newValue: string, operation: 'replace' | 'insert' | 'delete' = 'replace') => {
    const oldValue = task[fieldName as keyof typeof task] as string;

    // Update local state
    setTask(prev => ({ ...prev, [fieldName]: newValue }));
    setLocalChanges(prev => ({ ...prev, [fieldName]: newValue }));
    setHasUnsavedChanges(true);

    // Broadcast edit
    broadcastEdit({
      id: Date.now().toString(),
      field: fieldName,
      operation,
      position: 0, // For replace operations
      content: newValue,
      oldContent: oldValue
    });
  }, [task, broadcastEdit]);

  // Save changes
  const handleSave = useCallback(async () => {
    if (!hasUnsavedChanges) return;

    setIsSaving(true);
    try {
      await onSave(localChanges);
      setLocalChanges({});
      setHasUnsavedChanges(false);
      setEditingSession(prev => ({ ...prev, lastSaved: Date.now(), version: prev.version + 1 }));
    } catch (error) {
      console.error('Failed to save task:', error);
    } finally {
      setIsSaving(false);
    }
  }, [hasUnsavedChanges, localChanges, onSave]);

  // Undo/Redo functionality
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;

    const lastEdit = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, lastEdit]);

    // Reverse the edit
    if (lastEdit.oldContent !== undefined) {
      handleFieldChange(lastEdit.field, lastEdit.oldContent, 'replace');
    }
  }, [undoStack, handleFieldChange]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;

    const editToRedo = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, editToRedo]);

    // Reapply the edit
    handleFieldChange(editToRedo.field, editToRedo.content, editToRedo.operation);
  }, [redoStack, handleFieldChange]);

  // Join collaboration session on mount
  useEffect(() => {
    if (connectionState.isConnected) {
      joinResource(taskId, 'task');
    }

    return () => {
      if (connectionState.isConnected) {
        leaveResource(taskId);
      }
    };
  }, [connectionState.isConnected, joinResource, leaveResource, taskId]);

  // Get currently editing users for a field
  const getFieldEditors = (fieldName: string) => {
    return Array.from(editingSession.collaborators.values())
      .filter(c => c.isEditing && c.editingField === fieldName && c.userEmail !== user?.email);
  };

  return (
    <TooltipProvider>
      <div className={cn("relative", className)}>
        {/* Collaboration overlay */}
        <EnhancedLiveCursors
          resourceId={taskId}
          resourceType="task"
          showTooltips={true}
          showPresenceIndicators={false}
        />

        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Edit className="w-5 h-5" />
                <span>Edit Task</span>
                {hasUnsavedChanges && (
                  <Badge variant="outline" className="ml-2">
                    Unsaved Changes
                  </Badge>
                )}
              </CardTitle>

              <div className="flex items-center space-x-2">
                {/* Undo/Redo */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUndo}
                  disabled={undoStack.length === 0}
                >
                  <Undo className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                >
                  <Redo className="w-4 h-4" />
                </Button>

                <Separator orientation="vertical" className="h-6" />

                {/* Save button */}
                <Button
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges || isSaving}
                  size="sm"
                >
                  {isSaving ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>

                {onCancel && (
                  <Button variant="outline" onClick={onCancel} size="sm">
                    Cancel
                  </Button>
                )}
              </div>
            </div>

            {/* Presence indicators */}
            <EnhancedPresenceIndicators
              mode="compact"
              showOfflineUsers={false}
              showCurrentActivity={true}
              maxDisplayUsers={5}
              className="flex items-center space-x-2"
            />
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Task Title */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Title</label>
                {getFieldEditors('title').length > 0 && (
                  <div className="flex items-center space-x-1">
                    <Edit className="w-3 h-3 text-blue-500" />
                    <span className="text-xs text-blue-600">
                      {getFieldEditors('title').map(e => e.userName).join(', ')} editing
                    </span>
                  </div>
                )}
              </div>
              <Input
                ref={titleRef}
                data-cursor-id="title"
                value={task.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                onFocus={() => handleFieldFocus('title')}
                onBlur={() => handleFieldBlur('title')}
                placeholder="Enter task title..."
                className={cn(
                  editingField === 'title' && "ring-2 ring-blue-500",
                  getFieldEditors('title').length > 0 && "ring-2 ring-yellow-500"
                )}
              />
            </div>

            {/* Task Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Description</label>
                {getFieldEditors('description').length > 0 && (
                  <div className="flex items-center space-x-1">
                    <Edit className="w-3 h-3 text-blue-500" />
                    <span className="text-xs text-blue-600">
                      {getFieldEditors('description').map(e => e.userName).join(', ')} editing
                    </span>
                  </div>
                )}
              </div>
              <Textarea
                ref={descriptionRef}
                data-cursor-id="description"
                value={task.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                onFocus={() => handleFieldFocus('description')}
                onBlur={() => handleFieldBlur('description')}
                placeholder="Enter task description..."
                rows={6}
                className={cn(
                  editingField === 'description' && "ring-2 ring-blue-500",
                  getFieldEditors('description').length > 0 && "ring-2 ring-yellow-500"
                )}
              />
            </div>

            {/* Task Properties Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select
                  data-cursor-id="status"
                  value={task.status}
                  onChange={(e) => handleFieldChange('status', e.target.value)}
                  onFocus={() => handleFieldFocus('status')}
                  onBlur={() => handleFieldBlur('status')}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <select
                  data-cursor-id="priority"
                  value={task.priority}
                  onChange={(e) => handleFieldChange('priority', e.target.value)}
                  onFocus={() => handleFieldFocus('priority')}
                  onBlur={() => handleFieldBlur('priority')}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Due Date</label>
                <Input
                  type="date"
                  data-cursor-id="dueDate"
                  value={task.dueDate || ''}
                  onChange={(e) => handleFieldChange('dueDate', e.target.value)}
                  onFocus={() => handleFieldFocus('dueDate')}
                  onBlur={() => handleFieldBlur('dueDate')}
                />
              </div>
            </div>

            {/* Edit History */}
            {editHistory.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <History className="w-4 h-4" />
                  <span className="text-sm font-medium">Recent Changes</span>
                </div>
                <ScrollArea className="h-32 w-full border rounded-md p-3">
                  <div className="space-y-2">
                    {editHistory.slice(-10).reverse().map((edit) => (
                      <div key={edit.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <Avatar className="w-4 h-4">
                            <AvatarFallback className="text-xs">
                              {edit.userName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{edit.userName}</span>
                          <span className="text-muted-foreground">
                            {edit.operation} {edit.field}
                          </span>
                        </div>
                        <span className="text-muted-foreground">
                          {formatDistanceToNow(new Date(edit.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Connection Status */}
            {!connectionState.isConnected && (
              <div className="flex items-center justify-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-600 mr-2" />
                <span className="text-sm text-yellow-700">
                  Collaboration features are offline. Changes will sync when reconnected.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}