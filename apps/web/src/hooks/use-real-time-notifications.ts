// Real-time Notification System
import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from '@/lib/toast';
import { useAuth } from '@/components/providers/unified-context-provider'
import useWorkspaceStore from '@/store/workspace'
import { useUnifiedWebSocketSingleton } from './useUnifiedWebSocketSingleton'

export interface NotificationData {
  id: string
  type: 'message' | 'task' | 'mention' | 'system' | 'workflow' | 'file'
  title: string
  message: string
  avatar?: string
  timestamp: number
  read: boolean
  priority: 'low' | 'medium' | 'high' | 'urgent'
  actionUrl?: string
  sourceId?: string // ID of source (message, task, etc.)
  sourceType?: string
  metadata?: Record<string, any>
}

export interface NotificationPreferences {
  soundEnabled: boolean
  desktopEnabled: boolean
  mentions: boolean
  directMessages: boolean
  taskUpdates: boolean
  workflowTriggers: boolean
  systemAlerts: boolean
  fileSharing: boolean
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  soundEnabled: true,
  desktopEnabled: true,
  mentions: true,
  directMessages: true,
  taskUpdates: true,
  workflowTriggers: true,
  systemAlerts: true,
  fileSharing: true,
}

export function useRealTimeNotifications() {
  const { user } = useAuth()
  const { workspace } = useWorkspaceStore()
  
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES)
  const [isLoading, setIsLoading] = useState(false)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const permissionRef = useRef<NotificationPermission>('default')

  // Initialize notification sound
  useEffect(() => {
    if (preferences.soundEnabled) {
      try {
        audioRef.current = new Audio('/notification-sound.mp3')
        audioRef.current.volume = 0.5
        // Preload the audio to check if it exists
        audioRef.current.load()
      } catch (error) {
        console.warn('Failed to initialize notification sound:', error)
        audioRef.current = null
      }
    }
  }, [preferences.soundEnabled])

  // Request desktop notification permissions
  useEffect(() => {
    if ('Notification' in window && preferences.desktopEnabled) {
      Notification.requestPermission().then(permission => {
        permissionRef.current = permission
      })
    }
  }, [preferences.desktopEnabled])

  // WebSocket integration for real-time notifications using singleton
  // Only connect after authentication is complete (user is not undefined)
  const websocket = useUnifiedWebSocketSingleton({
    userEmail: user?.email || '',
    workspaceId: workspace?.id || '',
    enabled: user !== undefined && !!user?.email && !!workspace?.id, // Wait for auth to complete
    onMessage: (wsMessage) => {
      if (wsMessage.type === 'notification' && wsMessage.data) {
        handleNewNotification(wsMessage.data)
      }
    },
    onError: (error) => {
      console.error('Notification WebSocket error:', error)
    },
  })

  // Handle new notifications
  const handleNewNotification = useCallback((notificationData: NotificationData) => {
    // Check if notification should be shown based on preferences
    if (!shouldShowNotification(notificationData)) {
      return
    }

    // Add to notifications list
    setNotifications(prev => [notificationData, ...prev].slice(0, 50)) // Keep last 50
    setUnreadCount(prev => prev + 1)

    // Show toast notification
    showToastNotification(notificationData)

    // Play sound if enabled
    if (preferences.soundEnabled && audioRef.current) {
      audioRef.current.play().catch((error) => {
        // Only log if it's not a NotSupportedError (missing audio file)
        if (error.name !== 'NotSupportedError') {
          console.error('Failed to play notification sound:', error)
        }
      })
    }

    // Show desktop notification if enabled and permitted
    if (preferences.desktopEnabled && permissionRef.current === 'granted') {
      showDesktopNotification(notificationData)
    }
  }, [preferences])

  // Check if notification should be shown based on preferences
  const shouldShowNotification = useCallback((notification: NotificationData): boolean => {
    switch (notification.type) {
      case 'mention':
        return preferences.mentions
      case 'message':
        return preferences.directMessages
      case 'task':
        return preferences.taskUpdates
      case 'workflow':
        return preferences.workflowTriggers
      case 'system':
        return preferences.systemAlerts
      case 'file':
        return preferences.fileSharing
      default:
        return true
    }
  }, [preferences])

  // Show toast notification
  const showToastNotification = useCallback((notification: NotificationData) => {
    const message = `${notification.title}: ${notification.message}`;
    const toastOptions = {
      duration: notification.priority === 'urgent' ? 10000 : 5000,
    }

    switch (notification.priority) {
      case 'urgent':
        toast.error(message, toastOptions)
        break
      case 'high':
        toast.warning(message, toastOptions)
        break
      case 'medium':
      case 'low':
      default:
        toast.info(message, toastOptions)
        break
    }
  }, [])

  // Show desktop notification
  const showDesktopNotification = useCallback((notification: NotificationData) => {
    try {
      const desktopNotification = new Notification(notification.title, {
        body: notification.message,
        icon: notification.avatar || '/meridian-logomark.png',
        badge: '/meridian-logomark.png',
        tag: notification.id,
        requireInteraction: notification.priority === 'urgent',
        timestamp: notification.timestamp,
      })

      desktopNotification.onclick = () => {
        window.focus()
        if (notification.actionUrl) {
          window.location.href = notification.actionUrl
        }
        desktopNotification.close()
      }

      // Auto close after 8 seconds unless urgent
      if (notification.priority !== 'urgent') {
        setTimeout(() => desktopNotification.close(), 8000)
      }
    } catch (error) {
      console.error('Failed to show desktop notification:', error)
    }
  }, [])

  // Create notification manually (for local events)
  const createNotification = useCallback((data: Omit<NotificationData, 'id' | 'timestamp' | 'read'>) => {
    const notification: NotificationData = {
      ...data,
      id: `local-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      read: false,
    }

    handleNewNotification(notification)
    return notification
  }, [handleNewNotification])

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }, [])

  // Remove notification
  const removeNotification = useCallback((notificationId: string) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId)
      const updated = prev.filter(n => n.id !== notificationId)
      
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
      
      return updated
    })
  }, [])

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([])
    setUnreadCount(0)
  }, [])

  // Update preferences
  const updatePreferences = useCallback((newPreferences: Partial<NotificationPreferences>) => {
    setPreferences(prev => ({ ...prev, ...newPreferences }))
    
    // Save to localStorage
    localStorage.setItem('notification-preferences', JSON.stringify({ ...preferences, ...newPreferences }))
  }, [preferences])

  // Load preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('notification-preferences')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setPreferences(prev => ({ ...prev, ...parsed }))
      } catch (error) {
        console.error('Failed to load notification preferences:', error)
      }
    }
  }, [])

  // Simulate some notifications for demo purposes
  const createDemoNotifications = useCallback(() => {
    const demoNotifications = [
      {
        type: 'mention' as const,
        title: 'You were mentioned',
        message: 'Sarah mentioned you in #general: "Can you review the design mockups?"',
        priority: 'high' as const,
        avatar: 'https://avatar.vercel.sh/sarah@example.com',
        actionUrl: '/dashboard/chat',
      },
      {
        type: 'task' as const,
        title: 'Task Updated',
        message: 'The task "Update user interface components" was moved to In Progress',
        priority: 'medium' as const,
        actionUrl: '/dashboard/workspace/demo/project/1/task/123',
      },
      {
        type: 'workflow' as const,
        title: 'New Task Created',
        message: 'AI detected a task in your message: "Fix the login bug"',
        priority: 'medium' as const,
        actionUrl: '/dashboard/workspace/demo/project/1/board',
      },
    ]

    demoNotifications.forEach((demo, index) => {
      setTimeout(() => createNotification(demo), index * 2000)
    })
  }, [createNotification])

  return {
    notifications,
    unreadCount,
    preferences,
    isLoading,
    websocketConnected: websocket.connectionState.isConnected,
    
    // Actions
    createNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    updatePreferences,
    createDemoNotifications, // For testing
  }
}