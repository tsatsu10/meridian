// @epic-3.5-communication: Enhanced notification bell with Magic UI integration
// @persona-sarah: PM needs instant notification access for project updates
// @persona-jennifer: Exec needs priority notifications for decision-making
// @persona-david: Team lead needs team activity notifications
// @persona-mike: Dev needs task and code review notifications
// @persona-lisa: Designer needs collaboration and feedback notifications

"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bell, 
  BellRing, 
  Check, 
  X, 
  Settings,
  MessageSquare,
  Users,
  AlertTriangle,
  CheckCircle2,
  Target,
  Activity
} from "lucide-react";
import { cn } from "@/lib/cn";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { useRBACAuth } from "@/lib/permissions";

// Enhanced notification types with Magic UI styling
interface Notification {
  id: string;
  type: "info" | "warning" | "success" | "error" | "task" | "message" | "mention" | "approval";
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  priority: "low" | "medium" | "high" | "urgent";
  actionUrl?: string;
  avatar?: string;
  sender?: string;
  metadata?: {
    projectName?: string;
    taskName?: string;
    teamName?: string;
  };
}

// Demo notifications data
const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    type: "task",
    title: "Task Assignment",
    message: "You've been assigned to 'Implement Magic UI Dock Navigation'",
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    isRead: false,
    priority: "high",
    actionUrl: "/dashboard/all-tasks?task=1",
    avatar: "/avatars/sarah.jpg",
    sender: "Sarah Johnson",
    metadata: { projectName: "Meridian Platform v2.0", taskName: "Magic UI Integration" }
  },
  {
    id: "2",
    type: "approval",
    title: "Code Review Required",
    message: "Pull request #247 needs your review",
    timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
    isRead: false,
    priority: "medium",
    actionUrl: "/dashboard/projects/1/code-review",
    avatar: "/avatars/mike.jpg",
    sender: "Mike Chen",
    metadata: { projectName: "Meridian Platform v2.0" }
  },
  {
    id: "3",
    type: "mention",
    title: "Team Mention",
    message: "@you mentioned in Design System discussion",
    timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    isRead: false,
    priority: "medium",
    actionUrl: "/dashboard/teams/2/chat",
    avatar: "/avatars/lisa.jpg",
    sender: "Lisa Martinez",
    metadata: { teamName: "Design & UX" }
  },
  {
    id: "4",
    type: "success",
    title: "Milestone Completed",
    message: "MVP Release milestone has been completed!",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    isRead: true,
    priority: "low",
    actionUrl: "/dashboard/projects/1/milestones",
    metadata: { projectName: "Meridian Platform v2.0" }
  },
  {
    id: "5",
    type: "warning",
    title: "Budget Alert",
    message: "Marketing project approaching 90% budget utilization",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    isRead: true,
    priority: "high",
    actionUrl: "/dashboard/analytics?filter=budget",
    avatar: "/avatars/jennifer.jpg",
    sender: "Jennifer Wilson",
    metadata: { projectName: "Marketing Campaign Q2" }
  }
];

