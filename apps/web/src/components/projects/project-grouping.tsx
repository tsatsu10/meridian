import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export type GroupByOption = "none" | "status" | "priority" | "health";

interface ProjectGroupingProps {
  groupBy: GroupByOption;
  onGroupByChange: (value: GroupByOption) => void;
}

export function ProjectGrouping({ groupBy, onGroupByChange }: ProjectGroupingProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Group by:</span>
      <Select value={groupBy} onValueChange={(value) => onGroupByChange(value as GroupByOption)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No Grouping</SelectItem>
          <SelectItem value="status">Status</SelectItem>
          <SelectItem value="priority">Priority</SelectItem>
          <SelectItem value="health">Health</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function groupProjects(projects: any[], groupBy: GroupByOption) {
  if (groupBy === "none") {
    return [{ key: "all", title: "All Projects", projects }];
  }

  const groups: Record<string, any[]> = {};

  projects.forEach((project) => {
    let key: string;
    
    if (groupBy === "status") {
      key = project.status || "unknown";
    } else if (groupBy === "priority") {
      key = project.priority || "medium";
    } else if (groupBy === "health") {
      // This would need the health calculation
      key = "unknown"; // Placeholder
    } else {
      key = "other";
    }

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(project);
  });

  return Object.entries(groups).map(([key, projects]) => ({
    key,
    title: formatGroupTitle(key, groupBy),
    projects,
  }));
}

function formatGroupTitle(key: string, groupBy: GroupByOption): string {
  const titleMap: Record<string, Record<string, string>> = {
    status: {
      planning: "📋 Planning",
      active: "🚀 Active",
      completed: "✅ Completed",
      paused: "⏸️ Paused",
      cancelled: "❌ Cancelled",
    },
    priority: {
      low: "🟢 Low Priority",
      medium: "🟡 Medium Priority",
      high: "🔴 High Priority",
      critical: "🔥 Critical",
    },
    health: {
      "on-track": "🟢 On Track",
      "at-risk": "🟡 At Risk",
      delayed: "🔴 Delayed",
    },
  };

  return titleMap[groupBy]?.[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

interface GroupedProjectsSectionProps {
  group: {
    key: string;
    title: string;
    projects: any[];
  };
  children: React.ReactNode;
}

export function GroupedProjectsSection({ group, children }: GroupedProjectsSectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          {group.title}
          <span className="text-sm font-normal text-muted-foreground">
            ({group.projects.length})
          </span>
        </h3>
        <Separator className="mt-2" />
      </div>
      {children}
    </div>
  );
}

