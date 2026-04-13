// @epic-1.1-subtasks: Empty states for board views
// @persona-sarah: PM needs clear feedback when filters return no results
// @persona-mike: Dev needs helpful guidance when board is empty

import { Button } from "@/components/ui/button";
import { Target, Search, AlertCircle, Plus, X } from "lucide-react";
import { motion } from "framer-motion";

export type EmptyStateType = 'no-tasks' | 'no-results' | 'error';

interface BoardEmptyStateProps {
  type: EmptyStateType;
  onCreateTask?: () => void;
  onClearFilters?: () => void;
  onRefresh?: () => void;
  searchQuery?: string;
  filterCount?: number;
}

const emptyStateConfigs = {
  'no-tasks': {
    icon: Target,
    iconColor: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    title: "No tasks yet",
    description: "Create your first task to get started with this project",
    actionLabel: "Create Task",
    actionIcon: Plus,
  },
  'no-results': {
    icon: Search,
    iconColor: "text-orange-500",
    bgColor: "bg-orange-50 dark:bg-orange-950/20",
    title: "No tasks match your filters",
    description: "Try adjusting your search or filters to find what you're looking for",
    actionLabel: "Clear Filters",
    actionIcon: X,
  },
  'error': {
    icon: AlertCircle,
    iconColor: "text-destructive",
    bgColor: "bg-destructive/10",
    title: "Unable to load tasks",
    description: "There was an error loading your tasks. Please try refreshing the page.",
    actionLabel: "Refresh",
    actionIcon: null,
  }
};

export default function BoardEmptyState({
  type,
  onCreateTask,
  onClearFilters,
  onRefresh,
  searchQuery,
  filterCount = 0
}: BoardEmptyStateProps) {
  const config = emptyStateConfigs[type];
  const Icon = config.icon;
  const ActionIcon = config.actionIcon;

  const handleAction = () => {
    if (type === 'no-tasks' && onCreateTask) {
      onCreateTask();
    } else if (type === 'no-results' && onClearFilters) {
      onClearFilters();
    } else if (type === 'error' && onRefresh) {
      onRefresh();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center h-[60vh] px-4"
    >
      <div className="flex flex-col items-center text-center max-w-md space-y-6">
        {/* Icon */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className={`p-6 ${config.bgColor} rounded-full`}
        >
          <Icon className={`w-16 h-16 ${config.iconColor}`} />
        </motion.div>

        {/* Content */}
        <div className="space-y-3">
          <h3 className="text-2xl font-semibold text-foreground">
            {config.title}
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            {config.description}
          </p>

          {/* Additional context for no-results */}
          {type === 'no-results' && (searchQuery || filterCount > 0) && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border">
              <div className="text-sm space-y-2">
                {searchQuery && (
                  <div className="flex items-center justify-center gap-2">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Searching for: <span className="font-medium text-foreground">"{searchQuery}"</span>
                    </span>
                  </div>
                )}
                {filterCount > 0 && (
                  <div className="text-muted-foreground">
                    {filterCount} active filter{filterCount > 1 ? 's' : ''} applied
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <Button
          onClick={handleAction}
          size="lg"
          className="mt-4 gap-2"
        >
          {ActionIcon && <ActionIcon className="w-5 h-5" />}
          {config.actionLabel}
        </Button>

        {/* Secondary action for error state */}
        {type === 'error' && (
          <p className="text-sm text-muted-foreground mt-4">
            If the problem persists, please contact support
          </p>
        )}
      </div>
    </motion.div>
  );
}

