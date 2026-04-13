import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Star,
  Copy,
  Archive,
  ArchiveRestore,
  Share2,
  Trash2,
  Edit,
  Settings,
} from "lucide-react";
import type { ProjectDashboardRow } from "@/types/project";

interface QuickActionsMenuProps {
  project: ProjectDashboardRow;
  isPinned?: boolean;
  onStar?: (projectId: string) => void;
  onDuplicate?: (project: ProjectDashboardRow) => void;
  onArchive?: (project: ProjectDashboardRow) => void;
  onRestore?: (project: ProjectDashboardRow) => void;
  onShare?: (project: ProjectDashboardRow) => void;
  onEdit?: (project: ProjectDashboardRow) => void;
  onDelete?: (project: ProjectDashboardRow) => void;
  onSettings?: (project: ProjectDashboardRow) => void;
}

export function QuickActionsMenu({
  project,
  isPinned = false,
  onStar,
  onDuplicate,
  onArchive,
  onRestore,
  onShare,
  onEdit,
  onDelete,
  onSettings,
}: QuickActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {onStar && (
          <DropdownMenuItem onClick={() => onStar(project.id)}>
            <Star className={`h-4 w-4 mr-2 ${isPinned ? 'fill-yellow-500' : ''}`} />
            {isPinned ? "Unpin" : "Pin to Top"}
          </DropdownMenuItem>
        )}
        {onEdit && (
          <DropdownMenuItem onClick={() => onEdit(project)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Project
          </DropdownMenuItem>
        )}
        {onDuplicate && (
          <DropdownMenuItem onClick={() => onDuplicate(project)}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </DropdownMenuItem>
        )}
        {onShare && (
          <DropdownMenuItem onClick={() => onShare(project)}>
            <Share2 className="h-4 w-4 mr-2" />
            Share Link
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {onSettings && (
          <DropdownMenuItem onClick={() => onSettings(project)}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </DropdownMenuItem>
        )}
        {project.isArchived ? (
          onRestore && (
            <DropdownMenuItem onClick={() => onRestore(project)}>
              <ArchiveRestore className="h-4 w-4 mr-2" />
              Restore
            </DropdownMenuItem>
          )
        ) : (
          onArchive && (
            <DropdownMenuItem onClick={() => onArchive(project)}>
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </DropdownMenuItem>
          )
        )}
        {onDelete && (
          <DropdownMenuItem 
            onClick={() => onDelete(project)}
            className="text-red-600 dark:text-red-400"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

