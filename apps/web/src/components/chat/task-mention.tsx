// Task Mention Component for Chat Messages
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ExternalLink,
  Calendar,
  User,
  Clock,
  AlertCircle,
  CheckCircle,
  Circle,
  Play,
  MoreHorizontal,
  MessageSquare,
  Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { TaskMention, useTaskIntegration } from '@/hooks/use-task-integration'
import { useRealTimeNotifications } from '@/hooks/use-real-time-notifications'
import useWorkspaceStore from '@/store/workspace'

interface TaskMentionProps {
  taskId: string
  messageId: string
  channelId: string
  className?: string
  compact?: boolean
}

export function TaskMentionComponent({ taskId, messageId, channelId, className, compact = false }: TaskMentionProps) {
  const { workspace } = useWorkspaceStore()
  const { getTaskMentions } = useTaskIntegration()
  const notifications = useRealTimeNotifications()
  
  const [taskData, setTaskData] = useState<TaskMention | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isHovered, setIsHovered] = useState(false)

  // Fetch task data
  useEffect(() => {
    const fetchTaskData = async () => {
      setIsLoading(true)
      try {
        const tasks = await getTaskMentions([taskId])
        if (tasks.length > 0) {
          setTaskData(tasks[0])
        }
      } catch (error) {
        console.error('Failed to fetch task data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTaskData()
  }, [taskId, getTaskMentions])

  if (isLoading) {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 text-gray-500 text-sm animate-pulse",
        className
      )}>
        <Circle className="w-3 h-3" />
        #{taskId}
      </span>
    )
  }

  if (!taskData) {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded bg-red-50 text-red-600 text-sm",
        className
      )}>
        <AlertCircle className="w-3 h-3" />
        #{taskId} (not found)
      </span>
    )
  }

  const getStatusConfig = (status: TaskMention['status']) => {
    switch (status) {
      case 'todo':
        return {
          icon: Circle,
          color: 'text-gray-500',
          bg: 'bg-gray-100',
          label: 'To Do',
        }
      case 'in_progress':
        return {
          icon: Play,
          color: 'text-blue-500',
          bg: 'bg-blue-100',
          label: 'In Progress',
        }
      case 'review':
        return {
          icon: Clock,
          color: 'text-orange-500',
          bg: 'bg-orange-100',
          label: 'Review',
        }
      case 'done':
        return {
          icon: CheckCircle,
          color: 'text-green-500',
          bg: 'bg-green-100',
          label: 'Done',
        }
      default:
        return {
          icon: Circle,
          color: 'text-gray-500',
          bg: 'bg-gray-100',
          label: 'Unknown',
        }
    }
  }

  const getPriorityColor = (priority: TaskMention['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'border-red-400 bg-red-50'
      case 'high':
        return 'border-orange-400 bg-orange-50'
      case 'medium':
        return 'border-blue-400 bg-blue-50'
      case 'low':
        return 'border-gray-400 bg-gray-50'
      default:
        return 'border-gray-400 bg-gray-50'
    }
  }

  const statusConfig = getStatusConfig(taskData.status)
  const StatusIcon = statusConfig.icon

  const handleTaskClick = () => {
    if (workspace) {
      window.open(
        `/dashboard/workspace/${workspace.id}/project/${taskData.projectId}/task/${taskData.taskId}`,
        '_blank'
      )
    }
  }

  const handleFollowTask = () => {
    notifications.createNotification({
      type: 'task',
      title: 'Following Task',
      message: `You'll receive updates for "${taskData.taskTitle}"`,
      priority: 'low',
      actionUrl: `/dashboard/workspace/${workspace?.id}/project/${taskData.projectId}/task/${taskData.taskId}`,
      sourceId: taskData.taskId,
      sourceType: 'task_follow',
    })
  }

  if (compact) {
    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          <button
            onClick={handleTaskClick}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium hover:bg-opacity-80 transition-colors",
              getPriorityColor(taskData.priority),
              "border cursor-pointer",
              className
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <StatusIcon className={cn("w-3 h-3", statusConfig.color)} />
            <span className="text-gray-900">#{taskData.taskId}</span>
            {isHovered && <ExternalLink className="w-3 h-3 text-gray-500" />}
          </button>
        </HoverCardTrigger>
        <HoverCardContent className="w-80" side="top">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-gray-900 line-clamp-2">
                  {taskData.taskTitle}
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  {taskData.projectName}
                </p>
              </div>
              <Badge variant="secondary" className={cn("text-xs", statusConfig.bg)}>
                {statusConfig.label}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-2">
                {taskData.assignee && (
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{taskData.assignee.name}</span>
                  </div>
                )}
                {taskData.dueDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDistanceToNow(new Date(taskData.dueDate), { addSuffix: true })}</span>
                  </div>
                )}
              </div>
              <Badge variant="outline" className="text-xs">
                {taskData.priority}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 pt-2 border-t">
              <Button size="sm" onClick={handleTaskClick} className="flex-1">
                <ExternalLink className="w-3 h-3 mr-1" />
                View Task
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleFollowTask}>
                    <Bell className="w-4 h-4 mr-2" />
                    Follow Task
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    // Copy task link
                    const taskUrl = `${window.location.origin}/dashboard/workspace/${workspace?.id}/project/${taskData.projectId}/task/${taskData.taskId}`
                    navigator.clipboard.writeText(taskUrl)
                  }}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Copy Link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    )
  }

  // Full card view for expanded mentions
  return (
    <div className={cn(
      "border rounded-lg p-3 space-y-3 transition-all hover:shadow-sm",
      getPriorityColor(taskData.priority),
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-gray-900 line-clamp-2">
            {taskData.taskTitle}
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            {taskData.projectName} • #{taskData.taskId}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={cn("text-xs", statusConfig.bg, statusConfig.color)}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusConfig.label}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {taskData.priority}
          </Badge>
        </div>
      </div>
      
      {(taskData.assignee || taskData.dueDate) && (
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {taskData.assignee && (
            <div className="flex items-center gap-2">
              <Avatar className="w-4 h-4">
                <AvatarFallback className="text-xs">
                  {taskData.assignee.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span>Assigned to {taskData.assignee.name}</span>
            </div>
          )}
          {taskData.dueDate && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Due {formatDistanceToNow(new Date(taskData.dueDate), { addSuffix: true })}</span>
            </div>
          )}
        </div>
      )}
      
      <div className="flex items-center gap-2 pt-2 border-t">
        <Button size="sm" onClick={handleTaskClick} className="flex-1">
          <ExternalLink className="w-3 h-3 mr-1" />
          View Task
        </Button>
        <Button variant="outline" size="sm" onClick={handleFollowTask}>
          <Bell className="w-3 h-3 mr-1" />
          Follow
        </Button>
      </div>
    </div>
  )
}

// Utility function to parse and render task mentions in message content
export function parseMessageWithTaskMentions(
  content: string,
  messageId: string,
  channelId: string
): React.ReactNode {
  // Task mention patterns
  const taskPattern = /#(TASK-\d+|\d+)/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match

  while ((match = taskPattern.exec(content)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index))
    }

    // Add the task mention component
    const taskId = match[1].replace('TASK-', '')
    parts.push(
      <TaskMentionComponent
        key={`task-${taskId}-${match.index}`}
        taskId={taskId}
        messageId={messageId}
        channelId={channelId}
        compact={true}
        className="mx-1"
      />
    )

    lastIndex = taskPattern.lastIndex
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex))
  }

  return parts.length > 1 ? <>{parts}</> : content
}