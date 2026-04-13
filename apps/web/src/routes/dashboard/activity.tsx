"use client";

import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  Activity as ActivityIcon,
  Filter,
  Search,
  RefreshCw,
  Briefcase,
  CheckCircle2,
  Users,
  Clock,
  Loader2,
  Globe2,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import LazyDashboardLayout from "@/components/performance/lazy-dashboard-layout";
import { getActivities, type Activity } from "@/fetchers/activity/get-activities";
import useWorkspaceStore from "@/store/workspace";
import { cn } from "@/lib/cn";

type ActivityTypeFilter = "all" | "task" | "project" | "team" | "workspace" | "comment";
type TimeRangeFilter = "7d" | "30d" | "90d" | "all";

const PAGE_SIZE = 25;

type DashboardActivitySegment = "attention" | "mentions" | "completed";

export const Route = createFileRoute("/dashboard/activity")({
  component: ActivityCenter,
  validateSearch: (search: Record<string, unknown>) => {
    const s = search.segment;
    if (s === "attention" || s === "mentions" || s === "completed") {
      return { segment: s as DashboardActivitySegment };
    }
    return {};
  },
});

function ActivityCenter() {
  const { segment } = Route.useSearch();
  const { workspace } = useWorkspaceStore();
  const [typeFilter, setTypeFilter] = useState<ActivityTypeFilter>("all");
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>("30d");
  const [search, setSearch] = useState("");

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ["workspace-activities", workspace?.id, typeFilter],
    enabled: !!workspace?.id,
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.activities.length < PAGE_SIZE ? undefined : pages.length * PAGE_SIZE,
    queryFn: async ({ pageParam }) => {
      if (!workspace?.id) {
        return { activities: [] };
      }

      return getActivities({
        workspaceId: workspace.id,
        limit: PAGE_SIZE,
        offset: pageParam,
        entityType: typeFilter === "all" ? undefined : typeFilter,
      });
    },
  });

  const allActivities = useMemo(
    () => data?.pages.flatMap((page) => page.activities) ?? [],
    [data]
  );

  const filteredActivities = useMemo(() => {
    const query = search.trim().toLowerCase();
    const cutoff = getCutoffDate(timeRange);

    return allActivities.filter((activity) => {
      if (cutoff && new Date(activity.createdAt) < cutoff) {
        return false;
      }

      if (!query) return true;

      return (
        activity.action?.toLowerCase().includes(query) ||
        activity.description?.toLowerCase().includes(query) ||
        activity.entityTitle?.toLowerCase().includes(query) ||
        activity.user?.username?.toLowerCase().includes(query) ||
        activity.user?.email?.toLowerCase().includes(query)
      );
    });
  }, [allActivities, search, timeRange]);

  const displayActivities = useMemo(() => {
    if (!segment) return filteredActivities;
    if (segment === "mentions") {
      return filteredActivities.filter((a) =>
        Boolean(a.description?.includes("@") || a.entityTitle?.includes("@"))
      );
    }
    if (segment === "completed") {
      return filteredActivities.filter((a) => a.action === "completed");
    }
    if (segment === "attention") {
      return filteredActivities.filter((a) => {
        if (a.description?.includes("🚨")) return true;
        const p = a.metadata?.priority as string | undefined;
        if (p === "high" || p === "urgent") return true;
        return false;
      });
    }
    return filteredActivities;
  }, [filteredActivities, segment]);

  const stats = useMemo(() => {
    const total = displayActivities.length;
    const tasks = displayActivities.filter((a) => a.entityType === "task").length;
    const projects = displayActivities.filter((a) => a.entityType === "project").length;
    const team = displayActivities.filter((a) => a.entityType === "team").length;
    const workspaceEvents = displayActivities.filter((a) => a.entityType === "workspace").length;

    return {
      total,
      tasks,
      projects,
      team,
      workspaceEvents,
    };
  }, [displayActivities]);

  const isEmptyState = !isLoading && displayActivities.length === 0;

  return (
    <LazyDashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Recent Activity</h1>
          <p className="text-muted-foreground">
            Explore all workspace updates with richer detail, timeline filters, and quick navigation.
          </p>
          {segment ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-2 text-sm text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-100">
              Showing the <span className="font-medium">{segment}</span> view from the dashboard.{" "}
              <Link to="/dashboard/activity" search={{}} className="underline underline-offset-2">
                Clear segment filter
              </Link>
            </div>
          ) : null}
        </div>

        <Card className="border-border/60">
          <CardContent className="py-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <ActivityStat
              icon={ActivityIcon}
              label="Total Events"
              value={stats.total}
              accent="bg-blue-500/10 text-blue-600 dark:text-blue-300"
            />
            <ActivityStat
              icon={CheckCircle2}
              label="Task Updates"
              value={stats.tasks}
              accent="bg-green-500/10 text-green-600 dark:text-green-300"
            />
            <ActivityStat
              icon={Briefcase}
              label="Project Changes"
              value={stats.projects}
              accent="bg-purple-500/10 text-purple-600 dark:text-purple-300"
            />
            <ActivityStat
              icon={Users}
              label="Team Activity"
              value={stats.team}
              accent="bg-orange-500/10 text-orange-600 dark:text-orange-300"
            />
            <ActivityStat
              icon={Globe2}
              label="Workspace Events"
              value={stats.workspaceEvents}
              accent="bg-cyan-500/10 text-cyan-600 dark:text-cyan-300"
            />
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="py-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Filters</span>
              </div>

              <Select value={typeFilter} onValueChange={(value: ActivityTypeFilter) => setTypeFilter(value)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="task">Task updates</SelectItem>
                  <SelectItem value="project">Project events</SelectItem>
                  <SelectItem value="team">Team events</SelectItem>
                  <SelectItem value="workspace">Workspace events</SelectItem>
                  <SelectItem value="comment">Comments</SelectItem>
                </SelectContent>
              </Select>

              <Select value={timeRange} onValueChange={(value: TimeRangeFilter) => setTimeRange(value)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex-1 min-w-[180px] sm:max-w-xs">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by keyword, user, or project..."
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <Link to="/dashboard" className="hidden sm:inline-flex">
                  <Button variant="ghost" size="sm">
                    Back to dashboard
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isRefetching}
                  className="gap-2"
                >
                  <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span>Activity Timeline</span>
              <Badge variant="secondary" className="text-xs">
                {displayActivities.length} events
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <ActivitySkeleton />
            ) : isEmptyState ? (
              <EmptyActivityState />
            ) : (
              <div className="space-y-4">
                {displayActivities.map((activity) => (
                  <ActivityRow key={activity.id} activity={activity} />
                ))}
              </div>
            )}

            {displayActivities.length > 0 && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  disabled={!hasNextPage || isFetchingNextPage}
                  className="gap-2"
                >
                  {isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" />}
                  {hasNextPage ? "Load more" : "No more activity"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </LazyDashboardLayout>
  );
}

function ActivityStat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/40 px-4 py-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </div>
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", accent)}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}

function ActivityRow({ activity }: { activity: Activity }) {
  const iconConfig = getActivityIcon(activity);
  const description = activity.description || activity.action;
  const timestamp = new Date(activity.createdAt);

  return (
    <div className="relative rounded-xl border border-border/60 bg-card/90 p-4 transition hover:border-primary/40">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Avatar className="h-11 w-11 border border-border/60">
            {activity.user?.avatarUrl ? (
              <AvatarImage src={activity.user.avatarUrl} alt={activity.user.username} />
            ) : (
              <AvatarFallback className="bg-primary/10 text-primary">
                {activity.user?.username?.charAt(0)?.toUpperCase() || "A"}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold leading-none">
                {activity.user?.username || activity.user?.email || "Someone"}
              </span>
              <Badge variant="outline" className={cn("text-xs", iconConfig.badgeClass)}>
                {iconConfig.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground/80">
              {activity.entityTitle && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1">
                  <MessageSquare className="h-3 w-3" />
                  {activity.entityTitle}
                </span>
              )}
              {activity.projectId && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1">
                  <Briefcase className="h-3 w-3" />
                  Project #{activity.projectId}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start gap-1 text-xs text-muted-foreground sm:items-end">
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1">
            <Clock className="h-3 w-3" />
            {format(timestamp, "MMM d, yyyy • h:mm a")}
          </span>
          <span>{formatDistanceToNow(timestamp, { addSuffix: true })}</span>
        </div>
      </div>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-20 rounded-xl border border-border/40 bg-muted/60 animate-pulse" />
      ))}
    </div>
  );
}

function EmptyActivityState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <ActivityIcon className="h-10 w-10 text-muted-foreground/40" />
      <div>
        <p className="text-sm font-medium">No activity matches your filters yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Try widening your time range or resetting filters to see more events.
        </p>
      </div>
      <Separator className="max-w-[160px]" />
      <Link to="/dashboard">
        <Button variant="outline" size="sm">
          Return to dashboard
        </Button>
      </Link>
    </div>
  );
}

function getCutoffDate(range: TimeRangeFilter) {
  const now = Date.now();
  switch (range) {
    case "7d":
      return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now - 30 * 24 * 60 * 60 * 1000);
    case "90d":
      return new Date(now - 90 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

function getActivityIcon(activity: Activity) {
  switch (activity.entityType) {
    case "task":
      return {
        label: "Task",
        badgeClass: "border-blue-200 text-blue-600 bg-blue-50",
      };
    case "project":
      return {
        label: "Project",
        badgeClass: "border-purple-200 text-purple-600 bg-purple-50",
      };
    case "team":
      return {
        label: "Team",
        badgeClass: "border-orange-200 text-orange-600 bg-orange-50",
      };
    case "workspace":
      return {
        label: "Workspace",
        badgeClass: "border-cyan-200 text-cyan-600 bg-cyan-50",
      };
    case "comment":
      return {
        label: "Comment",
        badgeClass: "border-pink-200 text-pink-600 bg-pink-50",
      };
    default:
      return {
        label: "General",
        badgeClass: "border-muted-foreground/20 text-muted-foreground bg-muted/40",
      };
  }
}

