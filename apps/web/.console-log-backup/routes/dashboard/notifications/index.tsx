// @epic-3.5-communication: Professional notifications page with modern UI/UX standards
// @persona-sarah: PM needs organized notification management 
// @persona-jennifer: Exec needs prioritized notification filtering
// @persona-david: Team lead needs team activity notifications
// @persona-mike: Dev needs focused task notifications
// @persona-lisa: Designer needs collaboration notifications

import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BlurFade } from "@/components/magicui/blur-fade";
import NumberTicker from "@/components/magicui/number-ticker";
import LazyDashboardLayout from "@/components/performance/lazy-dashboard-layout";
import useGetNotificationsInfinite from "@/hooks/queries/notification/use-get-notifications-infinite";
import useClearNotifications from "@/hooks/mutations/notification/use-clear-notifications";
import useMarkAllNotificationsAsRead from "@/hooks/mutations/notification/use-mark-all-notifications-as-read";
import useBatchMarkRead from "@/hooks/mutations/notification/use-batch-mark-read";
import useBatchArchive from "@/hooks/mutations/notification/use-batch-archive";
import useBatchDelete from "@/hooks/mutations/notification/use-batch-delete";
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  Settings,
  Search,
  AlertTriangle,
  RefreshCw,
  Activity,
  Calendar,
  Archive,
  Filter as FilterIcon,
  SortAsc,
  Grid3X3,
  List,
  Layers,
  Pin,
  Flag,
  X,
  ChevronDown,
  Mail,
  MailOpen,
  Volume2,
  VolumeX,
  BarChart3,
  CheckSquare,
  Square
} from "lucide-react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { toast } from "sonner";
import NotificationItem from "@/components/notification/notification-item";
import NotificationPreferencesDialog, { NotificationPreferences, DEFAULT_PREFERENCES } from "@/components/notification/notification-preferences-dialog";
import NotificationAnalyticsModal from "@/components/notification/notification-analytics-modal";
import { cn } from "@/lib/cn";
import { motion, AnimatePresence } from "framer-motion";
import { format, isToday, isYesterday } from "date-fns";
import { playNotificationSound, preloadNotificationSound } from "@/lib/notification-sound";

export const Route = createFileRoute("/dashboard/notifications/")({
  component: NotificationsPanel,
});

type NotificationFilter = "all" | "unread" | "read" | "important" | "pinned" | "archived";
type NotificationTypeFilter = "all" | "task" | "project" | "workspace" | "comment" | "system" | "mention";
type ViewMode = "list" | "grid" | "compact";
type GroupBy = "none" | "date" | "type" | "priority";

