import React, { useState } from "react";
import { useBulkOperationsStore, useSelectedProjectIds, useBulkOperationsStats } from "@/store/use-bulk-operations";
import { Button } from "@/components/ui/button";
import { X, Copy, Trash2, Edit, Undo2, Redo2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
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

/**
 * BulkActionToolbar Component
 * Floating action bar for bulk operations on selected projects
 *
 * Accessibility Features:
 * - ARIA live region for action announcements
 * - Keyboard accessible buttons (Tab, Enter, Space)
 * - Tooltip support with aria-label
 * - Confirm dialogs for destructive actions
 * - Proper focus management
 */

interface BulkActionToolbarProps {
  onBulkUpdate?: (projectIds: string[], updates: any) => Promise<any>;
  onBulkDelete?: (projectIds: string[]) => Promise<any>;
  onBulkDuplicate?: (projectIds: string[]) => Promise<any>;
  onBulkExport?: (projectIds: string[]) => void;
  className?: string;
}

export const BulkActionToolbar: React.FC<BulkActionToolbarProps> = ({
  onBulkUpdate,
  onBulkDelete,
  onBulkDuplicate,
  onBulkExport,
  className,
}) => {
  const selectedProjectIds = useSelectedProjectIds();
  const { clearSelection, startOperation, endOperation, undo, redo, canUndo, canRedo } = useBulkOperationsStore();
  const { operationInProgress } = useBulkOperationsStats();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [updateField, setUpdateField] = useState<"status" | "priority">("status");
  const [updateValue, setUpdateValue] = useState("");

  const handleDelete = async () => {
    if (!onBulkDelete) return;

    startOperation();
    try {
      const result = await onBulkDelete(selectedProjectIds);
      endOperation(result);

      if (result.success) {
        clearSelection();
        setShowDeleteDialog(false);
      }
    } catch (error) {
      endOperation({ success: false, error: String(error) });
    }
  };

  const handleUpdate = async () => {
    if (!onBulkUpdate) return;

    startOperation();
    try {
      const updates = { [updateField]: updateValue };
      const result = await onBulkUpdate(selectedProjectIds, updates);
      endOperation(result);

      if (result.success) {
        clearSelection();
        setShowUpdateDialog(false);
        setUpdateValue("");
      }
    } catch (error) {
      endOperation({ success: false, error: String(error) });
    }
  };

  const handleDuplicate = async () => {
    if (!onBulkDuplicate) return;

    startOperation();
    try {
      const result = await onBulkDuplicate(selectedProjectIds);
      endOperation(result);

      if (result.success) {
        clearSelection();
      }
    } catch (error) {
      endOperation({ success: false, error: String(error) });
    }
  };

  const handleExport = () => {
    if (!onBulkExport) return;
    onBulkExport(selectedProjectIds);
  };

  if (selectedProjectIds.length === 0) {
    return null;
  }

  return (
    <>
      {/* Live region for screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        id="bulk-action-announcements"
      />

      {/* Toolbar Container */}
      <div
        className={cn(
          "fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50",
          "bg-white border border-gray-200 rounded-lg shadow-lg",
          "px-6 py-4",
          "flex items-center gap-4",
          "max-w-[95vw] overflow-x-auto",
          "animate-in slide-in-from-bottom-4 duration-300",
          className
        )}
        role="toolbar"
        aria-label="Bulk operations"
      >
        {/* Selected count */}
        <div className="flex items-center gap-2 min-w-max">
          <span className="text-sm font-medium text-gray-700">
            {selectedProjectIds.length} selected
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200" role="none" />

        {/* Bulk Actions */}
        <div className="flex items-center gap-2">
          {/* Update Status */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUpdateDialog(true)}
            disabled={operationInProgress || !onBulkUpdate}
            aria-label={`Update status of ${selectedProjectIds.length} selected projects`}
            title="Bulk update status"
            className="gap-2"
          >
            <Edit className="w-4 h-4" />
            <span className="hidden sm:inline">Update</span>
          </Button>

          {/* Duplicate */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDuplicate}
            disabled={operationInProgress || !onBulkDuplicate}
            aria-label={`Duplicate ${selectedProjectIds.length} selected projects`}
            title="Bulk duplicate"
            className="gap-2"
          >
            <Copy className="w-4 h-4" />
            <span className="hidden sm:inline">Duplicate</span>
          </Button>

          {/* Export */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={operationInProgress || !onBulkExport}
            aria-label={`Export ${selectedProjectIds.length} selected projects`}
            title="Bulk export"
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>

          {/* Delete */}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            disabled={operationInProgress || !onBulkDelete}
            aria-label={`Delete ${selectedProjectIds.length} selected projects`}
            title="Bulk delete"
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200" role="none" />

        {/* Undo/Redo */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={undo}
            disabled={!canUndo() || operationInProgress}
            aria-label="Undo last selection"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={redo}
            disabled={!canRedo() || operationInProgress}
            aria-label="Redo last selection"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200" role="none" />

        {/* Clear Selection */}
        <Button
          variant="ghost"
          size="sm"
          onClick={clearSelection}
          disabled={operationInProgress}
          aria-label="Clear all selections"
          title="Clear selection (Esc)"
        >
          <X className="w-4 h-4" />
          <span className="hidden sm:inline">Clear</span>
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedProjectIds.length} projects?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All associated data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={operationInProgress}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {operationInProgress ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Update Dialog */}
      <AlertDialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update {selectedProjectIds.length} projects</AlertDialogTitle>
          </AlertDialogHeader>

          <div className="space-y-4">
            {/* Field selector */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Update field
              </label>
              <select
                value={updateField}
                onChange={(e) => setUpdateField(e.target.value as "status" | "priority")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="status">Status</option>
                <option value="priority">Priority</option>
              </select>
            </div>

            {/* Value input */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                New value
              </label>
              <select
                value={updateValue}
                onChange={(e) => setUpdateValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select...</option>
                {updateField === "status" && (
                  <>
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="on-hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </>
                )}
                {updateField === "priority" && (
                  <>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUpdate}
              disabled={operationInProgress || !updateValue}
            >
              {operationInProgress ? "Updating..." : "Update"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BulkActionToolbar;
