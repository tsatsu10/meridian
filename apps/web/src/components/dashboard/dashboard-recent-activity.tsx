import { useMemo, useState, useCallback, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCircle, FolderOpen, Plus, Target, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const priorityColors = {
  low: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  urgent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const activityIcons = {
  task_completed: CheckCircle,
  task_created: Plus,
  project_created: FolderOpen,
  team_joined: Users,
  "auto-status-update": Target,
};

export type ActivityFilterTab = "all" | "attention" | "mentions" | "completed";

export interface DashboardActivityFeedItem {
  id: string;
  type: string;
  title: string;
  message?: string;
  /** ISO 8601 */
  timestamp: string;
  isRead: boolean;
  priority: "low" | "medium" | "high" | "urgent";
  projectId?: string;
}

const FILTER_KEYS: ActivityFilterTab[] = ["all", "attention", "mentions", "completed"];

function formatActivityTimeLine(iso: string, currentTime: Date): string {
  const targetDate = new Date(iso);
  if (Number.isNaN(targetDate.getTime())) return "Unknown";

  const diff = currentTime.getTime() - targetDate.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "Just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;

  return targetDate.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...(currentTime.getFullYear() !== targetDate.getFullYear() ? { year: "numeric" } : {}),
  });
}

function formatGroupLabel(timestamp: string, currentTime: Date): string {
  const targetDate = new Date(timestamp);
  if (Number.isNaN(targetDate.getTime())) return "Earlier";

  const midnight = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const currentMidnight = midnight(currentTime);
  const targetMidnight = midnight(targetDate);
  const diffDays = Math.round((currentMidnight.getTime() - targetMidnight.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";

  return targetDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: currentTime.getFullYear() === targetDate.getFullYear() ? undefined : "numeric",
  });
}

export interface DashboardRecentActivityProps {
  feedWindow: DashboardActivityFeedItem[];
  currentTime: Date;
  workspaceId: string | undefined;
}

