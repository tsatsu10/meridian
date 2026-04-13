// Enhanced Task Integration Hook for Chat-Project Integration
import { useState, useCallback } from 'react'
import { toast } from '@/lib/toast';
import { useAuth } from '@/components/providers/unified-context-provider'
import useWorkspaceStore from '@/store/workspace'
import { useRealTimeNotifications } from './use-real-time-notifications'
import { API_BASE_URL, API_URL } from '@/constants/urls'

export interface TaskCreationData {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assigneeId?: string
  dueDate?: string
  projectId?: string
  channelId?: string
  sourceMessageId?: string
  tags?: string[]
  estimatedHours?: number
}

export interface TaskMention {
  taskId: string
  taskTitle: string
  projectId: string
  projectName: string
  status: 'todo' | 'in_progress' | 'review' | 'done'
  assignee?: {
    id: string
    name: string
    email: string
  }
  dueDate?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
}

export interface TaskUpdateEvent {
  taskId: string
  taskTitle: string
  changeType: 'status' | 'assignee' | 'priority' | 'due_date' | 'comment'
  oldValue?: any
  newValue?: any
  updatedBy: {
    id: string
    name: string
    email: string
  }
  timestamp: Date
  projectId: string
  channelId?: string
}

export function useTaskIntegration() {
  const { user } = useAuth()
  const { workspace } = useWorkspaceStore()
  const notifications = useRealTimeNotifications()
  
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [isAssigningTask, setIsAssigningTask] = useState(false)

  // Create task from chat workflow suggestion
  const createTaskFromChat = useCallback(async (taskData: TaskCreationData): Promise<string | null> => {
    if (!user || !workspace) {
      toast.error('Authentication required')
      return null
    }

    setIsCreatingTask(true)
    
    try {
      // API call to create task
      const response = await fetch(`${API_BASE_URL}/workspaces/${workspace.id}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...taskData,
          workspaceId: workspace.id,
          createdBy: user.id,
          createdAt: new Date().toISOString(),
          source: 'chat',
          metadata: {
            channelId: taskData.channelId,
            sourceMessageId: taskData.sourceMessageId,
          }
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to create task: ${response.statusText}`)
      }

      const createdTask = await response.json()
      
      // Create success notification
      notifications.createNotification({
        type: 'task',
        title: 'Task Created Successfully',
        message: `"${taskData.title}" has been added to your project`,
        priority: 'medium',
        actionUrl: `/dashboard/workspace/${workspace.id}/project/${taskData.projectId}/task/${createdTask.id}`,
        sourceId: createdTask.id,
        sourceType: 'task',
      })

      // If assigned to someone else, notify them
      if (taskData.assigneeId && taskData.assigneeId !== user.id) {
        notifications.createNotification({
          type: 'task',
          title: 'New Task Assigned',
          message: `${user.name} assigned you a task: "${taskData.title}"`,
          priority: 'high',
          actionUrl: `/dashboard/workspace/${workspace.id}/project/${taskData.projectId}/task/${createdTask.id}`,
          sourceId: createdTask.id,
          sourceType: 'task_assignment',
        })
      }

      toast.success('Task created successfully!')
      return createdTask.id

    } catch (error) {
      console.error('Failed to create task:', error)
      toast.error('Failed to create task. Please try again.')
      return null
    } finally {
      setIsCreatingTask(false)
    }
  }, [user, workspace, notifications])

  // Parse task mentions from message content
  const parseTaskMentions = useCallback((content: string): string[] => {
    // Match patterns like #TASK-123, TASK-456, or @task:789
    const taskPatterns = [
      /#TASK-(\d+)/gi,
      /TASK-(\d+)/gi,
      /@task:(\d+)/gi,
      /#(\d+)/gi, // Simple number references
    ]
    
    const taskIds: string[] = []
    
    taskPatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(content)) !== null) {
        const taskId = match[1]
        if (!taskIds.includes(taskId)) {
          taskIds.push(taskId)
        }
      }
    })
    
    return taskIds
  }, [])

  // Get task information for mentions
  const getTaskMentions = useCallback(async (taskIds: string[]): Promise<TaskMention[]> => {
    if (!workspace || taskIds.length === 0) return []

    try {
      const response = await fetch(`${API_BASE_URL}/workspaces/${workspace.id}/tasks/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskIds }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch task information')
      }

      const tasks = await response.json()
      return tasks.map((task: any) => ({
        taskId: task.id,
        taskTitle: task.title,
        projectId: task.projectId,
        projectName: task.project?.name || 'Unknown Project',
        status: task.status,
        assignee: task.assignee,
        dueDate: task.dueDate,
        priority: task.priority,
      }))
    } catch (error) {
      console.error('Failed to fetch task mentions:', error)
      return []
    }
  }, [workspace])

  // Assign task from chat message
  const assignTaskFromChat = useCallback(async (
    taskId: string, 
    assigneeId: string, 
    messageId: string,
    channelId: string
  ): Promise<boolean> => {
    if (!user || !workspace) {
      toast.error('Authentication required')
      return false
    }

    setIsAssigningTask(true)

    try {
      const response = await fetch(`${API_BASE_URL}/workspaces/${workspace.id}/tasks/${taskId}/assign`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assigneeId,
          assignedBy: user.id,
          assignedAt: new Date().toISOString(),
          source: 'chat',
          metadata: {
            messageId,
            channelId,
          }
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to assign task')
      }

      const updatedTask = await response.json()

      // Notify the assignee
      notifications.createNotification({
        type: 'task',
        title: 'Task Assigned',
        message: `${user.name} assigned you: "${updatedTask.title}"`,
        priority: 'high',
        actionUrl: `/dashboard/workspace/${workspace.id}/project/${updatedTask.projectId}/task/${taskId}`,
        sourceId: taskId,
        sourceType: 'task_assignment',
      })

      toast.success('Task assigned successfully!')
      return true

    } catch (error) {
      console.error('Failed to assign task:', error)
      toast.error('Failed to assign task. Please try again.')
      return false
    } finally {
      setIsAssigningTask(false)
    }
  }, [user, workspace, notifications])

  // Handle task update notifications from external sources
  const handleTaskUpdate = useCallback((update: TaskUpdateEvent) => {
    if (!user || update.updatedBy.id === user.id) return // Don't notify self

    let notificationTitle = ''
    let notificationMessage = ''
    let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'

    switch (update.changeType) {
      case 'status':
        notificationTitle = 'Task Status Updated'
        notificationMessage = `"${update.taskTitle}" moved to ${update.newValue}`
        priority = update.newValue === 'done' ? 'high' : 'medium'
        break
      case 'assignee':
        if (update.newValue === user.id) {
          notificationTitle = 'Task Assigned to You'
          notificationMessage = `${update.updatedBy.name} assigned you: "${update.taskTitle}"`
          priority = 'high'
        } else {
          notificationTitle = 'Task Reassigned'
          notificationMessage = `"${update.taskTitle}" assigned to someone else`
          priority = 'low'
        }
        break
      case 'priority':
        notificationTitle = 'Task Priority Changed'
        notificationMessage = `"${update.taskTitle}" priority changed to ${update.newValue}`
        priority = update.newValue as any
        break
      case 'due_date':
        notificationTitle = 'Task Due Date Updated'
        notificationMessage = `"${update.taskTitle}" due date changed to ${new Date(update.newValue).toLocaleDateString()}`
        priority = 'medium'
        break
      case 'comment':
        notificationTitle = 'New Comment on Task'
        notificationMessage = `${update.updatedBy.name} commented on "${update.taskTitle}"`
        priority = 'low'
        break
    }

    notifications.createNotification({
      type: 'task',
      title: notificationTitle,
      message: notificationMessage,
      priority,
      actionUrl: `/dashboard/workspace/${workspace?.id}/project/${update.projectId}/task/${update.taskId}`,
      sourceId: update.taskId,
      sourceType: 'task_update',
    })
  }, [user, workspace, notifications])

  // Generate task creation suggestions from message
  const generateTaskSuggestion = useCallback((message: string, authorId: string): TaskCreationData | null => {
    // Enhanced AI-like task detection
    const taskIndicators = [
      /(?:need to|should|must|have to|let's|we should)\s+([^.!?]+)/gi,
      /(?:todo|to-do|task):\s*([^.!?]+)/gi,
      /(?:action item|action):\s*([^.!?]+)/gi,
      /(?:please|can you|could you)\s+([^.!?]+)/gi,
      /(?:remember to|don't forget to)\s+([^.!?]+)/gi,
    ]

    for (const pattern of taskIndicators) {
      const match = pattern.exec(message)
      if (match && match[1].trim().length > 5) {
        const extractedText = match[1].trim()
        
        // Determine priority based on keywords
        let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
        if (/urgent|asap|immediately|critical|emergency/i.test(message)) {
          priority = 'urgent'
        } else if (/important|high|priority/i.test(message)) {
          priority = 'high'
        } else if (/low|minor|when you can/i.test(message)) {
          priority = 'low'
        }

        // Extract due date hints
        let dueDate: string | undefined
        const dueDatePatterns = [
          /(?:by|due|before)\s+(tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
          /(?:by|due|before)\s+(\d{1,2}\/\d{1,2}|\d{1,2}-\d{1,2})/gi,
        ]
        
        for (const datePattern of dueDatePatterns) {
          const dateMatch = datePattern.exec(message)
          if (dateMatch) {
            // Simple date parsing - in production, use a proper date library
            const dateStr = dateMatch[1].toLowerCase()
            const today = new Date()
            
            if (dateStr === 'today') {
              dueDate = today.toISOString().split('T')[0]
            } else if (dateStr === 'tomorrow') {
              const tomorrow = new Date(today)
              tomorrow.setDate(tomorrow.getDate() + 1)
              dueDate = tomorrow.toISOString().split('T')[0]
            }
            // Add more sophisticated date parsing as needed
            break
          }
        }

        return {
          title: extractedText.charAt(0).toUpperCase() + extractedText.slice(1),
          description: `Created from chat message: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`,
          priority,
          dueDate,
          tags: ['chat-generated'],
        }
      }
    }

    return null
  }, [])

  return {
    // State
    isCreatingTask,
    isAssigningTask,
    
    // Actions
    createTaskFromChat,
    assignTaskFromChat,
    parseTaskMentions,
    getTaskMentions,
    handleTaskUpdate,
    generateTaskSuggestion,
  }
}