// Notification type icons and colors
const NOTIFICATION_CONFIG = {
  info: { icon: Bell, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
  warning: { icon: AlertTriangle, color: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-900/20" },
  success: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50 dark:bg-green-900/20" },
  error: { icon: X, color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20" },
  task: { icon: Target, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20" },
  message: { icon: MessageSquare, color: "text-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-900/20" },
  mention: { icon: Users, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/20" },
  approval: { icon: Activity, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/20" }
};

// Priority colors
const PRIORITY_COLORS = {
  low: "border-gray-300 dark:border-gray-600",
  medium: "border-yellow-300 dark:border-yellow-600",
  high: "border-red-300 dark:border-red-600",
  urgent: "border-purple-400 dark:border-purple-500 animate-pulse"
};

interface NotificationBellProps {
  variant?: "icon" | "button" | "dock";
  className?: string;
  showBadge?: boolean;
  maxNotifications?: number;
}

export default function NotificationBell({ 
  variant = "icon",
  className,
  showBadge = true,
  maxNotifications = 10
}: NotificationBellProps) {
  const { hasPermission } = useRBACAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(DEMO_NOTIFICATIONS);

  // Filter notifications based on permissions
  const visibleNotifications = useMemo(() => {
    return notifications.filter(notification => {
      // Basic permission checks - in real app, this would be more sophisticated
      if (notification.type === "approval" && !hasPermission("code", "review")) {
        return false;
      }
      return true;
    }).slice(0, maxNotifications);
  }, [notifications, hasPermission, maxNotifications]);

  // Count unread notifications
  const unreadCount = useMemo(() => 
    visibleNotifications.filter(n => !n.isRead).length, 
    [visibleNotifications]
  );

  // Mark notification as read
  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
  };

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  // Delete notification
  const deleteNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  // Render notification item
  const NotificationItem = ({ notification }: { notification: Notification }) => {
    const config = NOTIFICATION_CONFIG[notification.type];
    const IconComponent = config.icon;

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "p-4 border-l-4 cursor-pointer transition-all duration-200 hover:bg-muted/50",
          PRIORITY_COLORS[notification.priority],
          !notification.isRead && "bg-primary/5"
        )}
        onClick={() => {
          markAsRead(notification.id);
          if (notification.actionUrl) {
            // Navigate to action URL
          }
        }}
      >
        <div className="flex items-start space-x-3">
          {/* Icon */}
          <div className={cn("p-2 rounded-lg", config.bg)}>
            <IconComponent className={cn("h-4 w-4", config.color)} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h4 className={cn(
                  "text-sm font-medium text-foreground truncate",
                  !notification.isRead && "font-semibold"
                )}>
                  {notification.title}
                </h4>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {notification.message}
                </p>
                
                {/* Metadata */}
                <div className="flex items-center space-x-2 mt-2">
                  {notification.sender && (
                    <div className="flex items-center space-x-1">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={notification.avatar} />
                        <AvatarFallback className="text-xs">
                          {notification.sender.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">{notification.sender}</span>
                    </div>
                  )}
                  {notification.metadata?.projectName && (
                    <Badge variant="secondary" className="text-xs">
                      {notification.metadata.projectName}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                  </span>
                  {!notification.isRead && (
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-1 ml-2">
                {!notification.isRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(notification.id);
                    }}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notification.id);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // Get button styling based on variant
  const getButtonStyling = () => {
    switch (variant) {
      case "button":
        return "glass-card border-border/50 hover:bg-primary/10";
      case "dock":
        return "glass-card bg-primary/10 hover:bg-primary/20 border-primary/20";
      default:
        return "ghost";
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant === "icon" ? "ghost" : "outline"}
          size={variant === "dock" ? "default" : "icon"}
          className={cn(
            "relative transition-all duration-200",
            getButtonStyling(),
            className
          )}
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative"
          >
            {unreadCount > 0 ? (
              <BellRing className="h-5 w-5" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
            
            {showBadge && unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1"
              >
                <Badge 
                  className={cn(
                    "h-5 w-5 flex items-center justify-center p-0 text-xs",
                    "bg-red-500 hover:bg-red-600 text-white border-background",
                    unreadCount > 99 && "px-1 w-auto"
                  )}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              </motion.div>
            )}
          </motion.div>
          
          {variant === "button" && <span className="ml-2">Notifications</span>}
          {variant === "dock" && <span className="ml-2">Alerts</span>}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent 
        align="end" 
        className={cn(
          "w-96 max-h-[32rem] glass-card border-border/50 p-0",
          "backdrop-blur-xl bg-white/90 dark:bg-black/90"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Notifications</h3>
              <p className="text-sm text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  Mark all read
                </Button>
              )}
      <Button
        variant="ghost"
        size="icon"
                className="h-8 w-8"
                onClick={() => {
                  // TODO: Open notification settings
                }}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="max-h-80">
          <AnimatePresence>
            {visibleNotifications.length > 0 ? (
              <div className="divide-y divide-border/50">
                {visibleNotifications.map((notification) => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="font-medium text-foreground mb-2">No notifications</h4>
                <p className="text-sm text-muted-foreground">
                  You're all caught up! Check back later for updates.
                </p>
              </div>
            )}
          </AnimatePresence>
        </ScrollArea>

        {/* Footer */}
        {visibleNotifications.length > 0 && (
          <div className="p-3 border-t border-border/50 bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center text-sm"
              onClick={() => {
                // TODO: Navigate to all notifications page
              }}
            >
              View all notifications
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