export function DashboardRecentActivity({ feedWindow, currentTime, workspaceId }: DashboardRecentActivityProps) {
  const [activityFilter, setActivityFilter] = useState<ActivityFilterTab>("all");
  const tabButtonRefs = useRef<Record<ActivityFilterTab, HTMLButtonElement | null>>({
    all: null,
    attention: null,
    mentions: null,
    completed: null,
  });

  const unreadCount = useMemo(
    () => feedWindow.filter((notification) => !notification.isRead).length,
    [feedWindow]
  );

  const attentionCount = useMemo(
    () =>
      feedWindow.filter((notification) => {
        const hasHighPriority = ["high", "urgent"].includes((notification.priority || "").toLowerCase());
        const hasAlertIcon = notification.title?.includes("🚨");
        return hasHighPriority || hasAlertIcon;
      }).length,
    [feedWindow]
  );

  const mentionCount = useMemo(
    () =>
      feedWindow.filter((notification) =>
        Boolean(notification.message?.includes("@") || notification.title?.includes("@"))
      ).length,
    [feedWindow]
  );

  const completedCount = useMemo(
    () => feedWindow.filter((notification) => notification.type === "task_completed").length,
    [feedWindow]
  );

  const filters: Array<{ key: ActivityFilterTab; label: string; count: number }> = [
    { key: "all", label: "All updates", count: feedWindow.length },
    { key: "attention", label: "Needs attention", count: attentionCount },
    { key: "mentions", label: "Mentions", count: mentionCount },
    { key: "completed", label: "Member wins", count: completedCount },
  ];

  const filteredNotifications = useMemo(() => {
    switch (activityFilter) {
      case "attention":
        return feedWindow.filter((notification) => {
          const hasHighPriority = ["high", "urgent"].includes((notification.priority || "").toLowerCase());
          const hasAlertIcon = notification.title?.includes("🚨");
          return hasHighPriority || hasAlertIcon || !notification.isRead;
        });
      case "mentions":
        return feedWindow.filter((notification) =>
          Boolean(notification.message?.includes("@") || notification.title?.includes("@"))
        );
      case "completed":
        return feedWindow.filter((notification) => notification.type === "task_completed");
      default:
        return feedWindow;
    }
  }, [activityFilter, feedWindow]);

  const groupedNotifications = useMemo(() => {
    const groups = filteredNotifications.reduce<Record<string, typeof filteredNotifications>>((acc, notification) => {
      const label = formatGroupLabel(notification.timestamp, currentTime);
      acc[label] = acc[label] ? [...acc[label], notification] : [notification];
      return acc;
    }, {});

    return Object.entries(groups).map(([label, items]) => ({
      label,
      items: items.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    }));
  }, [filteredNotifications, currentTime]);

  const focusTab = useCallback((key: ActivityFilterTab) => {
    setActivityFilter(key);
    requestAnimationFrame(() => {
      tabButtonRefs.current[key]?.focus();
    });
  }, []);

  const handleTabListKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const idx = FILTER_KEYS.indexOf(activityFilter);
      if (idx < 0) return;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        const next = FILTER_KEYS[(idx + 1) % FILTER_KEYS.length];
        focusTab(next);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        const next = FILTER_KEYS[(idx - 1 + FILTER_KEYS.length) % FILTER_KEYS.length];
        focusTab(next);
      } else if (e.key === "Home") {
        e.preventDefault();
        focusTab(FILTER_KEYS[0]);
      } else if (e.key === "End") {
        e.preventDefault();
        focusTab(FILTER_KEYS[FILTER_KEYS.length - 1]);
      }
    },
    [activityFilter, focusTab]
  );

  const viewAllSearch = activityFilter === "all" ? undefined : { segment: activityFilter };

  return (
    <Card className="glass-card border border-border/60 shadow-sm">
      <CardHeader className="space-y-4 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-600" />
              Recent Activity
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Track project shifts, member wins, and items that still need follow-up.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {unreadCount > 0 ? (
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                {unreadCount} unread
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Up to date
              </Badge>
            )}
            <Link to="/dashboard/activity" {...(viewAllSearch ? { search: viewAllSearch } : {})} className="inline-flex">
              <Button variant="ghost" size="sm" className="h-8 px-3">
                View all
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 dark:border-blue-900/40 dark:bg-blue-900/20 p-3">
            <p className="text-xs text-blue-700 dark:text-blue-200 font-medium">Unread updates</p>
            <p className="text-2xl font-semibold text-blue-800 dark:text-blue-100 mt-1">{unreadCount}</p>
            <p className="text-xs text-muted-foreground mt-1">In latest feed (sorted)</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-900/20 p-3">
            <p className="text-xs text-amber-700 dark:text-amber-200 font-medium">Needs attention</p>
            <p className="text-2xl font-semibold text-amber-800 dark:text-amber-100 mt-1">{attentionCount}</p>
            <p className="text-xs text-muted-foreground mt-1">High-priority or unread alerts</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 dark:border-emerald-900/30 dark:bg-emerald-900/20 p-3">
            <p className="text-xs text-emerald-700 dark:text-emerald-200 font-medium">Member wins</p>
            <p className="text-2xl font-semibold text-emerald-800 dark:text-emerald-100 mt-1">{completedCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Completed updates logged</p>
          </div>
        </div>

        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label="Filter recent activity"
          onKeyDown={handleTabListKeyDown}
        >
          {filters.map((filter) => {
            const selected = activityFilter === filter.key;
            return (
              <button
                key={filter.key}
                ref={(el) => {
                  tabButtonRefs.current[filter.key] = el;
                }}
                type="button"
                role="tab"
                id={`activity-filter-${filter.key}`}
                aria-selected={selected}
                aria-controls="activity-feed-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => setActivityFilter(filter.key)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  selected
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-muted/40 border-border/60 text-muted-foreground hover:bg-muted/60"
                )}
              >
                <span>{filter.label}</span>
                <span
                  className={cn(
                    "inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full px-2 text-[10px] font-semibold",
                    selected ? "bg-white/20 text-white" : "bg-white/70 text-muted-foreground"
                  )}
                >
                  {filter.count}
                </span>
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent
        id="activity-feed-panel"
        role="tabpanel"
        aria-labelledby={`activity-filter-${activityFilter}`}
        aria-live="polite"
        className="space-y-6"
      >
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-muted-foreground/20 bg-muted/30 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">No recent activity right now</p>
              <p className="text-xs text-muted-foreground mt-1">Great job—everything is up to date for this filter.</p>
            </div>
          </div>
        ) : (
          groupedNotifications.map((group) => (
            <div key={group.label} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-px w-6 bg-border/70" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </span>
              </div>
              <ul className="space-y-3 list-none p-0 m-0" role="list">
                {group.items.map((notification) => {
                  const Icon = activityIcons[notification.type as keyof typeof activityIcons] || Target;
                  const priorityClass =
                    notification.priority && priorityColors[notification.priority as keyof typeof priorityColors];

                  const projectHref =
                    workspaceId && notification.projectId
                      ? {
                          to: "/dashboard/workspace/$workspaceId/project/$projectId/list" as const,
                          params: { workspaceId, projectId: notification.projectId },
                        }
                      : null;

                  const inner = (
                    <>
                      <span
                        className={cn(
                          "absolute left-1 top-4 h-2 w-2 rounded-full",
                          notification.isRead ? "bg-muted-foreground/40" : "bg-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.15)]"
                        )}
                      />
                      <div
                        className={cn(
                          "rounded-xl border p-3 transition-all hover:border-blue-200/70",
                          notification.isRead
                            ? "bg-muted/30 border-border/60"
                            : "bg-blue-50/70 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/40",
                          projectHref && "cursor-pointer"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-background",
                                notification.isRead ? "border-border/70" : "border-blue-200 text-blue-600"
                              )}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold leading-tight">{notification.title}</p>
                              {notification.message && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{notification.message}</p>
                              )}
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                {notification.priority && (
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-[10px] uppercase tracking-wide",
                                      priorityClass || "bg-muted/40 text-muted-foreground"
                                    )}
                                  >
                                    {notification.priority}
                                  </Badge>
                                )}
                                {notification.isRead ? (
                                  <span className="text-[11px] text-muted-foreground">Acknowledged</span>
                                ) : (
                                  <span className="text-[11px] font-medium text-blue-600">Needs review</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatActivityTimeLine(notification.timestamp, currentTime)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  );

                  return (
                    <li key={notification.id} className="relative pl-6">
                      {projectHref ? (
                        <Link {...projectHref} className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                          {inner}
                        </Link>
                      ) : (
                        inner
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