function NotificationsPanel() {
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [typeFilter, setTypeFilter] = useState<NotificationTypeFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "priority" | "type">("date");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [groupBy, setGroupBy] = useState<GroupBy>("date");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    // Load sound preference from localStorage
    const saved = localStorage.getItem('notificationSoundEnabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [previousNotificationCount, setPreviousNotificationCount] = useState(0);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(() => {
    const saved = localStorage.getItem('notificationPreferences');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_PREFERENCES;
      }
    }
    return DEFAULT_PREFERENCES;
  });
  
  const { 
    data: infiniteData,
    isLoading, 
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch
  } = useGetNotificationsInfinite({ 
    includeArchived: filter === "archived" 
  });
  
  // Preload notification sound on mount
  useEffect(() => {
    if (soundEnabled) {
      preloadNotificationSound();
    }
  }, []);

  // Persist sound preference to localStorage
  useEffect(() => {
    localStorage.setItem('notificationSoundEnabled', String(soundEnabled));
  }, [soundEnabled]);

  // Persist preferences to localStorage
  useEffect(() => {
    localStorage.setItem('notificationPreferences', JSON.stringify(preferences));
  }, [preferences]);

  // Handle preference save
  const handleSavePreferences = useCallback((newPreferences: NotificationPreferences) => {
    setPreferences(newPreferences);
    setSoundEnabled(newPreferences.soundEnabled);
    setAutoRefresh(newPreferences.autoRefresh);
    setViewMode(newPreferences.defaultView);
    setFilter(newPreferences.defaultFilter);
    setSortBy(newPreferences.defaultSort);
    setGroupBy(newPreferences.defaultGroupBy);
  }, []);

  // Auto-refresh implementation with polling
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        console.log('🔄 Auto-refreshing notifications...');
        refetch();
      }, 30000); // Refresh every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refetch]);

  // Extract notifications from infinite query data
  const notifications = infiniteData?.notifications || [];
  const pagination = infiniteData?.pagination;

  const { mutate: markAllAsRead, isPending: isMarkingAsRead } = useMarkAllNotificationsAsRead();
  const { mutate: clearAllNotifications, isPending: isClearing } = useClearNotifications();
  const { mutate: batchMarkRead, isPending: isBatchMarkingRead } = useBatchMarkRead();
  const { mutate: batchArchive, isPending: isBatchArchiving } = useBatchArchive();
  const { mutate: batchDelete, isPending: isBatchDeleting } = useBatchDelete();

  // Filter and search notifications
  const filteredNotifications = useMemo(() => {
    let filtered = notifications.filter((notification) => {
      // Filter by archived status
      const isArchived = (notification as any).isArchived || false;
      
      if (filter === "archived") {
        // Show only archived notifications
        if (!isArchived) return false;
      } else {
        // For all other filters, exclude archived notifications
        if (isArchived) return false;
      }
      
      // Filter by read status
      if (filter === "unread" && notification.isRead) return false;
      if (filter === "read" && !notification.isRead) return false;
      if (filter === "important" && notification.type !== "error" && notification.type !== "warning") return false;
      if (filter === "pinned" && !notification.isPinned) return false;
      
      // Filter by type
      if (typeFilter !== "all" && notification.type !== typeFilter) return false;
      
      // Search filter
      if (searchQuery && !notification.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !notification.content?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      return true;
    });

    // Sort notifications
    return filtered.sort((a, b) => {
      // Pinned notifications always come first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      switch (sortBy) {
        case "priority":
          const priorityOrder = { error: 0, warning: 1, success: 2, info: 3 };
          return (priorityOrder[a.type as keyof typeof priorityOrder] ?? 4) - 
                 (priorityOrder[b.type as keyof typeof priorityOrder] ?? 4);
        case "type":
          return a.type.localeCompare(b.type);
        case "date":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [notifications, filter, typeFilter, searchQuery, sortBy]);

  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter(n => !n.isRead).length;
    const read = notifications.filter(n => n.isRead).length;
    const important = notifications.filter(n => n.type === "error" || n.type === "warning").length;
    const mentions = notifications.filter(n => n.type === "mention").length;
    const pinned = notifications.filter(n => n.isPinned).length;
    const today = notifications.filter(n => isToday(new Date(n.createdAt))).length;
    
    return { total, unread, read, important, mentions, pinned, today };
  }, [notifications]);

  // Detect new notifications and play sound
  useEffect(() => {
    if (notifications.length > 0 && previousNotificationCount > 0) {
      const newCount = notifications.length - previousNotificationCount;
      if (newCount > 0) {
        console.log(`🔔 ${newCount} new notification(s) detected`);
        
        // Play sound if enabled
        if (soundEnabled) {
          playNotificationSound(0.5);
        }
        
        // Announce to screen readers
        setLiveAnnouncement(`${newCount} new notification${newCount > 1 ? 's' : ''} received`);
        setTimeout(() => setLiveAnnouncement(''), 3000);
        
        // Show toast for new notifications
        toast.info(
          `${newCount} new notification${newCount > 1 ? 's' : ''}`,
          {
            icon: '🔔',
            duration: 3000,
          }
        );
      }
    }
    
    // Update previous count
    if (notifications.length > 0) {
      setPreviousNotificationCount(notifications.length);
    }
  }, [notifications.length, soundEnabled, previousNotificationCount]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl/Cmd + A: Mark all as read
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        if (stats.unread > 0) {
          e.preventDefault();
          handleMarkAllAsRead();
        }
      }

      // Ctrl/Cmd + Shift + D: Clear all
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        if (notifications.length > 0) {
          e.preventDefault();
          handleClearAllNotifications();
        }
      }

      // Ctrl/Cmd + S: Toggle selection mode
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        if (notifications.length > 0) {
          e.preventDefault();
          toggleSelectionMode();
        }
      }

      // Ctrl/Cmd + Shift + A: Toggle select all (when in selection mode)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
        if (selectionMode) {
          e.preventDefault();
          toggleSelectAll();
        }
      }

      // Delete: Batch delete selected (when in selection mode)
      if (e.key === 'Delete') {
        if (selectionMode && selectedNotifications.size > 0) {
          e.preventDefault();
          handleBatchDelete();
        }
      }

      // Escape: Exit selection mode
      if (e.key === 'Escape') {
        if (selectionMode) {
          e.preventDefault();
          toggleSelectionMode();
        }
      }

      // R: Refresh notifications
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        refetch();
      }

      // Arrow navigation
      if (e.key === 'ArrowDown') {
        if (filteredNotifications.length > 0) {
          e.preventDefault();
          setFocusedIndex(prev => 
            prev < filteredNotifications.length - 1 ? prev + 1 : prev
          );
        }
      }

      if (e.key === 'ArrowUp') {
        if (filteredNotifications.length > 0) {
          e.preventDefault();
          setFocusedIndex(prev => (prev > 0 ? prev - 1 : 0));
        }
      }

      // Enter: Mark focused notification as read or toggle selection
      if (e.key === 'Enter') {
        if (focusedIndex >= 0 && focusedIndex < filteredNotifications.length) {
          e.preventDefault();
          const notification = filteredNotifications[focusedIndex];
          if (selectionMode) {
            toggleNotificationSelection(notification.id);
          } else if (!notification.isRead) {
            // Would need to import the mutation here, simplified for now
            console.log('Mark as read:', notification.id);
          }
        }
      }

      // Space: Toggle selection (in selection mode)
      if (e.key === ' ') {
        if (selectionMode && focusedIndex >= 0 && focusedIndex < filteredNotifications.length) {
          e.preventDefault();
          const notification = filteredNotifications[focusedIndex];
          toggleNotificationSelection(notification.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stats.unread, notifications.length, selectionMode, selectedNotifications.size, refetch, filteredNotifications.length, focusedIndex]);

  // Group notifications
  const groupedNotifications = useMemo(() => {
    if (groupBy === "none") {
      return [{ title: "", notifications: filteredNotifications }];
    }

    const groups: Record<string, any[]> = {};
    
    filteredNotifications.forEach((notification) => {
      let groupKey = "";
      
      switch (groupBy) {
        case "date":
          const date = new Date(notification.createdAt);
          if (isToday(date)) {
            groupKey = "Today";
          } else if (isYesterday(date)) {
            groupKey = "Yesterday";
          } else {
            groupKey = format(date, "MMMM d, yyyy");
          }
          break;
        case "type":
          groupKey = notification.type.charAt(0).toUpperCase() + notification.type.slice(1);
          break;
        case "priority":
          if (notification.type === "error") groupKey = "Critical";
          else if (notification.type === "warning") groupKey = "Important";
          else if (notification.type === "success") groupKey = "Success";
          else groupKey = "General";
          break;
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(notification);
    });

    return Object.entries(groups).map(([title, notifications]) => ({
      title,
      notifications,
    }));
  }, [filteredNotifications, groupBy]);

  const handleMarkAllAsRead = () => {
    markAllAsRead(undefined, {
      onSuccess: () => {
        toast.success("All notifications marked as read");
        refetch();
      },
      onError: (error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to mark notifications as read",
        );
      },
    });
  };

  const handleClearAllNotifications = () => {
    clearAllNotifications(undefined, {
      onSuccess: () => {
        toast.success("All notifications cleared");
        refetch();
      },
      onError: (error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to clear notifications",
        );
      },
    });
  };

  // Batch operations handlers
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedNotifications(new Set());
  };

  const toggleSelectAll = () => {
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map(n => n.id)));
    }
  };

  const toggleNotificationSelection = (id: string) => {
    const newSelected = new Set(selectedNotifications);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedNotifications(newSelected);
  };

  const handleBatchMarkRead = () => {
    const ids = Array.from(selectedNotifications);
    batchMarkRead(ids, {
      onSuccess: () => {
        setSelectedNotifications(new Set());
        setSelectionMode(false);
      },
    });
  };

  const handleBatchArchive = () => {
    const ids = Array.from(selectedNotifications);
    batchArchive(ids, {
      onSuccess: () => {
        setSelectedNotifications(new Set());
        setSelectionMode(false);
      },
    });
  };

  const handleBatchDelete = () => {
    if (window.confirm(`Delete ${selectedNotifications.size} notification(s)?`)) {
      const ids = Array.from(selectedNotifications);
      batchDelete(ids, {
        onSuccess: () => {
          setSelectedNotifications(new Set());
          setSelectionMode(false);
        },
      });
    }
  };

  const getFilterIcon = (filterType: NotificationFilter) => {
    switch (filterType) {
      case "all": return <Bell className="h-4 w-4" />;
      case "unread": return <Mail className="h-4 w-4" />;
      case "read": return <MailOpen className="h-4 w-4" />;
      case "important": return <Flag className="h-4 w-4" />;
      case "pinned": return <Pin className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getViewModeIcon = (mode: ViewMode) => {
    switch (mode) {
      case "list": return <List className="h-4 w-4" />;
      case "grid": return <Grid3X3 className="h-4 w-4" />;
      case "compact": return <Layers className="h-4 w-4" />;
      default: return <List className="h-4 w-4" />;
    }
  };

  // Show error state if there's an authentication error
  if (error && error.message?.includes('Forbidden')) {
    return (
      <LazyDashboardLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-md mx-auto">
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                    <AlertTriangle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-slate-100">Authentication Required</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                    Please sign in to view your notifications.
                  </p>
                  <Button 
                    onClick={() => window.location.reload()} 
                    className="w-full"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh Page
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </LazyDashboardLayout>
    );
  }

  return (
    <LazyDashboardLayout>
      {/* Live region for screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {liveAnnouncement}
      </div>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/30">
        {/* Modern Header */}
        <div className="border-b border-slate-200/60 dark:border-slate-800/60 bg-white/80 backdrop-blur-md dark:bg-slate-900/80 sticky top-0 z-40">
          <div className="container mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Notifications</h1>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {stats.unread > 0 ? `${stats.unread} unread notifications` : 'All caught up!'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Header Actions */}
              <div className="flex items-center space-x-3">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className="h-9 w-9 p-0"
                      >
                        {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{soundEnabled ? 'Disable' : 'Enable'} notification sounds</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={autoRefresh}
                          onCheckedChange={setAutoRefresh}
                          className="data-[state=checked]:bg-blue-600"
                        />
                        <span className="text-sm text-slate-600 dark:text-slate-400">Auto-refresh</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Automatically refresh notifications</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isLoading}
                  className="border-slate-200 dark:border-slate-700"
                >
                  <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-8 space-y-8">
          {/* Enhanced Stats Cards */}
          <BlurFade delay={0.1}>
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {[
                { 
                  label: "Total", 
                  value: stats.total, 
                  icon: Bell, 
                  color: "from-blue-500 to-blue-600",
                  bgColor: "bg-blue-50 dark:bg-blue-950/20",
                  textColor: "text-blue-700 dark:text-blue-300"
                },
                { 
                  label: "Unread", 
                  value: stats.unread, 
                  icon: Mail, 
                  color: "from-orange-500 to-red-500",
                  bgColor: "bg-orange-50 dark:bg-orange-950/20",
                  textColor: "text-orange-700 dark:text-orange-300",
                  highlight: stats.unread > 0
                },
                { 
                  label: "Important", 
                  value: stats.important, 
                  icon: Flag, 
                  color: "from-purple-500 to-pink-500",
                  bgColor: "bg-purple-50 dark:bg-purple-950/20",
                  textColor: "text-purple-700 dark:text-purple-300"
                },
                { 
                  label: "Today", 
                  value: stats.today, 
                  icon: Calendar, 
                  color: "from-green-500 to-emerald-500",
                  bgColor: "bg-green-50 dark:bg-green-950/20",
                  textColor: "text-green-700 dark:text-green-300"
                }
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  className="relative"
                >
                  <Card className={cn(
                    "border-0 shadow-sm hover:shadow-md transition-all duration-200",
                    "bg-white/80 backdrop-blur-sm dark:bg-slate-900/80",
                    stat.highlight && "ring-2 ring-orange-200 dark:ring-orange-800"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", stat.bgColor)}>
                          <stat.icon className={cn("h-5 w-5", stat.textColor)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            <NumberTicker value={stat.value} />
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400 truncate">{stat.label}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  {stat.highlight && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
                  )}
                </motion.div>
              ))}
            </div>
          </BlurFade>

          {/* Enhanced Control Panel */}
          <BlurFade delay={0.2}>
            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
              <CardContent className="p-6 space-y-6">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search notifications, mentions, or content..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 pr-12 h-12 text-base border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 transition-colors"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-700"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Filter Tabs */}
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  {(["all", "unread", "read", "important", "pinned", "archived"] as NotificationFilter[]).map((filterOption) => (
                    <Button
                      key={filterOption}
                      variant={filter === filterOption ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilter(filterOption)}
                      className={cn(
                        "flex items-center space-x-2 transition-all duration-200",
                        filter === filterOption 
                          ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25" 
                          : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                      )}
                    >
                      {getFilterIcon(filterOption)}
                      <span className="capitalize">{filterOption}</span>
                      {filterOption === "unread" && stats.unread > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 text-xs bg-white/20 text-current border-0">
                          {stats.unread}
                        </Badge>
                      )}
                      {filterOption === "important" && stats.important > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 text-xs bg-white/20 text-current border-0">
                          {stats.important}
                        </Badge>
                      )}
                      {filterOption === "pinned" && stats.pinned > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 text-xs bg-white/20 text-current border-0">
                          {stats.pinned}
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>

                {/* Advanced Controls */}
                <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
                  <div className="flex flex-wrap items-center gap-2 md:gap-3">
                    {/* Type Filter */}
                    <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as NotificationTypeFilter)}>
                      <SelectTrigger className="w-full sm:w-[160px] border-slate-200 dark:border-slate-700">
                        <FilterIcon className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter by type" />
                      </SelectTrigger>
                      <SelectContent className="border-slate-200 dark:border-slate-700">
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="task">📋 Tasks</SelectItem>
                        <SelectItem value="project">📁 Projects</SelectItem>
                        <SelectItem value="mention">@️ Mentions</SelectItem>
                        <SelectItem value="comment">💬 Comments</SelectItem>
                        <SelectItem value="system">⚙️ System</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Group By */}
                    <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupBy)}>
                      <SelectTrigger className="w-full sm:w-[140px] border-slate-200 dark:border-slate-700">
                        <Layers className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-slate-200 dark:border-slate-700">
                        <SelectItem value="none">No Grouping</SelectItem>
                        <SelectItem value="date">By Date</SelectItem>
                        <SelectItem value="type">By Type</SelectItem>
                        <SelectItem value="priority">By Priority</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Sort */}
                    <Select value={sortBy} onValueChange={(value) => setSortBy(value as "date" | "priority" | "type")}>
                      <SelectTrigger className="w-full sm:w-[140px] border-slate-200 dark:border-slate-700">
                        <SortAsc className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-slate-200 dark:border-slate-700">
                        <SelectItem value="date">📅 Date</SelectItem>
                        <SelectItem value="priority">⚡ Priority</SelectItem>
                        <SelectItem value="type">📂 Type</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* View Mode */}
                    <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1">
                      {(["list", "grid", "compact"] as ViewMode[]).map((mode) => (
                        <Button
                          key={mode}
                          variant={viewMode === mode ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setViewMode(mode)}
                          className={cn(
                            "h-8 px-3 rounded-md transition-all duration-200",
                            viewMode === mode 
                              ? "bg-white dark:bg-slate-700 shadow-sm" 
                              : "hover:bg-white/50 dark:hover:bg-slate-700/50"
                          )}
                        >
                          {getViewModeIcon(mode)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    {notifications.length > 0 && (
                      <Button
                        variant={selectionMode ? "default" : "outline"}
                        size="sm"
                        onClick={toggleSelectionMode}
                        className="border-slate-200 dark:border-slate-700"
                      >
                        <CheckSquare className="mr-2 h-4 w-4" />
                        {selectionMode ? "Cancel" : "Select"}
                      </Button>
                    )}
                    
                    {stats.unread > 0 && !selectionMode && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleMarkAllAsRead}
                        disabled={isMarkingAsRead}
                        className="border-slate-200 dark:border-slate-700"
                      >
                        <CheckCheck className="mr-2 h-4 w-4" />
                        Mark all read
                      </Button>
                    )}
                    
                    {notifications.length > 0 && !selectionMode && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/20"
                        onClick={handleClearAllNotifications}
                        disabled={isClearing}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear all
                      </Button>
                    )}
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="border-slate-200 dark:border-slate-700"
                            onClick={() => setAnalyticsOpen(true)}
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View Analytics</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="border-slate-200 dark:border-slate-700"
                            onClick={() => setPreferencesOpen(true)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Notification Preferences</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </CardContent>
            </Card>
          </BlurFade>

          {/* Enhanced Notifications List */}
          <BlurFade delay={0.3}>
            <div className="space-y-6">
              {isLoading ? (
                <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
                  <CardContent className="flex h-40 items-center justify-center">
                    <div className="flex items-center space-x-4">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                      <span className="text-slate-600 dark:text-slate-400">Loading notifications...</span>
                    </div>
                  </CardContent>
                </Card>
              ) : filteredNotifications.length === 0 ? (
                <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
                  <CardContent className="flex flex-col items-center justify-center py-20">
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      className="mb-6 w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 flex items-center justify-center"
                    >
                      <Bell className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                    </motion.div>
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                      className="text-center space-y-4"
                    >
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                        {searchQuery ? "No matching notifications" : 
                         filter === "unread" ? "All caught up!" :
                         filter === "read" ? "No read notifications" :
                         filter === "important" ? "No important notifications" :
                         filter === "pinned" ? "No pinned notifications" :
                         filter === "archived" ? "No archived notifications" :
                         "No notifications yet"}
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400 max-w-md">
                        {searchQuery ? "Try adjusting your search terms or use different filters to find what you're looking for." : 
                         filter === "unread" ? "You've read all your notifications. Great job staying on top of things!" :
                         filter === "read" ? "Mark some notifications as read to see them here." :
                         filter === "important" ? "Important notifications will appear here when you receive them." :
                         filter === "pinned" ? "Pin notifications to keep them easily accessible." :
                         filter === "archived" ? "Archived notifications will appear here. Archive old notifications to declutter your inbox." :
                         "You're all set! New notifications will appear here when you receive them."}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                        {searchQuery && (
                          <Button 
                            variant="outline" 
                            onClick={() => setSearchQuery("")}
                            className="border-slate-200 dark:border-slate-700"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Clear search
                          </Button>
                        )}
                        {filter !== "all" && !searchQuery && (
                          <Button 
                            variant="outline" 
                            onClick={() => setFilter("all")}
                            className="border-slate-200 dark:border-slate-700"
                          >
                            <Bell className="h-4 w-4 mr-2" />
                            View all notifications
                          </Button>
                        )}
                        {(filter === "unread" || filter === "all") && !searchQuery && notifications.length === 0 && (
                          <Button 
                            variant="outline" 
                            onClick={() => refetch()}
                            className="border-slate-200 dark:border-slate-700"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Check for updates
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {groupedNotifications.map((group, groupIndex) => (
                    <motion.div
                      key={group.title || "ungrouped"}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: groupIndex * 0.1 }}
                    >
                      {group.title && groupBy !== "none" && (
                        <div className="flex items-center space-x-4 mb-4">
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                            {group.title}
                          </h3>
                          <Badge variant="secondary" className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {group.notifications.length}
                          </Badge>
                          <Separator className="flex-1" />
                        </div>
                      )}
                      
                      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 overflow-hidden">
                        <CardContent className="p-0">
                          <div className={cn(
                            "divide-y divide-slate-100 dark:divide-slate-800",
                            viewMode === "grid" && "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 divide-y-0"
                          )}>
                            <AnimatePresence>
                              {group.notifications.map((notification, notifIndex) => {
                                const absoluteIndex = filteredNotifications.findIndex(n => n.id === notification.id);
                                return (
                                  <motion.div
                                    key={notification.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ delay: notifIndex * 0.05, duration: 0.3 }}
                                    className={cn(
                                      viewMode === "grid" && "border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800"
                                    )}
                                  >
                                    <NotificationItem
                                      notification={notification}
                                      isCompact={viewMode === "compact"}
                                      selectionMode={selectionMode}
                                      isSelected={selectedNotifications.has(notification.id)}
                                      onToggleSelect={toggleNotificationSelection}
                                      isFocused={absoluteIndex === focusedIndex}
                                    />
                                  </motion.div>
                                );
                              })}
                            </AnimatePresence>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </BlurFade>

          {/* Load More Button */}
          {hasNextPage && filteredNotifications.length > 0 && (
            <BlurFade delay={0.4}>
              <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
                <CardContent className="p-6">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Loading more...
                      </>
                    ) : (
                      <>
                        <ChevronDown className="mr-2 h-4 w-4" />
                        Load More Notifications
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </BlurFade>
          )}

          {/* Enhanced Footer */}
          {notifications.length > 0 && (
            <BlurFade delay={0.4}>
              <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
                <CardContent className="p-6">
                  <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                    <div className="flex items-center space-x-6">
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        Showing <span className="font-medium text-slate-900 dark:text-slate-100">{filteredNotifications.length}</span> of <span className="font-medium text-slate-900 dark:text-slate-100">{pagination?.total || notifications.length}</span> total notifications
                      </div>
                      {filteredNotifications.length !== notifications.length && (
                        <Badge variant="outline" className="text-xs border-slate-200 dark:border-slate-700">
                          {notifications.length - filteredNotifications.length} filtered out
                        </Badge>
                      )}
                      {hasNextPage && (
                        <Badge variant="outline" className="text-xs border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400">
                          More available
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                        <Activity className="mr-2 h-4 w-4" />
                        Activity
                      </Button>
                      <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Analytics
                      </Button>
                      <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                        <Archive className="mr-2 h-4 w-4" />
                        Archive
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </BlurFade>
          )}
        </div>

        {/* Floating Action Bar for Batch Operations */}
        <AnimatePresence>
          {selectionMode && selectedNotifications.size > 0 && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50"
            >
              <Card className="shadow-2xl border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
                      <CheckSquare className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">
                        {selectedNotifications.size} selected
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleSelectAll}
                      className="border-slate-200 dark:border-slate-700"
                    >
                      {selectedNotifications.size === filteredNotifications.length ? (
                        <>
                          <Square className="mr-2 h-4 w-4" />
                          Deselect All
                        </>
                      ) : (
                        <>
                          <CheckSquare className="mr-2 h-4 w-4" />
                          Select All
                        </>
                      )}
                    </Button>

                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBatchMarkRead}
                      disabled={isBatchMarkingRead}
                      className="border-slate-200 dark:border-slate-700"
                    >
                      <CheckCheck className="mr-2 h-4 w-4" />
                      Mark Read
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBatchArchive}
                      disabled={isBatchArchiving}
                      className="border-slate-200 dark:border-slate-700"
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      Archive
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBatchDelete}
                      disabled={isBatchDeleting}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>

                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleSelectionMode}
                      className="text-slate-600 dark:text-slate-400"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notification Preferences Dialog */}
        <NotificationPreferencesDialog
          open={preferencesOpen}
          onOpenChange={setPreferencesOpen}
          currentPreferences={preferences}
          onSave={handleSavePreferences}
        />

        {/* Notification Analytics Modal */}
        <NotificationAnalyticsModal
          open={analyticsOpen}
          onOpenChange={setAnalyticsOpen}
          stats={stats}
          notifications={notifications}
        />
      </div>
    </LazyDashboardLayout>
  );
} 