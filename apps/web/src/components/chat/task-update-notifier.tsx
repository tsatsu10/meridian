// Task Update Notifier for Chat Messages
import React, { useEffect, useState } from 'react'
import { API_BASE_URL, API_URL } from '@/constants/urls';
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Bell,
  CheckCircle,
  Clock,
  User,
  ArrowRight,
  ExternalLink,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { TaskUpdateEvent, useTaskIntegration } from '@/hooks/use-task-integration'
import { useRealTimeNotifications } from '@/hooks/use-real-time-notifications'
import useWorkspaceStore from '@/store/workspace'

interface TaskUpdateNotifierProps {
  taskIds: string[]
  messageId: string
  channelId: string
  className?: string
}

interface TaskUpdate {
  id: string
  taskId: string
  taskTitle: string
  changeType: 'status' | 'assignee' | 'priority' | 'due_date' | 'comment'
  oldValue: any
  newValue: any
  updatedBy: {
    id: string
    name: string
    email: string
  }
  timestamp: Date
  projectId: string
}

export function TaskUpdateNotifier({ 
  taskIds, 
  messageId, 
  channelId, 
  className 
}: TaskUpdateNotifierProps) {
  const { workspace } = useWorkspaceStore()
  const { handleTaskUpdate } = useTaskIntegration()
  const notifications = useRealTimeNotifications()
  
  const [taskUpdates, setTaskUpdates] = useState<TaskUpdate[]>([])
  const [isVisible, setIsVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Fetch recent task updates for mentioned tasks
  useEffect(() => {
    if (taskIds.length === 0) return

    const fetchTaskUpdates = async () => {
      setIsLoading(true)
      try {
        // Simulate API call to fetch recent task updates for mentioned tasks
        const response = await fetch(`${API_BASE_URL}/workspaces/${workspace?.id}/tasks/updates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            taskIds,
            since: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
            limit: 10
          })
        })

        if (response.ok) {
          const updates = await response.json()
          setTaskUpdates(updates)
          
          // Show the notifier if there are recent updates
          if (updates.length > 0) {
            setIsVisible(true)
            
            // Auto-hide after 30 seconds
            setTimeout(() => {
              setIsVisible(false)
            }, 30000)
          }
        }
      } catch (error) {
        console.error('Failed to fetch task updates:', error)
        
        // Create mock updates for demo purposes
        const mockUpdates: TaskUpdate[] = taskIds.slice(0, 2).map((taskId, index) => ({
          id: `update-${taskId}-${index}`,
          taskId,
          taskTitle: `Task #${taskId} - Sample Task Title`,
          changeType: index === 0 ? 'status' : 'assignee',
          oldValue: index === 0 ? 'in_progress' : null,
          newValue: index === 0 ? 'done' : 'sarah-johnson',
          updatedBy: {
            id: 'user-123',
            name: 'Sarah Johnson',
            email: 'sarah@example.com'
          },
          timestamp: new Date(Date.now() - Math.random() * 3600000), // Random time in last hour
          projectId: 'project-1'
        }))
        
        setTaskUpdates(mockUpdates)
        if (mockUpdates.length > 0) {
          setIsVisible(true)
          setTimeout(() => setIsVisible(false), 30000)
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchTaskUpdates()
  }, [taskIds, workspace?.id])

  const getUpdateIcon = (changeType: TaskUpdate['changeType']) => {
    switch (changeType) {
      case 'status':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'assignee':
        return <User className="w-4 h-4 text-blue-500" />
      case 'priority':
        return <Bell className="w-4 h-4 text-orange-500" />
      case 'due_date':
        return <Clock className="w-4 h-4 text-purple-500" />
      case 'comment':
        return <Bell className="w-4 h-4 text-gray-500" />
      default:
        return <Bell className="w-4 h-4 text-gray-500" />
    }
  }

  const getUpdateMessage = (update: TaskUpdate) => {
    switch (update.changeType) {
      case 'status':
        return `moved from ${update.oldValue} to ${update.newValue}`
      case 'assignee':
        return update.oldValue 
          ? `reassigned from ${update.oldValue} to ${update.newValue}`
          : `assigned to ${update.newValue}`
      case 'priority':
        return `priority changed from ${update.oldValue} to ${update.newValue}`
      case 'due_date':
        return `due date updated to ${new Date(update.newValue).toLocaleDateString()}`
      case 'comment':
        return 'added a comment'
      default:
        return 'updated'
    }
  }

  const handleViewTask = (update: TaskUpdate) => {
    if (workspace) {
      window.open(
        `/dashboard/workspace/${workspace.id}/project/${update.projectId}/task/${update.taskId}`,
        '_blank'
      )
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
  }

  const handleNotifyMeOfUpdates = (taskId: string) => {
    notifications.createNotification({
      type: 'task',
      title: 'Following Task Updates',
      message: `You'll receive notifications for updates to Task #${taskId}`,
      priority: 'low',
      actionUrl: `/dashboard/workspace/${workspace?.id}/project/1/task/${taskId}`,
      sourceId: taskId,
      sourceType: 'task_follow',
    })
  }

  if (!isVisible || taskUpdates.length === 0) {
    return null
  }

  return (
    <div className={cn(
      "mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-3",
      "animate-in slide-in-from-top-2 duration-300",
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-blue-900">
          <Bell className="w-4 h-4" />
          Recent Task Updates
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-100"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="space-y-2">
        {taskUpdates.map((update) => (
          <div
            key={update.id}
            className="flex items-start gap-3 p-2 bg-white rounded border border-blue-100"
          >
            <div className="flex-shrink-0 mt-0.5">
              {getUpdateIcon(update.changeType)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-gray-900 truncate">
                  #{update.taskId}
                </span>
                <ArrowRight className="w-3 h-3 text-gray-400" />
                <span className="text-gray-600">
                  {getUpdateMessage(update)}
                </span>
              </div>
              
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                <Avatar className="w-4 h-4">
                  <AvatarImage src={`https://avatar.vercel.sh/${update.updatedBy.email}`} />
                  <AvatarFallback>
                    {update.updatedBy.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>{update.updatedBy.name}</span>
                <span>•</span>
                <span>{formatDistanceToNow(update.timestamp, { addSuffix: true })}</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleViewTask(update)}
                className="h-6 px-2 text-xs text-blue-600 hover:bg-blue-100"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                View
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNotifyMeOfUpdates(update.taskId)}
                className="h-6 px-2 text-xs text-blue-600 hover:bg-blue-100"
                title="Get notified of future updates"
              >
                <Bell className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {taskUpdates.length > 0 && (
        <div className="pt-2 border-t border-blue-200">
          <p className="text-xs text-blue-600">
            These tasks were recently updated after being mentioned in this chat.
          </p>
        </div>
      )}
    </div>
  )
}