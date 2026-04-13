// Bulk Actions Toolbar for Backlog
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  X, 
  Trash2, 
  Archive, 
  ArrowRight, 
  Tag,
  Users,
  AlertTriangle,
  CheckCircle2,
  MoreHorizontal
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BulkActionsToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkDelete: () => void;
  onBulkArchive: () => void;
  onBulkMoveToSprint: () => void;
  onBulkSetPriority: (priority: string) => void;
  onBulkAssign: () => void;
}

export function BulkActionsToolbar({
  selectedCount,
  onClearSelection,
  onBulkDelete,
  onBulkArchive,
  onBulkMoveToSprint,
  onBulkSetPriority,
  onBulkAssign,
}: BulkActionsToolbarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="bg-card border shadow-2xl rounded-lg p-3 sm:p-4 flex items-center gap-3 sm:gap-4 min-w-[320px] sm:min-w-[500px]">
            {/* Selection Count */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-semibold text-sm sm:text-base">
                {selectedCount}
              </Badge>
              <span className="text-sm sm:text-base font-medium hidden sm:inline">
                {selectedCount === 1 ? 'item' : 'items'} selected
              </span>
              <span className="text-sm font-medium sm:hidden">selected</span>
            </div>

            {/* Separator */}
            <div className="h-6 w-px bg-border" />

            {/* Quick Actions */}
            <div className="flex items-center gap-1 sm:gap-2 flex-1">
              {/* Move to Sprint */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onBulkMoveToSprint}
                className="h-8 px-2 sm:px-3"
                title="Move to Sprint"
              >
                <ArrowRight className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline text-xs">Sprint</span>
              </Button>

              {/* Archive */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onBulkArchive}
                className="h-8 px-2 sm:px-3"
                title="Archive"
              >
                <Archive className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline text-xs">Archive</span>
              </Button>

              {/* More Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 sm:px-3"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {/* Priority Submenu */}
                  <DropdownMenuItem onClick={() => onBulkSetPriority('high')}>
                    <AlertTriangle className="w-4 h-4 mr-2 text-red-600" />
                    Set High Priority
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onBulkSetPriority('medium')}>
                    <AlertTriangle className="w-4 h-4 mr-2 text-amber-600" />
                    Set Medium Priority
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onBulkSetPriority('low')}>
                    <AlertTriangle className="w-4 h-4 mr-2 text-blue-600" />
                    Set Low Priority
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  {/* Assign */}
                  <DropdownMenuItem onClick={onBulkAssign}>
                    <Users className="w-4 h-4 mr-2" />
                    Assign To...
                  </DropdownMenuItem>
                  
                  {/* Add Labels */}
                  <DropdownMenuItem>
                    <Tag className="w-4 h-4 mr-2" />
                    Add Labels...
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  {/* Delete */}
                  <DropdownMenuItem 
                    onClick={onBulkDelete}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Selected
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Clear Selection */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="h-8 px-2 sm:px-3"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
              <span className="sr-only">Clear selection</span>
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

