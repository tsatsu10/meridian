import { Activity, AlertTriangle, Shield, Key } from "lucide-react";
import { useSecurityActivity } from "@/hooks/use-security-activity";

interface SecurityActivityTimelineProps {
  userId: string;
}

export function SecurityActivityTimeline({ userId }: SecurityActivityTimelineProps) {
  const { activities, loading } = useSecurityActivity(userId);

  if (loading) {
    return <div className="animate-pulse">Loading activity...</div>;
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start space-x-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
        >
          <div className="flex-shrink-0">
            {activity.type === 'auth' && (
              <Key className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            )}
            {activity.type === 'threat' && (
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            )}
            {activity.type === 'security' && (
              <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
            )}
            {activity.type === 'general' && (
              <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {activity.title}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {activity.description}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {new Date(activity.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}