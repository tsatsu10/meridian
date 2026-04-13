import { Button } from "@/components/ui/button";
import { LayoutGrid, List, Columns3 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "grid" | "list" | "board";

interface ViewToggleProps {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 border rounded-md p-1">
      <Button
        variant={view === "grid" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("grid")}
        className={cn(
          "h-8",
          view === "grid" && "bg-primary text-primary-foreground"
        )}
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="ml-2 hidden sm:inline">Grid</span>
      </Button>
      <Button
        variant={view === "list" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("list")}
        className={cn(
          "h-8",
          view === "list" && "bg-primary text-primary-foreground"
        )}
      >
        <List className="h-4 w-4" />
        <span className="ml-2 hidden sm:inline">List</span>
      </Button>
      <Button
        variant={view === "board" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("board")}
        className={cn(
          "h-8",
          view === "board" && "bg-primary text-primary-foreground"
        )}
      >
        <Columns3 className="h-4 w-4" />
        <span className="ml-2 hidden sm:inline">Board</span>
      </Button>
    </div>
  );
}

