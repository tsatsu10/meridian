// @epic-2.1-workflow: Bulk action capabilities for analytics
// @persona-sarah: PM needs to take actions on multiple insights at once
// @persona-david: Team lead needs to manage multiple team members efficiently

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CheckSquare,
  Square,
  ChevronDown,
  Plus,
  Users,
  AlertTriangle,
  Calendar,
  Trash2,
  Share2,
  Tag,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { toast } from '@/lib/toast';

interface BulkActionBarProps<T> {
  selectedItems: T[];
  onClearSelection: () => void;
  onBulkAction: (action: string, items: T[]) => Promise<void>;
  itemType: "insight" | "project" | "team_member" | "alert";
  className?: string;
}

interface BulkAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  confirmRequired?: boolean;
  confirmMessage?: string;
  disabled?: boolean;
}

const BULK_ACTIONS: Record<string, BulkAction[]> = {
  insight: [
    {
      id: "create_tasks",
      label: "Create Tasks",
      icon: Plus,
    },
    {
      id: "assign_team",
      label: "Assign Team",
      icon: Users,
    },
    {
      id: "schedule_review",
      label: "Schedule Review",
      icon: Calendar,
    },
    {
      id: "share",
      label: "Share",
      icon: Share2,
    },
    {
      id: "add_tags",
      label: "Add Tags",
      icon: Tag,
    },
    {
      id: "archive",
      label: "Archive",
      icon: Trash2,
      confirmRequired: true,
      confirmMessage: "Are you sure you want to archive the selected insights?",
    },
  ],
  project: [
    {
      id: "assign_team",
      label: "Assign Team",
      icon: Users,
    },
    {
      id: "schedule_review",
      label: "Schedule Review",
      icon: Calendar,
    },
    {
      id: "mark_at_risk",
      label: "Mark At Risk",
      icon: AlertTriangle,
      confirmRequired: true,
      confirmMessage: "Are you sure you want to mark these projects as at risk?",
    },
  ],
  team_member: [
    {
      id: "assign_tasks",
      label: "Assign Tasks",
      icon: Plus,
    },
    {
      id: "schedule_meeting",
      label: "Schedule Meeting",
      icon: Calendar,
    },
    {
      id: "update_roles",
      label: "Update Roles",
      icon: Users,
    },
  ],
  alert: [
    {
      id: "resolve",
      label: "Mark Resolved",
      icon: CheckSquare,
    },
    {
      id: "assign",
      label: "Assign",
      icon: Users,
    },
    {
      id: "create_tasks",
      label: "Create Tasks",
      icon: Plus,
    },
    {
      id: "dismiss",
      label: "Dismiss",
      icon: X,
      confirmRequired: true,
      confirmMessage: "Are you sure you want to dismiss these alerts?",
    },
  ],
};

export function BulkActionBar<T>({
  selectedItems,
  onClearSelection,
  onBulkAction,
  itemType,
  className,
}: BulkActionBarProps<T>) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);
  const [isActionInProgress, setIsActionInProgress] = useState(false);

  const actions = BULK_ACTIONS[itemType] || [];

  const handleActionClick = async (action: BulkAction) => {
    if (action.confirmRequired) {
      setPendingAction(action);
      setIsConfirmOpen(true);
      return;
    }

    await executeAction(action);
  };

  const executeAction = async (action: BulkAction) => {
    setIsActionInProgress(true);
    try {
      await onBulkAction(action.id, selectedItems);
      toast.success(`Bulk action "${action.label}" completed successfully`);
      onClearSelection();
    } catch (error) {
      console.error("Bulk action failed:", error);
      toast.error(`Failed to execute bulk action "${action.label}"`);
    } finally {
      setIsActionInProgress(false);
      setIsConfirmOpen(false);
      setPendingAction(null);
    }
  };

  if (selectedItems.length === 0) {
    return null;
  }

  return (
    <>
      <div
        className={cn(
          "fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 animate-in slide-in-from-bottom-4",
          className
        )}
      >
        {/* Selection Info */}
        <div className="flex items-center gap-2 px-2">
          <CheckSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {selectedItems.length} selected
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-8 px-2 text-xs"
          >
            Clear
          </Button>
        </div>

        <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant="outline"
              size="sm"
              onClick={() => handleActionClick(action)}
              disabled={isActionInProgress || action.disabled}
              className="h-8 px-3 text-xs gap-2"
            >
              <action.icon className="h-3 w-3" />
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Action</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.confirmMessage || "Are you sure you want to continue?"}
              <div className="mt-4">
                <Badge variant="secondary">
                  {selectedItems.length} items selected
                </Badge>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActionInProgress}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isActionInProgress}
              onClick={async (e) => {
                e.preventDefault();
                if (pendingAction) {
                  await executeAction(pendingAction);
                }
              }}
            >
              {isActionInProgress ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Processing...
                </>
              ) : (
                "Continue"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export type { BulkActionBarProps, BulkAction };