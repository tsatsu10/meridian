import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import {
  FolderPlus,
  CheckCircle2,
  Clock,
  Users,
  AlertCircle,
} from "lucide-react";

interface Activity {
  id: string;
  type: "project_created" | "project_completed" | "task_completed" | "member_added" | "deadline_approaching";
  project: {
    id: string;
    name: string;
  };
  user?: {
    name: string;
    avatar?: string;
  };
  timestamp: Date;
  description: string;
}

interface ActivityFeedProps {
  activities: Activity[];
  className?: string;
}

export function ActivityFeed({ activities, className }: ActivityFeedProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No recent activity
              </p>
            ) : (
              activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function ActivityItem({ activity }: { activity: Activity }) {
  const icon = getActivityIcon(activity.type);
  const color = getActivityColor(activity.type);

  return (
    <div className="flex items-start gap-3">
      <div className={`mt-1 ${color}`}>{icon}</div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          {activity.user && (
            <Avatar className="h-6 w-6">
              <AvatarImage src={activity.user.avatar} />
              <AvatarFallback className="text-xs">
                {activity.user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          )}
          <p className="text-sm">
            <span className="font-medium">{activity.user?.name || "System"}</span>
            {" "}
            {activity.description}
            {" "}
            <span className="font-medium">{activity.project.name}</span>
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

function getActivityIcon(type: Activity["type"]) {
  switch (type) {
    case "project_created":
      return <FolderPlus className="h-4 w-4" />;
    case "project_completed":
      return <CheckCircle2 className="h-4 w-4" />;
    case "task_completed":
      return <CheckCircle2 className="h-4 w-4" />;
    case "member_added":
      return <Users className="h-4 w-4" />;
    case "deadline_approaching":
      return <AlertCircle className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
}

function getActivityColor(type: Activity["type"]) {
  switch (type) {
    case "project_created":
      return "text-blue-500";
    case "project_completed":
      return "text-green-500";
    case "task_completed":
      return "text-green-500";
    case "member_added":
      return "text-purple-500";
    case "deadline_approaching":
      return "text-orange-500";
    default:
      return "text-muted-foreground";
  }
}

// Helper function to generate activities from project data
export function generateActivities(projects: any[]): Activity[] {
  const activities: Activity[] = [];

  projects.forEach((project) => {
    // Project created
    if (project.createdAt) {
      activities.push({
        id: `project-created-${project.id}`,
        type: "project_created",
        project: { id: project.id, name: project.name },
        timestamp: new Date(project.createdAt),
        description: "created project",
      });
    }

    // Project completed
    if (project.status === "completed" && project.completedAt) {
      activities.push({
        id: `project-completed-${project.id}`,
        type: "project_completed",
        project: { id: project.id, name: project.name },
        timestamp: new Date(project.completedAt),
        description: "completed project",
      });
    }

    // Deadline approaching
    if (project.dueDate) {
      const dueDate = new Date(project.dueDate);
      const now = new Date();
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue > 0 && daysUntilDue <= 7 && project.status !== "completed") {
        activities.push({
          id: `deadline-${project.id}`,
          type: "deadline_approaching",
          project: { id: project.id, name: project.name },
          timestamp: now,
          description: `has a deadline in ${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""} for`,
        });
      }
    }
  });

  // Sort by timestamp (most recent first)
  return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 20);
}

