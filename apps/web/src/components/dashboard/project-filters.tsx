/**
 * ProjectFilters Component
 * Multi-dimensional filtering UI for projects dashboard
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Checkbox,
  CheckboxProps,
} from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import {
  ChevronDown,
  X,
  Filter,
  RotateCcw,
  Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ProjectFilters } from "@/hooks/use-project-filters";

interface ProjectFiltersProps {
  filters: ProjectFilters;
  onStatusChange: (statuses: string[]) => void;
  onPriorityChange: (priorities: string[]) => void;
  onHealthChange: (health: string[]) => void;
  onOwnerChange: (owners: string[]) => void;
  onTeamMembersChange: (members: string[]) => void;
  onSearchChange: (query: string) => void;
  onSortChange: (
    sortBy: "name" | "status" | "priority" | "progress" | "dueDate",
    sortOrder: "asc" | "desc"
  ) => void;
  onReset: () => void;
  activeFilterCount: number;
  projects?: any[];
}

const STATUS_OPTIONS = ["planning", "active", "on-hold", "completed", "archived"];
const PRIORITY_OPTIONS = ["low", "medium", "high", "urgent"];
const HEALTH_OPTIONS = ["on-track", "at-risk", "behind", "ahead"];
const SORT_OPTIONS = [
  { value: "name", label: "Project Name" },
  { value: "status", label: "Status" },
  { value: "priority", label: "Priority" },
  { value: "progress", label: "Progress" },
  { value: "dueDate", label: "Due Date" },
];

/**
 * FilterCheckbox Component
 */
