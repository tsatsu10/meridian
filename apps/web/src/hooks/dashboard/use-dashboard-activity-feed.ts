import { useMemo } from "react";
import { getNotificationsFromStore } from "@/hooks/mutations/task/use-auto-status-update";
import type { DashboardActivityFeedItem } from "@/components/dashboard/dashboard-recent-activity";

const DASHBOARD_ACTIVITY_FEED_WINDOW = 50;

function normalizeNotificationIsoTimestamp(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

type ActivityInput = {
  id?: string;
  type?: string;
  description?: string;
  occurredAt?: string;
  project?: string;
  projectId?: string;
};

export function useDashboardActivityFeed(activities: ActivityInput[] | undefined) {
  const autoNotifications = getNotificationsFromStore();

  return useMemo((): DashboardActivityFeedItem[] => {
    const notifications = Array.isArray(autoNotifications) ? autoNotifications : [];
    const storeRows: DashboardActivityFeedItem[] = notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      timestamp: normalizeNotificationIsoTimestamp(n.timestamp),
      isRead: n.isRead,
      priority:
        n.priority === "high" || n.priority === "medium" || n.priority === "low"
          ? n.priority
          : "medium",
    }));
    const apiRows: DashboardActivityFeedItem[] = (activities ?? []).map((activity, index) => ({
      id: `activity-${activity.id ?? index}`,
      type: activity.type ?? "update",
      title: activity.description ?? "Activity",
      message: activity.project ? `Project: ${activity.project}` : "",
      timestamp: activity.occurredAt ?? new Date().toISOString(),
      isRead: true,
      priority: "medium",
      projectId: activity.projectId,
    }));
    return [...storeRows, ...apiRows]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, DASHBOARD_ACTIVITY_FEED_WINDOW);
  }, [autoNotifications, activities]);
}
