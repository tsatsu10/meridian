// @epic-3.3-projects: Recent activity display for projects
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { 
  CheckCircle, 
  MessageSquare, 
  Plus, 
  User, 
  Target, 
  Award,
  Activity
} from "lucide-react";
import { cn } from "@/lib/cn";

interface ActivityItem {
  type: string;
  user: string;
  timestamp: string;
  description?: string;
}

interface ProjectActivityProps {
  activities: ActivityItem[];
  maxItems?: number;
  className?: string;
}

const activityIcons = {
  task_completed: CheckCircle,
  comment_added: MessageSquare,
  task_created: Plus,
  task_assigned: User,
  milestone_reached: Target,
  project_completed: Award,
};

const activityColors = {
  task_completed: "text-green-500",
  comment_added: "text-blue-500",
  task_created: "text-purple-500",
  task_assigned: "text-orange-500",
  milestone_reached: "text-yellow-500",
  project_completed: "text-emerald-500",
};

const activityDescriptions = {
  task_completed: "completed a task",
  comment_added: "added a comment",
  task_created: "created a task",
  task_assigned: "was assigned a task",
  milestone_reached: "reached a milestone",
  project_completed: "completed the project",
};

export function ProjectActivity({ activities, maxItems = 3, className }: ProjectActivityProps) {
  const displayActivities = activities.slice(0, maxItems);

  if (displayActivities.length === 0) {
    return (
      <div className={cn("p-3 bg-muted/30 rounded-lg", className)}>
        <div className="flex items-center text-sm text-muted-foreground">
          <Activity className="w-4 h-4 mr-2" />
          No recent activity
        </div>
      </div>
    );
  }

  return (
    <div className={cn("", className)}>
      <div className="space-y-2">
        {displayActivities.map((activity, index) => {
          const IconComponent = activityIcons[activity.type as keyof typeof activityIcons] || Activity;
          const iconColor = activityColors[activity.type as keyof typeof activityColors] || "text-muted-foreground";
          const description = activityDescriptions[activity.type as keyof typeof activityDescriptions] || "performed an action";

          return (
            <div key={index} className="flex items-start space-x-3">
              <div className={cn("flex-shrink-0 mt-0.5")}>
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                  <IconComponent className={cn("w-3 h-3", iconColor)} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm">
                    <span className="font-medium">{activity.user}</span>
                    <span className="text-muted-foreground ml-1">{description}</span>
                  </p>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {activity.timestamp}
                  </span>
                </div>
                {activity.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {activity.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {activities.length > maxItems && (
        <div className="mt-3 pt-2 border-t border-muted">
          <button className="text-xs text-primary hover:text-primary/80 transition-colors">
            View all {activities.length} activities →
          </button>
        </div>
      )}
    </div>
  );
}

export default ProjectActivity; 