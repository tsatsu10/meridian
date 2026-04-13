// 🎨 Complete Task Details Redesign - Modern, Clean, Functional
import { useState, useCallback } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  MoreVertical,
  Clock,
  Calendar,
  User,
  Tag,
  CheckCircle2,
  Circle,
  AlertCircle,
  Paperclip,
  MessageSquare,
  Activity,
  Edit2,
  Trash2,
  Copy,
  Share2,
  Star,
  StarOff,
  Play,
  Pause,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Zap,
  TrendingUp,
  Users,
  Eye,
  EyeOff,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

// Components
import PageTitle from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

// Hooks
import useGetTask from "@/hooks/queries/task/use-get-task";
import useGetTasks from "@/hooks/queries/task/use-get-tasks";
import useUpdateTask from "@/hooks/mutations/task/use-update-task";
import useDeleteTask from "@/hooks/mutations/task/use-delete-task";
import { cn } from "@/lib/utils";

export const Route = createFileRoute(
  "/dashboard/workspace/$workspaceId/project/$projectId/task/$taskId",
)({
  component: TaskDetailsPage,
});

// 🎨 Modern Task Details Page
function TaskDetailsPage() {
  const { taskId, workspaceId, projectId } = Route.useParams();
  const navigate = useNavigate();
  const { data: task, isLoading } = useGetTask(taskId);
  const { data: project } = useGetTasks(projectId);
  const { mutateAsync: updateTask } = useUpdateTask();
  const { mutateAsync: deleteTask } = useDeleteTask();

  const [isWatching, setIsWatching] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    description: true,
    subtasks: true,
    comments: true,
    files: false,
    time: false,
    activity: false,
  });

  // ⚡ Quick Actions
  const handleBack = useCallback(() => {
    navigate({
      to: "/dashboard/workspace/$workspaceId/project/$projectId/board",
      params: { workspaceId, projectId },
    });
  }, [navigate, workspaceId, projectId]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard");
  }, []);

  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({
        title: task?.title || "Task",
        url: window.location.href,
      });
    } else {
      handleCopyLink();
    }
  }, [task, handleCopyLink]);

  const handleWatch = useCallback(() => {
    setIsWatching(!isWatching);
    toast.success(isWatching ? "Stopped watching" : "Now watching this task");
  }, [isWatching]);

  const handleTimerToggle = useCallback(() => {
    setIsTimerRunning(!isTimerRunning);
    toast.success(isTimerRunning ? "Timer stopped" : "Timer started");
  }, [isTimerRunning]);

  const handleDelete = useCallback(async () => {
    if (confirm("Are you sure you want to delete this task?")) {
      try {
        await deleteTask({ id: taskId, userEmail: "user@meridian.app" });
        toast.success("Task deleted");
        handleBack();
      } catch (error) {
        toast.error("Failed to delete task");
      }
    }
  }, [deleteTask, taskId, handleBack]);

  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // 📊 Computed Values
  const statusColor = {
    todo: "bg-zinc-500",
    in_progress: "bg-blue-500",
    review: "bg-amber-500",
    done: "bg-green-500",
    blocked: "bg-red-500",
  }[task?.status || "todo"];

  const priorityColor = {
    low: "text-zinc-600 dark:text-zinc-400",
    medium: "text-blue-600 dark:text-blue-400",
    high: "text-amber-600 dark:text-amber-400",
    urgent: "text-red-600 dark:text-red-400",
  }[task?.priority || "medium"];

  // 🎨 Loading State
  if (isLoading) {
    return <TaskDetailsSkeleton />;
  }

  if (!task) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-3">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground" />
          <p className="text-lg font-medium">Task not found</p>
          <Button onClick={handleBack}>Back to Board</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageTitle
        title={`${project?.slug}-${task.number} · ${task.title}`}
        hideAppName
      />

      <div className="h-full flex flex-col bg-background">
        {/* ✨ Sticky Header */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        >
          <div className="flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4">
            {/* Back Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="shrink-0"
              aria-label="Back to board"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Back</span>
            </Button>

            {/* Task ID & Title */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <code className="text-xs font-mono text-muted-foreground px-2 py-0.5 bg-muted rounded">
                  {project?.slug}-{task.number}
                </code>
                <h1 className="text-lg sm:text-xl font-semibold truncate">
                  {task.title}
                </h1>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* Watch */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleWatch}
                className={cn(isWatching && "text-amber-600")}
                aria-label={isWatching ? "Stop watching" : "Watch task"}
              >
                {isWatching ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
                <span className="hidden sm:inline ml-2">
                  {isWatching ? "Watching" : "Watch"}
                </span>
              </Button>

              {/* Timer */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleTimerToggle}
                className={cn(isTimerRunning && "text-green-600")}
                aria-label={isTimerRunning ? "Stop timer" : "Start timer"}
              >
                {isTimerRunning ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                <span className="hidden sm:inline ml-2">
                  {isTimerRunning ? "Stop" : "Start"}
                </span>
              </Button>

              {/* More Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" aria-label="More actions">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleCopyLink}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleShare}>
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Task
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </motion.header>

        {/* 📱 Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              {/* 📝 Main Column */}
              <div className="lg:col-span-2 space-y-6">
                {/* Description Section */}
                <Section
                  title="Description"
                  icon={<Edit2 className="w-4 h-4" />}
                  isExpanded={expandedSections.description}
                  onToggle={() => toggleSection("description")}
                  actions={
                    <Button variant="ghost" size="sm">
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                  }
                >
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {task.description || (
                      <p className="text-muted-foreground italic">
                        No description provided
                      </p>
                    )}
                  </div>
                </Section>

                {/* Subtasks Section */}
                <Section
                  title="Subtasks"
                  icon={<CheckSquare className="w-4 h-4" />}
                  isExpanded={expandedSections.subtasks}
                  onToggle={() => toggleSection("subtasks")}
                  badge={<Badge variant="secondary">0</Badge>}
                  actions={
                    <Button variant="ghost" size="sm">
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  }
                >
                  <p className="text-sm text-muted-foreground">No subtasks yet</p>
                </Section>

                {/* Comments Section */}
                <Section
                  title="Comments"
                  icon={<MessageSquare className="w-4 h-4" />}
                  isExpanded={expandedSections.comments}
                  onToggle={() => toggleSection("comments")}
                  badge={<Badge variant="secondary">0</Badge>}
                >
                  <p className="text-sm text-muted-foreground">
                    No comments yet. Be the first to comment!
                  </p>
                </Section>

                {/* Files Section */}
                <Section
                  title="Files"
                  icon={<Paperclip className="w-4 h-4" />}
                  isExpanded={expandedSections.files}
                  onToggle={() => toggleSection("files")}
                  badge={<Badge variant="secondary">0</Badge>}
                  actions={
                    <Button variant="ghost" size="sm">
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  }
                >
                  <p className="text-sm text-muted-foreground">No files attached</p>
                </Section>

                {/* Activity Section */}
                <Section
                  title="Activity"
                  icon={<Activity className="w-4 h-4" />}
                  isExpanded={expandedSections.activity}
                  onToggle={() => toggleSection("activity")}
                >
                  <div className="space-y-3">
                    <ActivityItem
                      user="Sarah Chen"
                      action="created this task"
                      time="2 hours ago"
                    />
                  </div>
                </Section>
              </div>

              {/* 🎯 Sidebar Column */}
              <div className="space-y-6">
                {/* Quick Info Card */}
                <div className="rounded-lg border bg-card p-4 space-y-4">
                  <h3 className="font-semibold text-sm">Task Details</h3>

                  {/* Status */}
                  <InfoRow label="Status">
                    <Badge className={cn("capitalize", statusColor)}>
                      {task.status?.replace("_", " ")}
                    </Badge>
                  </InfoRow>

                  {/* Priority */}
                  <InfoRow label="Priority">
                    <span className={cn("capitalize font-medium", priorityColor)}>
                      {task.priority}
                    </span>
                  </InfoRow>

                  {/* Assignee */}
                  <InfoRow label="Assignee">
                    {task.userEmail ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs">
                            {task.userEmail[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{task.userEmail}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Unassigned</span>
                    )}
                  </InfoRow>

                  {/* Due Date */}
                  <InfoRow label="Due Date">
                    {task.dueDate ? (
                      <span className="text-sm">
                        {format(new Date(task.dueDate), "MMM d, yyyy")}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Not set</span>
                    )}
                  </InfoRow>

                  {/* Created */}
                  <InfoRow label="Created">
                    <span className="text-sm text-muted-foreground">
                      {task.createdAt
                        ? format(new Date(task.createdAt), "MMM d, yyyy")
                        : "Unknown"}
                    </span>
                  </InfoRow>
                </div>

                {/* Progress Card */}
                <div className="rounded-lg border bg-card p-4 space-y-4">
                  <h3 className="font-semibold text-sm">Progress</h3>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Completion</span>
                      <span className="font-medium">0%</span>
                    </div>
                    <Progress value={0} className="h-2" />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Time Tracked</span>
                      <span className="font-medium">0h</span>
                    </div>
                  </div>
                </div>

                {/* People Card */}
                <div className="rounded-lg border bg-card p-4 space-y-4">
                  <h3 className="font-semibold text-sm">People</h3>

                  <div className="space-y-3">
                    <InfoRow label="Watchers">
                      <Badge variant="secondary">0</Badge>
                    </InfoRow>

                    <InfoRow label="Contributors">
                      <Badge variant="secondary">1</Badge>
                    </InfoRow>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// 🧩 Reusable Components

interface SectionProps {
  title: string;
  icon?: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

function Section({
  title,
  icon,
  isExpanded,
  onToggle,
  badge,
  actions,
  children,
}: SectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border bg-card overflow-hidden"
    >
      <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
        <button
          onClick={onToggle}
          className="flex-1 flex items-center gap-3 text-left"
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${title} section`}
        >
          {icon && <div className="text-muted-foreground">{icon}</div>}
          <h2 className="font-semibold text-base">{title}</h2>
          {badge}
        </button>
        <div className="flex items-center gap-2 shrink-0">
          {actions}
          <button
            onClick={onToggle}
            className="p-1 hover:bg-muted rounded transition-colors"
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${title} section`}
          >
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </motion.div>
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 border-t">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface InfoRowProps {
  label: string;
  children: React.ReactNode;
}

function InfoRow({ label, children }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div>{children}</div>
    </div>
  );
}

interface ActivityItemProps {
  user: string;
  action: string;
  time: string;
}

function ActivityItem({ user, action, time }: ActivityItemProps) {
  return (
    <div className="flex gap-3">
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarFallback className="text-xs">{user[0]}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-medium">{user}</span>{" "}
          <span className="text-muted-foreground">{action}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{time}</p>
      </div>
    </div>
  );
}

// 💀 Loading Skeleton
function TaskDetailsSkeleton() {
  return (
    <div className="h-full flex flex-col bg-background">
      <div className="border-b p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-6 flex-1 max-w-md" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full rounded-lg" />
            ))}
          </div>
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
