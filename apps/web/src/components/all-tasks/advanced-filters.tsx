import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/cn";
import { format } from "date-fns";

// Icon components with proper typing
const FilterIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
  </svg>
);

const XIcon = ({ className, onClick }: { className?: string; onClick?: () => void }) => (
  <svg className={className} onClick={onClick} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const UserIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const FlagIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 2H21l-3 6 3 6h-8.5l-1-2H5a2 2 0 00-2 2zm9-13.5V9" />
  </svg>
);

const FolderIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const CalendarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

interface AllTasksFilters {
  status?: string[];
  priority?: string[];
  assignedToMe?: boolean;
  projectIds?: string[];
  assigneeEmails?: string[];
  dueAfter?: Date;
  dueBefore?: Date;
  search?: string;
  assignedTeamIds?: string[];
}

interface FilterOptions {
  projects: Array<{
    id: string;
    name: string;
    slug: string;
    icon: string;
  }>;
  teamMembers: Array<{
    email: string;
    name: string;
  }>;
  statuses: string[];
  priorities: string[];
  assigneeEmails?: string[];
  assignedTeamIds?: string[];
  dueDateRange?: {
    from: Date;
    to: Date;
  };
  projectIds?: string[];
}

interface AdvancedFiltersProps {
  filters: AllTasksFilters;
  filterOptions: FilterOptions;
  onFiltersChange: (filters: AllTasksFilters) => void;
  onClearFilters: () => void;
}

/** Matches task status values from API / filters (todo | in_progress | done; completed is legacy). */
const statusLabels: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
  completed: "Completed",
};

const priorityLabels = {
  "low": "Low",
  "medium": "Medium",
  "high": "High", 
  "urgent": "Urgent",
};

const priorityColors = {
  "low": "bg-gray-100 text-gray-800",
  "medium": "bg-yellow-100 text-yellow-800",
  "high": "bg-orange-100 text-orange-800",
  "urgent": "bg-red-100 text-red-800",
};

const statusColors: Record<string, string> = {
  todo: "bg-gray-100 text-gray-800",
  in_progress: "bg-blue-100 text-blue-800",
  done: "bg-green-100 text-green-800",
  completed: "bg-green-100 text-green-800",
};

export function AdvancedFilters({
  filters,
  filterOptions,
  onFiltersChange,
  onClearFilters,
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeFiltersCount = Object.values(filters).filter(value => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'boolean') return value;
    return value !== undefined && value !== null && value !== '';
  }).length;

  const updateFilter = <K extends keyof AllTasksFilters>(
    key: K,
    value: AllTasksFilters[K] | undefined,
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleArrayFilter = (key: keyof AllTasksFilters, value: string) => {
    const currentArray = (filters[key] as string[]) || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    updateFilter(key, newArray.length > 0 ? newArray : undefined);
  };

  const removeFilter = (key: keyof AllTasksFilters, value?: string) => {
    if (value && Array.isArray(filters[key])) {
      const newArray = (filters[key] as string[]).filter(item => item !== value);
      updateFilter(key, newArray.length > 0 ? newArray : undefined);
    } else {
      updateFilter(key, undefined);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter Toggle Button */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2"
        >
          <FilterIcon className="h-4 w-4" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>

        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            Clear all
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.assignedToMe && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <UserIcon className="h-3 w-3" />
              Assigned to me
              <XIcon
                className="h-3 w-3 cursor-pointer"
                onClick={() => removeFilter('assignedToMe')}
              />
            </Badge>
          )}

          {filters.status?.map(status => (
            <Badge
              key={status}
              variant="secondary"
              className={cn(
                "flex items-center gap-1",
                statusColors[status] ?? "bg-muted text-muted-foreground",
              )}
            >
              <ClockIcon className="h-3 w-3" />
              {statusLabels[status] ?? status}
              <XIcon
                className="h-3 w-3 cursor-pointer"
                onClick={() => removeFilter('status', status)}
              />
            </Badge>
          ))}

          {filters.priority?.map(priority => (
            <Badge
              key={priority}
              variant="secondary"
              className={cn("flex items-center gap-1", priorityColors[priority as keyof typeof priorityColors])}
            >
              <FlagIcon className="h-3 w-3" />
              {priorityLabels[priority as keyof typeof priorityLabels]}
              <XIcon
                className="h-3 w-3 cursor-pointer"
                onClick={() => removeFilter('priority', priority)}
              />
            </Badge>
          ))}

          {filters.projectIds?.map(projectId => {
            const project = filterOptions.projects.find(p => p.id === projectId);
            return project ? (
              <Badge key={projectId} variant="secondary" className="flex items-center gap-1">
                <FolderIcon className="h-3 w-3" />
                {project.name}
                <XIcon
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeFilter('projectIds', projectId)}
                />
              </Badge>
            ) : null;
          })}

          {filters.dueAfter && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              Due after {format(filters.dueAfter, "MMM d")}
              <XIcon
                className="h-3 w-3 cursor-pointer"
                onClick={() => removeFilter('dueAfter')}
              />
            </Badge>
          )}

          {filters.dueBefore && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              Due before {format(filters.dueBefore, "MMM d")}
              <XIcon
                className="h-3 w-3 cursor-pointer"
                onClick={() => removeFilter('dueBefore')}
              />
            </Badge>
          )}
        </div>
      )}

      {/* Filter Panel */}
      {isOpen && (
        <div className="border rounded-lg p-4 space-y-4 bg-background">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Assigned to Me */}
            <div className="space-y-2">
              <Label>Assignment</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="assigned-to-me"
                  checked={filters.assignedToMe || false}
                  onCheckedChange={(checked) => updateFilter('assignedToMe', checked)}
                />
                <Label htmlFor="assigned-to-me" className="text-sm">
                  Assigned to me
                </Label>
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="space-y-2">
                {filterOptions.statuses.map(status => (
                  <div key={status} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`status-${status}`}
                      checked={filters.status?.includes(status) || false}
                      onChange={() => toggleArrayFilter('status', status)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Label htmlFor={`status-${status}`} className="text-sm">
                      {statusLabels[status] ?? status}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Priority Filter */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <div className="space-y-2">
                {filterOptions.priorities.map(priority => (
                  <div key={priority} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`priority-${priority}`}
                      checked={filters.priority?.includes(priority) || false}
                      onChange={() => toggleArrayFilter('priority', priority)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Label htmlFor={`priority-${priority}`} className="text-sm">
                      {priorityLabels[priority as keyof typeof priorityLabels]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label>Due Date Range</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dueAfter ? format(filters.dueAfter, "MMM d") : "After..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dueAfter}
                      onSelect={(date) => updateFilter('dueAfter', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dueBefore ? format(filters.dueBefore, "MMM d") : "Before..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dueBefore}
                      onSelect={(date) => updateFilter('dueBefore', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Team Assignment Filter */}
            <div className="space-y-2">
              <Label>Assigned Teams</Label>
              <Select
                value={filters.assignedTeamIds?.[0] || ""}
                onValueChange={(value) =>
                  updateFilter('assignedTeamIds', value ? [value] : undefined)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Teams</SelectItem>
                  {filterOptions.teamMembers.map((team) => (
                    <SelectItem key={team.email} value={team.email}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Individual Assignment Filter */}
            <div className="space-y-2">
              <Label>Assigned Users</Label>
              <Select
                value={filters.assigneeEmails?.[0] || ""}
                onValueChange={(value) =>
                  updateFilter('assigneeEmails', value ? [value] : undefined)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Users</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {filterOptions.teamMembers.map((user) => (
                    <SelectItem key={user.email} value={user.email}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 