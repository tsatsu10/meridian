import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AnimatedCircularProgressBar } from "@/components/magicui/animated-circular-progress-bar";
import { BorderBeam } from "@/components/magicui/border-beam";
import { TaskEditorsIndicator } from "./real-time-task-editor";
import { Link } from "@tanstack/react-router";
import { 
  X, 
  Share2, 
  MoreHorizontal, 
  Clock, 
  Users, 
  Flag, 
  Calendar,
  GitBranch,
  Zap,
  Eye,
  Copy,
  BookOpen,
  MessageSquare,
  Bell,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import type Task from "@/types/task";

interface EnhancedTaskHeaderProps {
  task: Task;
  project: any;
  workspaceId: string;
  projectId: string;
  taskId: string;
  isSaving: boolean;
  onQuickAction: (action: string) => void;
}

export function EnhancedTaskHeader({
  task,
  project,
  workspaceId,
  projectId,
  taskId,
  isSaving,
  onQuickAction
}: EnhancedTaskHeaderProps) {
  const getTaskProgress = () => {
    if (!task) return 0;
    if (task.status === 'done') return 100;
    if (task.status === 'in_progress') return 60;
    if (task.status === 'review') return 80;
    return 20;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'review': return 'bg-yellow-500';
      case 'todo': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500 border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800';
      case 'medium': return 'text-yellow-500 border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800';
      case 'low': return 'text-green-500 border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800';
      default: return 'text-gray-500 border-gray-200 bg-gray-50 dark:bg-gray-950 dark:border-gray-800';
    }
  };

  const quickActions = [
    { id: 'copy-link', icon: Copy, label: 'Copy Link', shortcut: '⌘K' },
    { id: 'start-timer', icon: Clock, label: 'Start Timer', shortcut: '⌘T' },
    { id: 'assign-me', icon: Users, label: 'Assign to Me', shortcut: '⌘A' },
    { id: 'add-comment', icon: MessageSquare, label: 'Add Comment', shortcut: '⌘/' },
    { id: 'watch', icon: Eye, label: 'Watch Task', shortcut: '⌘W' },
    { id: 'bookmark', icon: Star, label: 'Bookmark', shortcut: '⌘B' },
  ];

  return (
    <div className="relative">
      <BorderBeam size={300} duration={15} delay={0} />
      
      {/* Primary Header */}
      <header className="sticky top-0 z-10 bg-white/95 dark:bg-card/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-6 h-16">
          {/* Left Section - Navigation & Task Identity */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/dashboard/workspace/$workspaceId/project/$projectId/board"
                    params={{ workspaceId, projectId }}
                    className="p-2 rounded-md hover:bg-secondary dark:hover:bg-secondary-hover transition-colors"
                  >
                    <X className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Back to Board (Esc)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Enhanced Status Indicator */}
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 shadow-sm",
                  getStatusColor(task?.status || 'todo')
                )} />
                <Badge variant="secondary" className="text-xs font-mono">
                  {project?.slug}-{task?.number}
                </Badge>
              </div>
              
              {/* Task Title with Enhanced Typography */}
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {task?.title || 'Untitled Task'}
                </h1>
              </div>
            </div>
          </div>

          {/* Right Section - Metrics & Actions */}
          <div className="flex items-center gap-3">
            {/* Real-time Collaboration */}
            <TaskEditorsIndicator taskId={taskId} />
            
            {/* Progress Indicator - Executive View */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
                             <AnimatedCircularProgressBar
                 max={100}
                 min={0}
                 value={getTaskProgress()}
                 className="w-5 h-5"
               />
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {getTaskProgress()}%
              </span>
            </div>

            {/* Priority Badge */}
            <Badge className={cn("text-xs font-medium", getPriorityColor(task?.priority || 'medium'))}>
              <Flag className="w-3 h-3 mr-1" />
              {task?.priority || 'medium'}
            </Badge>

            {/* Due Date Indicator */}
            {task?.dueDate && (
              <Badge variant="outline" className="text-xs">
                <Calendar className="w-3 h-3 mr-1" />
                {new Date(task.dueDate).toLocaleDateString()}
              </Badge>
            )}

            {/* Saving Indicator */}
            {isSaving && (
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <div className="w-1 h-1 bg-zinc-400 rounded-full animate-pulse" />
                Saving...
              </div>
            )}

            <Separator orientation="vertical" className="h-6" />

            {/* Quick Actions */}
            <div className="flex items-center gap-1">
              {quickActions.slice(0, 3).map((action) => (
                <TooltipProvider key={action.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onQuickAction(action.id)}
                        className="h-8 w-8 p-0"
                      >
                        <action.icon className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{action.label} {action.shortcut}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
              
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Share2 className="w-4 h-4" />
              </Button>
              
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Secondary Header - Context & Quick Stats */}
        <div className="flex items-center justify-between px-6 py-2 bg-zinc-50/50 dark:bg-zinc-900/20 border-b border-border/50">
          <div className="flex items-center gap-4 text-xs text-zinc-600 dark:text-zinc-400">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{task?.userEmail || 'Unassigned'}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <GitBranch className="w-3 h-3" />
              <span>{task?.subtasks?.length || 0} subtasks</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{task?.timeTracked || '0h'} tracked</span>
            </div>
            
            <div className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              <span>{task?.comments?.length || 0} comments</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span>Created {new Date(task?.createdAt || Date.now()).toLocaleDateString()}</span>
            <Separator orientation="vertical" className="h-3" />
            <span>Updated 2h ago</span>
          </div>
        </div>
      </header>
    </div>
  );
} 