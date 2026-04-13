// @epic-3.5-communication: Enhanced notification item with compact mode and pin functionality
// @persona-sarah: PM needs efficient notification browsing
// @persona-jennifer: Exec needs condensed notification views

import { memo } from "react";
import useMarkNotificationAsRead from "@/hooks/mutations/notification/use-mark-notification-as-read";
import usePinNotification from "@/hooks/mutations/notification/use-pin-notification";
import useUnpinNotification from "@/hooks/mutations/notification/use-unpin-notification";
import useArchiveNotification from "@/hooks/mutations/notification/use-archive-notification";
import useUnarchiveNotification from "@/hooks/mutations/notification/use-unarchive-notification";
import useDeleteNotification from "@/hooks/mutations/notification/use-delete-notification";
import { cn } from "@/lib/cn";
import type { Notification } from "@/types/notification";
import { useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  FolderKanban,
  Info,
  MessageSquare,
  Users,
  AtSign,
  Bell,
  X,
  ExternalLink,
  Pin,
  PinOff,
  Archive,
  ArchiveRestore,
  MoreHorizontal,
  Clock,
  Flag,
  Trash,
  CheckSquare,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface NotificationItemProps {
  notification: Notification;
  onClose?: () => void;
  isCompact?: boolean;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  isFocused?: boolean;
}

const NotificationItem = memo(function NotificationItem({
  notification,
  onClose,
  isCompact = false,
  selectionMode = false,
  isSelected = false,
  onToggleSelect,
  isFocused = false,
}: NotificationItemProps) {
  const navigate = useNavigate();
  const { mutate: markAsRead } = useMarkNotificationAsRead();
  const { mutate: pinNotification, isPending: isPinning } = usePinNotification();
  const { mutate: unpinNotification, isPending: isUnpinning } = useUnpinNotification();
  const { mutate: archiveNotification, isPending: isArchiving } = useArchiveNotification();
  const { mutate: unarchiveNotification, isPending: isUnarchiving } = useUnarchiveNotification();
  const { mutate: deleteNotification, isPending: isDeleting } = useDeleteNotification();

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleSelect) {
      onToggleSelect(notification.id);
    }
  };

  // Helper function to safely parse metadata
  const parseMetadata = (metadata: any): Record<string, any> | null => {
    try {
      if (!metadata) return null;
      if (typeof metadata === 'string') {
        return JSON.parse(metadata);
      }
      return metadata;
    } catch (error) {
      console.error('Failed to parse notification metadata:', error);
      toast.error('Invalid notification data');
      return null;
    }
  };

  const handleClick = () => {
    // If in selection mode, toggle selection instead of navigating
    if (selectionMode) {
      if (onToggleSelect) {
        onToggleSelect(notification.id);
      }
      return;
    }

    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    if (notification.resourceId && notification.resourceType) {
      switch (notification.resourceType) {
        case "task":
          // Navigate to task detail - requires workspace and project IDs from metadata
          if (notification.metadata) {
            const meta = parseMetadata(notification.metadata);
            
            if (meta && meta.workspaceId && meta.projectId) {
              navigate({
                to: "/dashboard/workspace/$workspaceId/project/$projectId/task/$taskId",
                params: {
                  workspaceId: meta.workspaceId,
                  projectId: meta.projectId,
                  taskId: notification.resourceId,
                },
              });
              onClose?.();
            } else {
              toast.error('Cannot navigate: Missing workspace or project information');
            }
          }
          break;

        case "project":
          // Navigate to project detail
          if (notification.metadata) {
            const meta = parseMetadata(notification.metadata);
            
            if (meta && meta.workspaceId) {
              navigate({
                to: "/dashboard/workspace/$workspaceId/project/$projectId",
                params: {
                  workspaceId: meta.workspaceId,
                  projectId: notification.resourceId,
                },
              });
              onClose?.();
            } else {
              toast.error('Cannot navigate: Missing workspace information');
            }
          }
          break;

        case "comment":
          // Navigate to task with comment highlighted
          if (notification.metadata) {
            const meta = parseMetadata(notification.metadata);
            
            if (meta && meta.workspaceId && meta.projectId && meta.taskId) {
              navigate({
                to: "/dashboard/workspace/$workspaceId/project/$projectId/task/$taskId",
                params: {
                  workspaceId: meta.workspaceId,
                  projectId: meta.projectId,
                  taskId: meta.taskId,
                },
                search: { highlightComment: notification.resourceId },
              });
              onClose?.();
            } else {
              toast.error('Cannot navigate: Missing task information');
            }
          }
          break;

        case "mention":
          // Navigate to mention location (similar to comment)
          if (notification.metadata) {
            const meta = parseMetadata(notification.metadata);
            
            if (meta && meta.workspaceId && meta.projectId && meta.taskId) {
              navigate({
                to: "/dashboard/workspace/$workspaceId/project/$projectId/task/$taskId",
                params: {
                  workspaceId: meta.workspaceId,
                  projectId: meta.projectId,
                  taskId: meta.taskId,
                },
                search: { highlightMention: true },
              });
              onClose?.();
            } else {
              toast.error('Cannot navigate: Missing task information');
            }
          }
          break;

        case "workspace":
          // Navigate to workspace settings
          navigate({
            to: "/dashboard/workspace-settings/$workspaceId",
            params: { workspaceId: notification.resourceId },
          });
          onClose?.();
          break;

        case "system":
          // For system notifications, just mark as read (no navigation)
          console.log('System notification:', notification.title);
          break;

        default:
          console.log('Unknown notification type:', notification.resourceType);
          break;
      }
    }
  };

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAsRead(notification.id);
  };

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (notification.isPinned) {
      unpinNotification(notification.id, {
        onSuccess: () => {
          toast.success("Notification unpinned");
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "Failed to unpin notification");
        },
      });
    } else {
      pinNotification(notification.id, {
        onSuccess: () => {
          toast.success("Notification pinned");
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "Failed to pin notification");
        },
      });
    }
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isArchived = (notification as any).isArchived || false;
    if (isArchived) {
      unarchiveNotification(notification.id);
    } else {
      archiveNotification(notification.id);
    }
  };

  const handleDelete = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm('Are you sure you want to delete this notification?')) {
      deleteNotification(notification.id);
      onClose?.();
    }
  };

  const handleSnooze = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    toast.info('Notification snoozed for 1 hour', {
      description: 'You will be reminded later',
    });
    // TODO: Implement snooze functionality with backend support
    onClose?.();
  };

  const handleReport = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    toast.success('Notification reported', {
      description: 'Thank you for helping us improve',
    });
    // TODO: Implement report functionality with backend support
    onClose?.();
  };

  const getIcon = () => {
    switch (notification.type) {
      case "task":
        return (
          <FileText className={cn(
            "text-blue-500 dark:text-blue-400",
            isCompact ? "h-3 w-3" : "h-4 w-4"
          )} />
        );
      case "workspace":
        return (
          <FolderKanban className={cn(
            "text-purple-500 dark:text-purple-400",
            isCompact ? "h-3 w-3" : "h-4 w-4"
          )} />
        );
      case "project":
        return (
          <Users className={cn(
            "text-green-500 dark:text-green-400",
            isCompact ? "h-3 w-3" : "h-4 w-4"
          )} />
        );
      case "comment":
        return (
          <MessageSquare className={cn(
            "text-yellow-500 dark:text-yellow-400",
            isCompact ? "h-3 w-3" : "h-4 w-4"
          )} />
        );
      case "mention":
        return (
          <AtSign className={cn(
            "text-pink-500 dark:text-pink-400",
            isCompact ? "h-3 w-3" : "h-4 w-4"
          )} />
        );
      case "success":
        return (
          <CheckCircle2 className={cn(
            "text-green-500 dark:text-green-400",
            isCompact ? "h-3 w-3" : "h-4 w-4"
          )} />
        );
      case "error":
        return (
          <AlertCircle className={cn(
            "text-red-500 dark:text-red-400",
            isCompact ? "h-3 w-3" : "h-4 w-4"
          )} />
        );
      case "warning":
        return (
          <AlertCircle className={cn(
            "text-yellow-500 dark:text-yellow-400",
            isCompact ? "h-3 w-3" : "h-4 w-4"
          )} />
        );
      default:
        return (
          <Info className={cn(
            "text-blue-500 dark:text-blue-400",
            isCompact ? "h-3 w-3" : "h-4 w-4"
          )} />
        );
    }
  };

  const getPriorityColor = () => {
    switch (notification.type) {
      case "error":
        return "border-l-red-500";
      case "warning":
        return "border-l-yellow-500";
      case "success":
        return "border-l-green-500";
      case "mention":
        return "border-l-pink-500";
      default:
        return "border-l-blue-500";
    }
  };

  if (isCompact) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className={cn(
          "flex cursor-pointer items-center gap-3 p-3 border-l-2 transition-all duration-200",
          "hover:bg-muted/50 glass-card",
          !notification.isRead && "bg-primary/5 border-l-primary",
          notification.isRead && getPriorityColor(),
          isFocused && "ring-2 ring-primary ring-offset-2"
        )}
        onClick={handleClick}
      >
        {selectionMode && (
          <button
            onClick={handleCheckboxClick}
            className="flex items-center justify-center h-8 w-8 hover:bg-muted rounded transition-colors"
          >
            {isSelected ? (
              <CheckSquare className="h-5 w-5 text-primary" />
            ) : (
              <Square className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        )}
        <div className={cn(
          "flex items-center justify-center rounded-full",
          isCompact ? "h-6 w-6" : "h-8 w-8",
          !notification.isRead ? "bg-primary/10" : "bg-muted"
        )}>
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <p className={cn(
                    "text-sm truncate cursor-help",
                    !notification.isRead && "font-medium"
                  )}>
                    {notification.title}
                  </p>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-sm">
                  <div className="space-y-1">
                    <p className="font-semibold">{notification.title}</p>
                    {notification.message && (
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="flex items-center space-x-2 ml-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(notification.createdAt), {
                  addSuffix: true,
                })}
              </span>
              {notification.isPinned && (
                <Pin className="h-3 w-3 text-orange-500" />
              )}
              {!notification.isRead && (
                <div className="w-2 h-2 bg-primary rounded-full" />
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handlePin}
            disabled={isPinning || isUnpinning}
          >
            {notification.isPinned ? (
              <PinOff className="h-3 w-3" />
            ) : (
              <Pin className="h-3 w-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleArchive}
            disabled={isArchiving || isUnarchiving}
          >
            {(notification as any).isArchived ? (
              <ArchiveRestore className="h-3 w-3" />
            ) : (
              <Archive className="h-3 w-3" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleSnooze}>
                <Clock className="mr-2 h-4 w-4" />
                Snooze for 1 hour
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleReport}>
                <Flag className="mr-2 h-4 w-4" />
                Report issue
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {!notification.isRead && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleMarkAsRead}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "group flex cursor-pointer gap-4 p-4 border-l-2 transition-all duration-200",
        "hover:bg-muted/50 glass-card",
        !notification.isRead && "bg-primary/5 border-l-primary",
        notification.isRead && getPriorityColor(),
        isFocused && "ring-2 ring-primary ring-offset-2"
      )}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleClick();
        }
      }}
    >
      {selectionMode && (
        <button
          onClick={handleCheckboxClick}
          className="flex items-center justify-center h-10 w-10 hover:bg-muted rounded transition-colors"
        >
          {isSelected ? (
            <CheckSquare className="h-6 w-6 text-primary" />
          ) : (
            <Square className="h-6 w-6 text-muted-foreground" />
          )}
        </button>
      )}
      <div className={cn(
        "mt-0.5 flex items-center justify-center rounded-full",
        "h-10 w-10 flex-shrink-0",
        !notification.isRead ? "bg-primary/10" : "bg-muted"
      )}>
        {getIcon()}
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <p className={cn(
                    "text-sm leading-tight cursor-help",
                    !notification.isRead && "font-medium"
                  )}>
                    {notification.title}
                  </p>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-sm">
                  <div className="space-y-2">
                    <p className="font-semibold">{notification.title}</p>
                    {notification.message && (
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                    )}
                    {notification.content && (
                      <p className="text-sm text-muted-foreground">{notification.content}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {notification.content && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {notification.content}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <Badge variant="secondary" className="text-xs">
              {notification.type}
            </Badge>
            {notification.isPinned && (
              <Pin className="h-3 w-3 text-orange-500" />
            )}
            {!notification.isRead && (
              <div className="w-2 h-2 bg-primary rounded-full" />
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(notification.createdAt), {
              addSuffix: true,
            })}
          </span>
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handlePin}
              disabled={isPinning || isUnpinning}
            >
              {notification.isPinned ? (
                <PinOff className="h-3 w-3" />
              ) : (
                <Pin className="h-3 w-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleArchive}
              disabled={isArchiving || isUnarchiving}
            >
              {(notification as any).isArchived ? (
                <ArchiveRestore className="h-3 w-3" />
              ) : (
                <Archive className="h-3 w-3" />
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleSnooze}>
                  <Clock className="mr-2 h-4 w-4" />
                  Snooze for 1 hour
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleReport}>
                  <Flag className="mr-2 h-4 w-4" />
                  Report issue
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {!notification.isRead && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleMarkAsRead}
              >
                <CheckCircle2 className="h-3 w-3" />
              </Button>
            )}
            {notification.resourceId && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleClick}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memo optimization
  // Only re-render if these specific props change
  const prevArchived = (prevProps.notification as any).isArchived || false;
  const nextArchived = (nextProps.notification as any).isArchived || false;
  
  return (
    prevProps.notification.id === nextProps.notification.id &&
    prevProps.notification.isRead === nextProps.notification.isRead &&
    prevProps.notification.isPinned === nextProps.notification.isPinned &&
    prevArchived === nextArchived &&
    prevProps.isCompact === nextProps.isCompact &&
    prevProps.selectionMode === nextProps.selectionMode &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isFocused === nextProps.isFocused
  );
});

export default NotificationItem;
