import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Tag,
  ChevronDown,
  Archive,
  MoreHorizontal,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";

interface BulkActionToolbarProps {
  selectedCount: number;
  onBulkDelete?: () => void;
  onBulkStatusUpdate?: (status: string) => void;
  onBulkPriorityUpdate?: (priority: string) => void;
  onBulkAssign?: () => void;
  onBulkArchive?: () => void;
  onClearSelection: () => void;
  className?: string;
  canDelete?: boolean;
  canEdit?: boolean;
}

export function BulkActionToolbar({
  selectedCount,
  onBulkDelete,
  onBulkStatusUpdate,
  onBulkPriorityUpdate,
  onBulkAssign,
  onBulkArchive,
  onClearSelection,
  className,
  canDelete = true,
  canEdit = true,
}: BulkActionToolbarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
            "bg-background border rounded-lg shadow-lg",
            "flex items-center gap-2 px-4 py-3",
            className
          )}
          role="toolbar"
          aria-label="Bulk actions toolbar"
        >
          {/* Selection Count */}
          <Badge 
            variant="secondary" 
            className="mr-2"
            aria-live="polite"
            aria-atomic="true"
          >
            {selectedCount} selected
          </Badge>

          {/* Status Update */}
          {canEdit && onBulkStatusUpdate && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  aria-label="Update status for selected tasks"
                  aria-haspopup="true"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  Status
                  <ChevronDown className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent role="menu" aria-label="Status options">
                <DropdownMenuItem 
                  onClick={() => onBulkStatusUpdate("todo")}
                  role="menuitem"
                >
                  <Clock className="mr-2 h-4 w-4 text-gray-500" aria-hidden="true" />
                  To Do
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onBulkStatusUpdate("in_progress")}
                  role="menuitem"
                >
                  <Clock className="mr-2 h-4 w-4 text-blue-500" aria-hidden="true" />
                  In Progress
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onBulkStatusUpdate("in_review")}
                  role="menuitem"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4 text-purple-500" aria-hidden="true" />
                  In Review
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onBulkStatusUpdate("done")}
                  role="menuitem"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" aria-hidden="true" />
                  Done
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Priority Update */}
          {canEdit && onBulkPriorityUpdate && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  aria-label="Update priority for selected tasks"
                  aria-haspopup="true"
                >
                  <Tag className="mr-2 h-4 w-4" aria-hidden="true" />
                  Priority
                  <ChevronDown className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent role="menu" aria-label="Priority options">
                <DropdownMenuItem 
                  onClick={() => onBulkPriorityUpdate("urgent")}
                  role="menuitem"
                >
                  <span className="mr-2 h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
                  Urgent
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onBulkPriorityUpdate("high")}
                  role="menuitem"
                >
                  <span className="mr-2 h-2 w-2 rounded-full bg-orange-500" aria-hidden="true" />
                  High
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onBulkPriorityUpdate("medium")}
                  role="menuitem"
                >
                  <span className="mr-2 h-2 w-2 rounded-full bg-yellow-500" aria-hidden="true" />
                  Medium
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onBulkPriorityUpdate("low")}
                  role="menuitem"
                >
                  <span className="mr-2 h-2 w-2 rounded-full bg-gray-500" aria-hidden="true" />
                  Low
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* More Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                aria-label="More bulk actions"
                aria-haspopup="true"
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent role="menu" aria-label="Additional actions">
              {canEdit && onBulkAssign && (
                <>
                  <DropdownMenuItem onClick={onBulkAssign} role="menuitem">
                    <User className="mr-2 h-4 w-4" aria-hidden="true" />
                    Assign to...
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {canEdit && onBulkArchive && (
                <DropdownMenuItem onClick={onBulkArchive} role="menuitem">
                  <Archive className="mr-2 h-4 w-4" aria-hidden="true" />
                  Archive
                </DropdownMenuItem>
              )}
              {canDelete && onBulkDelete && (
                <>
                  {(canEdit && onBulkArchive) && <DropdownMenuSeparator />}
                  <DropdownMenuItem 
                    onClick={onBulkDelete} 
                    className="text-red-600 focus:text-red-600"
                    role="menuitem"
                  >
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear Selection */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearSelection}
            aria-label="Clear selection"
          >
            <XCircle className="mr-2 h-4 w-4" aria-hidden="true" />
            Clear
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default BulkActionToolbar;

