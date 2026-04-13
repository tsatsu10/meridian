import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ProjectDashboardRow } from "@/types/project";

const STATUS_ORDER = ["planning", "active", "on-hold", "completed"] as const;

const LABELS: Record<string, string> = {
  planning: "Planning",
  active: "Active",
  "on-hold": "On hold",
  completed: "Completed",
  archived: "Archived",
  other: "Other",
};

function normalizeStatus(status: string | undefined): string {
  const s = (status ?? "").toLowerCase();
  if (STATUS_ORDER.includes(s as (typeof STATUS_ORDER)[number])) return s;
  if (s === "archived") return "archived";
  return "other";
}

interface ProjectsBoardViewProps {
  projects: ProjectDashboardRow[];
  showArchived?: boolean;
  onProjectClick: (project: ProjectDashboardRow) => void;
}

/**
 * Kanban-style overview: projects grouped by canonical status (workspace-level list).
 */
export function ProjectsBoardView({
  projects,
  showArchived,
  onProjectClick,
}: ProjectsBoardViewProps) {
  const columns = useMemo(() => {
    const map = new Map<string, ProjectDashboardRow[]>();
    const keys = showArchived
      ? [...STATUS_ORDER, "archived", "other"]
      : [...STATUS_ORDER, "other"];
    for (const k of keys) map.set(k, []);

    for (const p of projects) {
      if (!showArchived && p.isArchived) continue;
      const key = p.isArchived ? "archived" : normalizeStatus(p.status);
      const list = map.get(key) ?? map.get("other")!;
      list.push(p);
    }
    return map;
  }, [projects, showArchived]);

  const columnKeys = showArchived
    ? [...STATUS_ORDER, "archived", "other"]
    : [...STATUS_ORDER, "other"];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4 min-h-[420px]">
      {columnKeys.map((key) => {
        const items = columns.get(key) ?? [];
        return (
          <Card key={key} className="glass-card border-border/50 flex flex-col max-h-[min(70vh,720px)]">
            <CardHeader className="py-3 pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between gap-2">
                {LABELS[key] ?? key}
                <Badge variant="secondary">{items.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 flex-1 min-h-0">
              <ScrollArea className="h-[min(60vh,640px)] pr-2">
                <div className="space-y-2 pb-4">
                  {items.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onProjectClick(p)}
                      className={cn(
                        "w-full text-left rounded-lg border border-border/60 bg-background/50 p-3",
                        "hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      )}
                    >
                      <p className="font-medium text-sm truncate">{p.name}</p>
                      {p.description ? (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.description}</p>
                      ) : null}
                      <div className="flex flex-wrap gap-1 mt-2">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {p.priority ?? "—"}
                        </Badge>
                      </div>
                    </button>
                  ))}
                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-6 text-center">No projects</p>
                  ) : null}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
