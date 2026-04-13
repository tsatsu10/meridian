import { priorityColorsTaskCard } from "@/constants/priority-colors";
import { useBulkOperations } from "@/contexts/bulk-operations-context";
import useProjectStore from "@/store/project";
import useWorkspaceStore from "@/store/workspace";
import type Task from "@/types/task";
import type { TaskWithSubtasks } from "@/types/task";
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { Calendar, Flag, UserIcon, ChevronDown, ChevronRight, Plus, Link2, Lock } from "lucide-react";
import React, { type CSSProperties, useState } from "react";
import { ContextMenu, ContextMenuTrigger } from "../ui/context-menu";
import TaskCardContextMenuContent from "./task-card-context-menu/task-card-context-menu-content";
import TaskCardLabels from "./task-labels";
// 🛡️ RBAC: Role-based UI controls
import { useRBACAuth, RequirePermission } from "@/lib/permissions";

interface TaskCardProps {
  task: TaskWithSubtasks;
  hierarchyLevel?: number;
  parentTask?: TaskWithSubtasks;
}

// 🚀 PERFORMANCE: Memoize TaskCard to prevent unnecessary re-renders
const TaskCard = React.memo(function TaskCard({ task, hierarchyLevel = 0, parentTask }: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  // 🛡️ RBAC: Get user permissions for role-based UI
  const { hasPermission, user } = useRBACAuth();
  
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });
  
  const {
    setNodeRef: setDroppableRef,
    isOver,
  } = useDroppable({
    id: task.id,
    data: {
      type: "task",
      task,
    },
  });
  
  const { project } = useProjectStore();
  const { workspace } = useWorkspaceStore();
  const navigate = useNavigate();
  
  // Use bulk operations if available, otherwise provide defaults
  let selectedTasks = new Set<string>();
  let isSelectionMode = false;
  let toggleTaskSelection = (_taskId: string) => {};
  let selectAllSubtasks = (_parentTaskId: string, _subtasks: TaskWithSubtasks[]) => {};

  try {
    const bulkOps = useBulkOperations();
    selectedTasks = bulkOps.selectedTasks;
    isSelectionMode = bulkOps.isSelectionMode;
    toggleTaskSelection = bulkOps.toggleTaskSelection;
    selectAllSubtasks = bulkOps.selectAllSubtasks;
  } catch (error) {
    // BulkOperationsProvider not available, use defaults
  }

  // Combine refs
  const setNodeRef = (node: HTMLElement | null) => {
    setSortableRef(node);
    setDroppableRef(node);
  };

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    touchAction: "none",
  };

  function handleTaskCardClick() {
    if (isSelectionMode) {
      toggleTaskSelection(task.id);
      return;
    }

    if (!project || !task || !workspace) return;

    navigate({
      to: "/dashboard/workspace/$workspaceId/project/$projectId/task/$taskId",
      params: {
        workspaceId: workspace.id,
        projectId: project.id,
        taskId: task.id,
      },
    });
  }

  const isSelected = selectedTasks.has(task.id);
  const isSubtask = !!task.parentId;
  const isNestedSubtask = hierarchyLevel > 0;
  
  // Calculate indentation based on hierarchy level
  const indentationClass = hierarchyLevel > 0 
    ? `ml-${Math.min(hierarchyLevel * 4, 12)}` // Max 12 (3rem) indentation
    : '';
  
  // ✨ SIMPLIFIED: Cleaner styling for better readability
  const hierarchyBorderClass = hierarchyLevel > 0
    ? "border-l-2 border-l-indigo-400 dark:border-l-indigo-500"
    : "";
    
  const hierarchyBgClass = hierarchyLevel > 0
    ? "bg-indigo-50/30 dark:bg-indigo-950/30"
    : "bg-card";

  return (
    <div ref={setNodeRef} style={style} {...attributes} className={indentationClass}>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            onClick={handleTaskCardClick}
            className={`group relative ${hierarchyBgClass} rounded-lg border p-3 transition-colors duration-150 ${hierarchyBorderClass} ${
              isOver 
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 ring-1 ring-blue-500/50" 
                : isNestedSubtask
                  ? "border-indigo-300 dark:border-indigo-700 hover:border-indigo-400 dark:hover:border-indigo-600"
                  : "border-border hover:border-foreground/20"
            } ${
              isSelected 
                ? "ring-2 ring-blue-500 border-blue-500" 
                : ""
            } cursor-pointer hover:shadow-sm`}
            role="article"
            tabIndex={0}
            aria-label={`Task: ${task.title}. Priority: ${task.priority}. Status: ${task.status}. ${task.userEmail ? `Assigned to ${task.userEmail}` : 'Unassigned'}. ${task.dueDate ? `Due ${format(new Date(task.dueDate), 'MMMM d, yyyy')}` : 'No due date'}`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleTaskCardClick();
              }
            }}
          >
            {/* ✨ SIMPLIFIED: Cleaner drag handle */}
            <div 
              {...listeners}
              className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center cursor-move opacity-0 group-hover:opacity-70 transition-opacity bg-muted rounded hover:opacity-100"
              title="Drag to move task"
              aria-label="Drag to reorder task"
            >
              <svg className="w-3 h-3 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
              </svg>
            </div>

            {/* ✨ SIMPLIFIED: Cleaner header */}
            <div className="flex items-center justify-between gap-2 text-xs font-mono text-muted-foreground mb-2">
              <div className="flex items-center gap-1.5">
                {isNestedSubtask && (
                  <span className="text-indigo-600 dark:text-indigo-400" title={`Subtask of ${parentTask?.title || 'parent task'}`}>
                    ↳
                  </span>
                )}
                <span className="px-1.5 py-0.5 bg-muted rounded text-xs font-medium text-foreground">
                  {project?.slug}-{task.number}
                </span>
                {isNestedSubtask && parentTask && (
                  <span className="text-indigo-600 dark:text-indigo-400 text-xs" title={`Parent: ${parentTask.title}`}>
                    ← {project?.slug}-{parentTask.number}
                  </span>
                )}
              </div>
              {isSelectionMode && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleTaskSelection(task.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
              )}
            </div>

            {/* ✨ SIMPLIFIED: Cleaner content section */}
            <div className="flex flex-col gap-2 mb-2">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground flex-1 truncate text-sm leading-snug">
                  {task.title}
                </h3>
                <div className="flex items-center gap-2">
                {task.subtasks && task.subtasks.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsExpanded(!isExpanded);
                    }}
                    className={`flex items-center text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 transition-all duration-200 px-1 py-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                      isExpanded ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''
                    }`}
                    title={`${task.subtasks.length} subtask${task.subtasks.length > 1 ? 's' : ''} - Click to ${isExpanded ? 'collapse' : 'expand'}`}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                    <span className={`text-xs ml-0.5 font-semibold px-1 py-0.5 rounded min-w-[16px] text-center ${
                      isExpanded 
                        ? 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200' 
                        : 'bg-zinc-200 dark:bg-zinc-700'
                    }`}>
                      {task.subtasks.length}
                    </span>
                  </button>
                )}

                  {/* 🛡️ RBAC: Team Lead Subtask Management Controls */}
                  <RequirePermission action="canCreateSubtasks">
                    {!isSubtask && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Open subtask creation modal
                        }}
                        className="flex items-center gap-1 text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-all duration-200 px-1.5 py-0.5 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-xs"
                        title="Create Subtask (Team Lead)"
                      >
                        <Plus className="w-3 h-3" />
                        <span className="font-medium">Subtask</span>
                      </button>
                    )}
                  </RequirePermission>
                </div>
              </div>
              
              {/* ✨ SIMPLIFIED: Cleaner progress bar */}
              {task.subtasks && task.subtasks.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-300"
                      style={{ 
                        width: task.subtaskProgress 
                          ? `${task.subtaskProgress.percentage}%` 
                          : '0%'
                      }}
                    />
                  </div>
                  <span className="font-medium text-muted-foreground tabular-nums text-xs">
                    {task.subtaskProgress?.completed || 0}/{task.subtaskProgress?.total || 0}
                  </span>
                </div>
              )}
            </div>

            {/* Expanded Subtasks Display */}
            {isExpanded && task.subtasks && task.subtasks.length > 0 && (
              <div className="mt-3 border-t border-zinc-200/50 dark:border-zinc-700/50 pt-3">
                <div className="space-y-2">
                  {task.subtasks.map((subtask, index) => (
                    <div
                      key={subtask.id}
                      className="flex items-center gap-2 p-2 bg-zinc-50/50 dark:bg-zinc-800/30 rounded-md border border-zinc-200/30 dark:border-zinc-700/30 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Navigate to subtask
                        if (project && workspace) {
                          navigate({
                            to: "/dashboard/workspace/$workspaceId/project/$projectId/task/$taskId",
                            params: {
                              workspaceId: workspace.id,
                              projectId: project.id,
                              taskId: subtask.id,
                            },
                          });
                        }
                      }}
                    >
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono min-w-[60px]">
                        {project?.slug}-{subtask.number}
                      </span>
                      <span className="text-xs text-zinc-700 dark:text-zinc-300 flex-1 truncate">
                        {subtask.title}
                      </span>
                      <div className="flex items-center gap-1">
                        {subtask.status === 'done' && (
                          <div className="w-2 h-2 bg-green-500 rounded-full" title="Completed" />
                        )}
                        {subtask.status === 'in_progress' && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full" title="In Progress" />
                        )}
                        {subtask.status === 'todo' && (
                          <div className="w-2 h-2 bg-zinc-400 rounded-full" title="To Do" />
                        )}
                        {subtask.priority && (
                          <span className={`text-xs px-1 py-0.5 rounded text-white ${
                            subtask.priority === 'urgent' ? 'bg-red-500' :
                            subtask.priority === 'high' ? 'bg-orange-500' :
                            subtask.priority === 'medium' ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}>
                            {subtask.priority.charAt(0).toUpperCase()}
                          </span>
                        )}
                        
                        {/* 🛡️ RBAC: Team Lead Subtask Controls */}
                        <RequirePermission action="canEditSubtasks">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();}}
                              className="text-blue-500 hover:text-blue-700 p-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              title="Edit Subtask (Team Lead)"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          </div>
                        </RequirePermission>
                        
                        <RequirePermission action="canDeleteSubtasks">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();}}
                              className="text-red-500 hover:text-red-700 p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                              title="Delete Subtask (Team Lead)"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </RequirePermission>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* @epic-1.2-dependencies: Enhanced dependency indicators with specific task names */}
            {(task.dependencies?.length > 0 || task.blockedBy?.length > 0) && (
              <div className="flex items-center gap-1 mb-2">
                {task.dependencies?.length > 0 && (
                  <div 
                    className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-md cursor-help"
                    title={`Blocks: ${task.dependencies.map(dep => dep.requiredTask?.title || 'Unknown task').join(', ')}`}
                  >
                    <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      Blocks {task.dependencies.length}
                    </span>
                  </div>
                )}
                {task.blockedBy?.length > 0 && (
                  <div 
                    className="flex items-center gap-1 px-2 py-1 bg-orange-50 dark:bg-orange-900/20 rounded-md cursor-help"
                    title={`Blocked by: ${task.blockedBy.map(dep => dep.dependentTask?.title || 'Unknown task').join(', ')}`}
                  >
                    <svg className="w-3 h-3 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                      Blocked by {task.blockedBy.length}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ✨ SIMPLIFIED: Cleaner metadata */}
            <div className="flex flex-wrap items-center gap-1.5 mt-auto text-xs">
              {task.userEmail ? (
                <div
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-muted"
                  title={task.userEmail}
                >
                  <UserIcon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground truncate max-w-[100px]">
                    {task.userEmail.split('@')[0]}
                  </span>
                </div>
              ) : (
                <div
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-muted"
                  title="Unassigned"
                >
                  <UserIcon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Unassigned
                  </span>
                </div>
              )}

              {task.dueDate && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-muted">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {format(new Date(task.dueDate), "MMM d")}
                  </span>
                </div>
              )}

              <span
                className={`px-2 py-0.5 rounded-full ${priorityColorsTaskCard[task.priority as keyof typeof priorityColorsTaskCard]}`}
              >
                <Flag className="w-3 h-3 inline-block mr-1" />
                {task.priority}
              </span>
            </div>

            {/* Note: Subtasks are now rendered as separate cards in the column */}
          </div>
        </ContextMenuTrigger>

        {project && workspace && (
          <TaskCardContextMenuContent
            task={task}
            taskCardContext={{
              projectId: project.id,
              worskpaceId: workspace.id,
            }}
          />
        )}
      </ContextMenu>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if relevant task properties actually changed
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.status === nextProps.task.status &&
    prevProps.task.title === nextProps.task.title &&
    prevProps.task.priority === nextProps.task.priority &&
    prevProps.task.userEmail === nextProps.task.userEmail &&
    prevProps.task.dueDate === nextProps.task.dueDate &&
    prevProps.task.position === nextProps.task.position &&
    prevProps.hierarchyLevel === nextProps.hierarchyLevel &&
    JSON.stringify(prevProps.task.subtasks) === JSON.stringify(nextProps.task.subtasks) &&
    JSON.stringify(prevProps.task.dependencies) === JSON.stringify(nextProps.task.dependencies) &&
    JSON.stringify(prevProps.task.blockedBy) === JSON.stringify(nextProps.task.blockedBy)
  );
});

export default TaskCard;
