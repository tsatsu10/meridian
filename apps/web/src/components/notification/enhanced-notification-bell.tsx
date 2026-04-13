// Enhanced Notification Bell with Real-time Updates
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  X,
  Settings,
  MessageSquare,
  CheckSquare,
  Zap,
  FileText,
  AlertTriangle,
  Info,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { useRealTimeNotifications, NotificationData } from '@/hooks/use-real-time-notifications'

export function EnhancedNotificationBell() {
  const {
    notifications,
    unreadCount,
    websocketConnected,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    createDemoNotifications,
  } = useRealTimeNotifications()

  const [isOpen, setIsOpen] = useState(false)

  const getNotificationIcon = (type: NotificationData['type']) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="w-4 h-4" />
      case 'task':
        return <CheckSquare className="w-4 h-4" />
      case 'mention':
        return <MessageSquare className="w-4 h-4" />
      case 'workflow':
        return <Zap className="w-4 h-4" />
      case 'file':
        return <FileText className="w-4 h-4" />
      case 'system':
      default:
        return <Info className="w-4 h-4" />
    }
  }

  const getPriorityColor = (priority: NotificationData['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'low':
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const handleNotificationClick = (notification: NotificationData) => {
    if (!notification.read) {
      markAsRead(notification.id)
    }
    
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl
      setIsOpen(false)
    }
  }

  const recentNotifications = notifications.slice(0, 10)

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="relative h-9 w-9 p-0"
        >
          {unreadCount > 0 ? (
            <BellRing className="h-4 w-4 animate-pulse" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-80 p-0"
        sideOffset={5}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <DropdownMenuLabel className="p-0 font-semibold">
              Notifications
            </DropdownMenuLabel>
            <div className={cn(
              "flex items-center gap-1 text-xs",
              websocketConnected ? "text-green-600" : "text-orange-600"
            )}>
              {websocketConnected ? (
                <><Wifi className="w-3 h-3" /> Live</>
              ) : (
                <><WifiOff className="w-3 h-3" /> Offline</>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-7 px-2 text-xs"
              >
                <CheckCheck className="w-3 h-3 mr-1" />
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
            >
              <Settings className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-96 overflow-y-auto">
          {recentNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="w-12 h-12 text-gray-300 mb-3" />
              <h3 className="font-medium text-gray-900 mb-1">No notifications</h3>
              <p className="text-sm text-gray-500 mb-4">You're all caught up!</p>
              <Button
                variant="outline"
                size="sm"
                onClick={createDemoNotifications}
                className="text-xs"
              >
                Create Demo Notifications
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors cursor-pointer relative",
                    !notification.read && "bg-blue-50/50"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  {/* Avatar or Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {notification.avatar ? (
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={notification.avatar} />
                        <AvatarFallback className="text-xs">
                          {notification.title.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center border",
                        getPriorityColor(notification.priority)
                      )}>
                        {getNotificationIcon(notification.type)}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-gray-200"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeNotification(notification.id)
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Priority Indicator */}
                    {notification.priority === 'urgent' && (
                      <div className="flex items-center gap-1 mt-2">
                        <AlertTriangle className="w-3 h-3 text-red-500" />
                        <span className="text-xs text-red-600 font-medium">Urgent</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 10 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-sm"
                onClick={() => {
                  // Navigate to full notifications page
                  window.location.href = '/dashboard/notifications'
                  setIsOpen(false)
                }}
              >
                View all notifications ({notifications.length})
              </Button>
            </div>
          </>
        )}
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => {
                  clearAll()
                  setIsOpen(false)
                }}
              >
                Clear all notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}