const FilterCheckbox: React.FC<{
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  color?: string;
}> = ({ id, label, checked, onChange, color }) => (
  <div className="flex items-center space-x-3 py-2 px-2 rounded hover:bg-muted/50 cursor-pointer transition-colors">
    <Checkbox
      id={id}
      checked={checked}
      onCheckedChange={onChange}
      className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
    />
    <label
      htmlFor={id}
      className="flex-1 text-sm cursor-pointer capitalize flex items-center gap-2"
    >
      {label}
      {color && (
        <span
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
    </label>
  </div>
);

/**
 * FilterSection Component
 */
const FilterSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  count?: number;
  children: React.ReactNode;
}> = ({ title, icon, count, children }) => (
  <div className="border-b border-border/50 last:border-0">
    <div className="px-4 py-3 flex items-center gap-2 font-medium text-sm">
      {icon}
      {title}
      {count !== undefined && count > 0 && (
        <Badge variant="secondary" className="ml-auto text-xs">
          {count}
        </Badge>
      )}
    </div>
    <div className="px-2 pb-2">{children}</div>
  </div>
);

/**
 * Main ProjectFilters Component
 */
export const ProjectFilters: React.FC<ProjectFiltersProps> = ({
  filters,
  onStatusChange,
  onPriorityChange,
  onHealthChange,
  onOwnerChange,
  onTeamMembersChange,
  onSearchChange,
  onSortChange,
  onReset,
  activeFilterCount,
  projects = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Get unique owners from projects
  const uniqueOwners = Array.from(
    new Set(projects?.map((p: any) => p.ownerId))
  ).map((id) => {
    const project = projects?.find((p: any) => p.ownerId === id);
    return {
      id,
      name: project?.ownerName || "Unknown",
    };
  });

  // Get unique team members
  const uniqueMembers = Array.from(
    new Set(
      projects?.flatMap((p: any) => p.members?.map((m: any) => m.id) || [])
    )
  ).map((id) => {
    const member = projects
      ?.flatMap((p: any) => p.members || [])
      .find((m: any) => m.id === id);
    return {
      id,
      name: member?.name || "Unknown",
    };
  });

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Input
          placeholder="Search projects by name or description..."
          value={filters.searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
          aria-label="Search projects"
        />
        <div className="absolute left-3 top-2.5 text-muted-foreground">
          🔍
        </div>
      </div>

      {/* Active Filters Display */}
      <AnimatePresence>
        {activeFilterCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <div className="flex flex-wrap gap-2">
              {filters.status.map((status) => (
                <Badge
                  key={`status-${status}`}
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  {status}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() =>
                      onStatusChange(filters.status.filter((s) => s !== status))
                    }
                  />
                </Badge>
              ))}

              {filters.priority.map((priority) => (
                <Badge
                  key={`priority-${priority}`}
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  {priority}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() =>
                      onPriorityChange(
                        filters.priority.filter((p) => p !== priority)
                      )
                    }
                  />
                </Badge>
              ))}

              {filters.health.map((health) => (
                <Badge
                  key={`health-${health}`}
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  {health}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() =>
                      onHealthChange(filters.health.filter((h) => h !== health))
                    }
                  />
                </Badge>
              ))}

              {filters.owner.map((owner) => (
                <Badge
                  key={`owner-${owner}`}
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  Owner: {owner}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() =>
                      onOwnerChange(filters.owner.filter((o) => o !== owner))
                    }
                  />
                </Badge>
              ))}

              {filters.teamMembers.map((member) => (
                <Badge
                  key={`member-${member}`}
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  {member}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() =>
                      onTeamMembersChange(
                        filters.teamMembers.filter((m) => m !== member)
                      )
                    }
                  />
                </Badge>
              ))}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="w-full gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Clear All Filters
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-between",
              activeFilterCount > 0 &&
                "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
            )}
          >
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFilterCount}
                </Badge>
              )}
            </div>
            <ChevronDown
              className={cn(
                "w-4 h-4 transition-transform",
                isOpen && "rotate-180"
              )}
            />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-80 p-0 glass-card"
          align="start"
          side="bottom"
        >
          <div className="max-h-96 overflow-y-auto">
            {/* Sort Section */}
            <FilterSection title="Sort By" icon="📊">
              <div className="space-y-2">
                {SORT_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`sort-${option.value}`}
                      checked={filters.sortBy === option.value}
                      onCheckedChange={() =>
                        onSortChange(
                          option.value as any,
                          filters.sortOrder
                        )
                      }
                    />
                    <label
                      htmlFor={`sort-${option.value}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
                <div className="flex gap-2 pt-2 border-t border-border/50">
                  <Button
                    size="sm"
                    variant={
                      filters.sortOrder === "asc" ? "default" : "outline"
                    }
                    className="flex-1"
                    onClick={() => onSortChange(filters.sortBy, "asc")}
                  >
                    ↑ Ascending
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      filters.sortOrder === "desc" ? "default" : "outline"
                    }
                    className="flex-1"
                    onClick={() => onSortChange(filters.sortBy, "desc")}
                  >
                    ↓ Descending
                  </Button>
                </div>
              </div>
            </FilterSection>

            {/* Status Filter */}
            <FilterSection
              title="Status"
              icon="📍"
              count={filters.status.length}
            >
              {STATUS_OPTIONS.map((status) => (
                <FilterCheckbox
                  key={status}
                  id={`status-${status}`}
                  label={status}
                  checked={filters.status.includes(status)}
                  onChange={(checked) => {
                    if (checked) {
                      onStatusChange([...filters.status, status]);
                    } else {
                      onStatusChange(
                        filters.status.filter((s) => s !== status)
                      );
                    }
                  }}
                />
              ))}
            </FilterSection>

            {/* Priority Filter */}
            <FilterSection
              title="Priority"
              icon="⚡"
              count={filters.priority.length}
            >
              {PRIORITY_OPTIONS.map((priority) => (
                <FilterCheckbox
                  key={priority}
                  id={`priority-${priority}`}
                  label={priority}
                  checked={filters.priority.includes(priority)}
                  onChange={(checked) => {
                    if (checked) {
                      onPriorityChange([...filters.priority, priority]);
                    } else {
                      onPriorityChange(
                        filters.priority.filter((p) => p !== priority)
                      );
                    }
                  }}
                />
              ))}
            </FilterSection>

            {/* Health Filter */}
            <FilterSection
              title="Health Status"
              icon="❤️"
              count={filters.health.length}
            >
              {HEALTH_OPTIONS.map((health) => (
                <FilterCheckbox
                  key={health}
                  id={`health-${health}`}
                  label={health}
                  checked={filters.health.includes(health)}
                  onChange={(checked) => {
                    if (checked) {
                      onHealthChange([...filters.health, health]);
                    } else {
                      onHealthChange(
                        filters.health.filter((h) => h !== health)
                      );
                    }
                  }}
                />
              ))}
            </FilterSection>

            {/* Owner Filter */}
            {uniqueOwners.length > 0 && (
              <FilterSection
                title="Project Owner"
                icon="👤"
                count={filters.owner.length}
              >
                {uniqueOwners.map((owner) => (
                  <FilterCheckbox
                    key={owner.id}
                    id={`owner-${owner.id}`}
                    label={owner.name}
                    checked={filters.owner.includes(owner.id)}
                    onChange={(checked) => {
                      if (checked) {
                        onOwnerChange([...filters.owner, owner.id]);
                      } else {
                        onOwnerChange(
                          filters.owner.filter((o) => o !== owner.id)
                        );
                      }
                    }}
                  />
                ))}
              </FilterSection>
            )}

            {/* Team Members Filter */}
            {uniqueMembers.length > 0 && (
              <FilterSection
                title="Team Members"
                icon="👥"
                count={filters.teamMembers.length}
              >
                {uniqueMembers.map((member) => (
                  <FilterCheckbox
                    key={member.id}
                    id={`member-${member.id}`}
                    label={member.name}
                    checked={filters.teamMembers.includes(member.id)}
                    onChange={(checked) => {
                      if (checked) {
                        onTeamMembersChange([...filters.teamMembers, member.id]);
                      } else {
                        onTeamMembersChange(
                          filters.teamMembers.filter((m) => m !== member.id)
                        );
                      }
                    }}
                  />
                ))}
              </FilterSection>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default ProjectFilters;
