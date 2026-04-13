import { useState } from 'react';
import { MeridianCard, MeridianCardHeader, MeridianCardTitle, MeridianCardContent } from '@/components/ui/meridian-card';
import { MeridianBadge, StatusBadge, PriorityBadge } from '@/components/ui/meridian-badge';
import { MeridianButton } from '@/components/ui/meridian-button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Plus, 
  Flag, 
  Clock, 
  Target,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Users
} from 'lucide-react';
import { cn } from '@/lib/cn';
import type { ThemeWithProgress, EnhancedTask } from '@/types/backlog';

interface ThemeCardProps {
  theme: ThemeWithProgress;
  tasks: EnhancedTask[];
  isSelected?: boolean;
  onClick?: () => void;
  onEdit?: (theme: ThemeWithProgress) => void;
  onDelete?: (themeId: string) => void;
  onAddTask?: (themeId: string) => void;
  variant?: 'default' | 'compact' | 'detailed';
  showActions?: boolean;
  persona?: 'pm' | 'tl' | 'exec' | 'dev' | 'design';
}

// @epic-1.1-subtasks @persona-sarah - PM needs visual theme management
export function ThemeCard({
  theme,
  tasks,
  isSelected = false,
  onClick,
  onEdit,
  onDelete,
  onAddTask,
  variant = 'default',
  showActions = true,
  persona = 'pm'
}: ThemeCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(theme);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(theme.id);
  };

  const handleAddTask = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddTask?.(theme.id);
  };

  const getThemePriority = () => {
    const highPriorityTasks = tasks.filter(task => task.priority === 'high' || task.priority === 'urgent').length;
    if (highPriorityTasks > 0) return 'high';
    
    const mediumPriorityTasks = tasks.filter(task => task.priority === 'medium').length;
    if (mediumPriorityTasks > 0) return 'medium';
    
    return 'low';
  };

  const getThemeStatus = () => {
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    if (completedTasks === tasks.length && tasks.length > 0) return 'completed';
    if (completedTasks > 0) return 'active';
    if (tasks.length === 0) return 'draft';
    return 'pending';
  };

  const progressValue = tasks.length > 0 ? (theme.progress || 0) : 0;
  const taskCount = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;

  return (
    <MeridianCard
      variant={isSelected ? "primary" : "elevated"}
      size="md"
      interactive={!!onClick}
      persona={persona}
      className={cn(
        "transition-all duration-200 cursor-pointer group",
        isSelected && "ring-2 ring-meridian-primary ring-offset-2",
        variant === 'compact' && "p-4",
        variant === 'detailed' && "p-8"
      )}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <MeridianCardHeader variant="split">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <MeridianCardTitle className="text-h5 truncate">
              {theme.title}
            </MeridianCardTitle>
            
            <div className="flex items-center gap-2">
              <StatusBadge status={getThemeStatus()} size="xs" />
              <PriorityBadge priority={getThemePriority()} size="xs" />
            </div>
          </div>

          {theme.description && variant !== 'compact' && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {theme.description}
            </p>
          )}
        </div>

        {showActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <MeridianButton
                variant="ghost"
                size="icon-sm"
                className={cn(
                  "opacity-0 group-hover:opacity-100 transition-opacity",
                  isHovered && "opacity-100"
                )}
              >
                <MoreHorizontal className="h-4 w-4" />
              </MeridianButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Theme
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAddTask}>
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-meridian-error">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Theme
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </MeridianCardHeader>

      <MeridianCardContent>
        {/* Progress Section */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-foreground">
              {Math.round(progressValue)}%
            </span>
          </div>
          <Progress 
            value={progressValue} 
            className="h-2"
          />
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-meridian-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Tasks</p>
              <p className="text-sm font-medium">{taskCount}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-meridian-success" />
            <div>
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="text-sm font-medium">{completedTasks}</p>
            </div>
          </div>
        </div>

        {/* Due Date and Team */}
        {variant === 'detailed' && (
          <div className="space-y-3">
            {theme.dueDate && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Due:</span>
                <span className="font-medium">
                  {new Date(theme.dueDate).toLocaleDateString()}
                </span>
              </div>
            )}

            {theme.assignees && theme.assignees.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div className="flex -space-x-1">
                  {theme.assignees.slice(0, 3).map((assignee, index) => (
                    <Avatar key={index} className="h-6 w-6 border-2 border-background">
                      <AvatarFallback className="text-xs">
                        {assignee.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {theme.assignees.length > 3 && (
                    <div className="h-6 w-6 rounded-full bg-meridian-neutral-100 border-2 border-background flex items-center justify-center">
                      <span className="text-xs text-meridian-neutral-600">
                        +{theme.assignees.length - 3}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {variant !== 'compact' && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-border">
            <MeridianButton
              variant="outline"
              size="sm"
              onClick={handleAddTask}
              leftIcon={<Plus className="h-4 w-4" />}
              className="flex-1"
            >
              Add Task
            </MeridianButton>
            <MeridianButton
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              leftIcon={<Edit className="h-4 w-4" />}
            >
              Edit
            </MeridianButton>
          </div>
        )}
      </MeridianCardContent>
    </MeridianCard>
  );
} 