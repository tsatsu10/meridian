// @epic-2.2-realtime: Real-time collaborative task editor
import React, { useEffect, useState, useRef } from 'react';
import { useUnifiedWebSocket } from '@/hooks/useUnifiedWebSocket';
import useAuth from '@/components/providers/auth-provider/hooks/use-auth';
import useWorkspaceStore from '@/store/workspace';
import { TypingIndicator, useInputTypingTracker } from '@/components/presence/typing-indicator';
import type { TaskEditSession } from '@/types/realtime';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Users, AlertTriangle } from 'lucide-react';

interface RealTimeTaskEditorProps {
  taskId: string;
  field: 'title' | 'description';
  value: string;
  onChange: (value: string) => void;
  onSave?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RealTimeTaskEditor({
  taskId,
  field,
  value,
  onChange,
  onSave,
  placeholder = 'Edit task...',
  className = ''
}: RealTimeTaskEditorProps) {
  const { user } = useAuth()
  const { workspace } = useWorkspaceStore()
  const { connectionState } = useUnifiedWebSocket({ 
    enabled: !!user?.email && !!workspace?.id,
    userEmail: user?.email || '',
    workspaceId: workspace?.id || ''
  });
  const isConnected = connectionState.isConnected;
  const [editSession, setEditSession] = useState<TaskEditSession | null>(null);
  const [localValue, setLocalValue] = useState(value);
  const [hasConflict, setHasConflict] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Get the appropriate ref based on field type
  const currentRef = field === 'title' ? inputRef : textareaRef;
  
  // Track typing for this specific field
  const isTyping = useInputTypingTracker(currentRef, {
    type: 'task',
    id: `${taskId}-${field}`
  });

  // Sync local value with prop value when not focused
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value);
    }
  }, [value, isFocused]);

  // Handle real-time updates from other users
  useEffect(() => {
    if (!isConnected) return;

    // Listen for real-time task updates
    const handleTaskUpdate = (update: any) => {
      if (update.taskId === taskId && update.field === field) {
        if (!isFocused) {
          setLocalValue(update.value);
          onChange(update.value);
        } else {
          // Show conflict indicator if user is currently editing
          setHasConflict(true);
        }
      }
    };

    // This would be connected to the WebSocket message handler
    return () => {};
  }, [isConnected, taskId, field, isFocused, onChange]);

  const handleInputChange = (newValue: string) => {
    setLocalValue(newValue);
    onChange(newValue);
    setHasConflict(false);

    // Debounced real-time update would be sent here
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setHasConflict(false);

    if (onSave) {
      onSave(localValue);
    }
  };

  const renderCollaborationIndicators = () => {
    if (!editSession || editSession.editors.length === 0) return null;

    const otherEditors = editSession.editors.filter(editor => editor.isTyping);

    return (
      <div className="flex items-center space-x-2 mt-1">
        {otherEditors.length > 0 && (
          <div className="flex items-center space-x-1">
            <Users className="h-3 w-3 text-blue-500" />
            <span className="text-xs text-blue-600">
              {otherEditors.length === 1 
                ? `${otherEditors[0].userName} is editing`
                : `${otherEditors.length} people editing`
              }
            </span>
          </div>
        )}
        
        {hasConflict && (
          <Badge variant="outline" className="text-xs border-red-500 text-red-600">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Conflict detected
          </Badge>
        )}
      </div>
    );
  };

  const baseClassName = `${className} ${hasConflict ? 'border-red-500 bg-red-50' : ''} ${
    isTyping ? 'ring-2 ring-blue-500' : ''
  }`;

  return (
    <div className="space-y-1">
      {field === 'title' ? (
        <Input
          ref={inputRef}
          value={localValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={baseClassName}
          data-task-field={`${taskId}-${field}`}
        />
      ) : (
        <Textarea
          ref={textareaRef}
          value={localValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={baseClassName}
          rows={3}
          data-task-field={`${taskId}-${field}`}
        />
      )}
      
      {renderCollaborationIndicators()}
      
      <TypingIndicator 
        location={{ type: 'task', id: `${taskId}-${field}` }}
        className="ml-1"
      />
    </div>
  );
}

// Hook for managing real-time task editing sessions
export function useTaskEditSession(taskId: string) {
  const { user } = useAuth()
  const { workspace } = useWorkspaceStore()
  const { connectionState } = useUnifiedWebSocket({ 
    enabled: !!user?.email && !!workspace?.id,
    userEmail: user?.email || '',
    workspaceId: workspace?.id || ''
  });
  const isConnected = connectionState.isConnected;
  const [editSessions, setEditSessions] = useState<Map<string, TaskEditSession>>(new Map());

  useEffect(() => {
    if (!isConnected) return;

    // Listen for edit session updates
    const handleEditSessionUpdate = (session: TaskEditSession) => {
      if (session.taskId === taskId) {
        setEditSessions(prev => new Map(prev.set(session.field, session)));
      }
    };

    // This would be connected to WebSocket
    return () => {};
  }, [isConnected, taskId]);

  const startEditSession = (field: 'title' | 'description' | 'status' | 'priority' | 'assignee' | 'dueDate') => {
    // This would send a WebSocket message to start the session
  };

  const endEditSession = (field: 'title' | 'description' | 'status' | 'priority' | 'assignee' | 'dueDate') => {
    // This would send a WebSocket message to end the session
  };

  return {
    editSessions,
    startEditSession,
    endEditSession
  };
}

// Component for showing active editors on a task
export function TaskEditorsIndicator({ taskId }: { taskId: string }) {
  const { editSessions } = useTaskEditSession(taskId);
  
  const allEditors = Array.from(editSessions.values())
    .flatMap(session => session.editors)
    .filter(editor => editor.isTyping);

  if (allEditors.length === 0) return null;

  const uniqueEditors = allEditors.reduce((acc, editor) => {
    if (!acc.find(e => e.userEmail === editor.userEmail)) {
      acc.push(editor);
    }
    return acc;
  }, [] as typeof allEditors);

  return (
    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
      <Users className="h-3 w-3" />
      <span>
        {uniqueEditors.length === 1 
          ? `${uniqueEditors[0].userName} is editing`
          : `${uniqueEditors.length} people editing`
        }
      </span>
    </div>
  );
} 