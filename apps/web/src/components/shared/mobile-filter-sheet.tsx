import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Filter,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  Flag,
  SortAsc,
} from "lucide-react";
import { cn } from "@/lib/cn";

interface MobileFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Status filter
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  // Priority filter
  priorityFilter: string;
  onPriorityFilterChange: (priority: string) => void;
  // Sort
  sortBy: string;
  onSortChange: (sort: string) => void;
  // Active filters count
  activeFiltersCount?: number;
}

const statusOptions = [
  { value: "", label: "All Status", icon: null },
  { value: "todo", label: "To Do", icon: Clock, color: "text-gray-500" },
  { value: "in_progress", label: "In Progress", icon: Clock, color: "text-blue-500" },
  { value: "in_review", label: "In Review", icon: CheckCircle2, color: "text-purple-500" },
  { value: "done", label: "Done", icon: CheckCircle2, color: "text-green-500" },
];

const priorityOptions = [
  { value: "", label: "All Priority", icon: null },
  { value: "urgent", label: "Urgent", color: "bg-red-500" },
  { value: "high", label: "High", color: "bg-orange-500" },
  { value: "medium", label: "Medium", color: "bg-yellow-500" },
  { value: "low", label: "Low", color: "bg-gray-500" },
];

const sortOptions = [
  { value: "", label: "Default Order" },
  { value: "title", label: "Title A-Z" },
  { value: "priority", label: "Priority (High to Low)" },
  { value: "dueDate", label: "Due Date (Earliest)" },
  { value: "created", label: "Recently Created" },
];

export function MobileFilterSheet({
  open,
  onOpenChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  sortBy,
  onSortChange,
  activeFiltersCount = 0,
}: MobileFilterSheetProps) {
  const handleClearAll = () => {
    onStatusFilterChange("");
    onPriorityFilterChange("");
    onSortChange("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative"
          aria-label="Open filters"
        >
          <Filter className="h-4 w-4 mr-2" aria-hidden="true" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle>Filters & Sort</SheetTitle>
          <SheetDescription>
            Filter and sort your tasks
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6 overflow-y-auto max-h-[calc(80vh-120px)] pb-4">
          {/* Status Filter */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Status
              </h3>
              {statusFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onStatusFilterChange("")}
                  className="h-8 px-2 text-xs"
                >
                  Clear
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {statusOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = statusFilter === option.value;
                
                return (
                  <button
                    key={option.value}
                    onClick={() => onStatusFilterChange(option.value)}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border transition-all",
                      isSelected
                        ? "border-primary bg-primary/10 font-medium"
                        : "border-border hover:border-primary/50 hover:bg-muted"
                    )}
                    aria-pressed={isSelected}
                  >
                    {Icon && <Icon className={cn("h-4 w-4", option.color)} aria-hidden="true" />}
                    <span className="text-sm">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Priority Filter */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Flag className="h-4 w-4" aria-hidden="true" />
                Priority
              </h3>
              {priorityFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPriorityFilterChange("")}
                  className="h-8 px-2 text-xs"
                >
                  Clear
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {priorityOptions.map((option) => {
                const isSelected = priorityFilter === option.value;
                
                return (
                  <button
                    key={option.value}
                    onClick={() => onPriorityFilterChange(option.value)}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border transition-all",
                      isSelected
                        ? "border-primary bg-primary/10 font-medium"
                        : "border-border hover:border-primary/50 hover:bg-muted"
                    )}
                    aria-pressed={isSelected}
                  >
                    {option.color && (
                      <span
                        className={cn("h-3 w-3 rounded-full", option.color)}
                        aria-hidden="true"
                      />
                    )}
                    <span className="text-sm">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Sort */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <SortAsc className="h-4 w-4" aria-hidden="true" />
                Sort By
              </h3>
              {sortBy && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSortChange("")}
                  className="h-8 px-2 text-xs"
                >
                  Clear
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {sortOptions.map((option) => {
                const isSelected = sortBy === option.value;
                
                return (
                  <button
                    key={option.value}
                    onClick={() => onSortChange(option.value)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left",
                      isSelected
                        ? "border-primary bg-primary/10 font-medium"
                        : "border-border hover:border-primary/50 hover:bg-muted"
                    )}
                    aria-pressed={isSelected}
                  >
                    <span className="text-sm">{option.label}</span>
                    {isSelected && (
                      <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClearAll}
              disabled={!statusFilter && !priorityFilter && !sortBy}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" aria-hidden="true" />
              Clear All
            </Button>
            <SheetClose asChild>
              <Button className="flex-1">
                <CheckCircle2 className="h-4 w-4 mr-2" aria-hidden="true" />
                Apply
              </Button>
            </SheetClose>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default MobileFilterSheet;

