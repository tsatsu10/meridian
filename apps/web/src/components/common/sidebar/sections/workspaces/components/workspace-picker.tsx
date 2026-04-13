import useGetWorkspaces from "@/hooks/queries/workspace/use-get-workspaces";
import { cn } from "@/lib/cn";
import useProjectStore from "@/store/project";
import { useUserPreferencesStore } from "@/store/user-preferences";
import useWorkspaceStore from "@/store/workspace";
import type { Workspace } from "@/types/workspace";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useNavigate } from "@tanstack/react-router";
import { ChevronDown, Plus } from "lucide-react";
import { useState } from "react";
import CreateWorkspaceModal from "../../../../../shared/modals/create-workspace-modal";

function WorkspacePicker() {
  const { workspace: selectedWorkspace, setWorkspace } = useWorkspaceStore();
  const { setProject } = useProjectStore();
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { data: workspaces } = useGetWorkspaces();
  const { isSidebarOpened, setActiveWorkspaceId } = useUserPreferencesStore();
  const navigate = useNavigate();

  const handleSelectWorkspace = (selectedWorkspace: Workspace) => {
    setProject(undefined);
    setWorkspace(selectedWorkspace);
    setActiveWorkspaceId(selectedWorkspace.id);
    navigate({
      to: "/dashboard",
    });
  };

  const handleCreateWorkspace = () => {
    setIsCreateWorkspaceOpen(true);
    setIsDropdownOpen(false);
  };

  return (
    <div>
      {isSidebarOpened ? (
        <DropdownMenu.Root 
          open={isDropdownOpen} 
          onOpenChange={(open) => {
            setIsDropdownOpen(open);
            // Manage focus to prevent aria-hidden conflicts
            if (!open) {
              // Focus management handled by Radix
            }
          }}
        >
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="w-full px-3 py-2 text-left rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors group"
              aria-expanded={isDropdownOpen}
              aria-haspopup="menu"
            >
              <div className="flex items-center">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-0.5">
                    Workspace
                  </div>
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    {selectedWorkspace?.name || "Select Workspace"}
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 ml-2" />
              </div>
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="w-56 z-50 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 py-1"
              align="start"
              sideOffset={5}
              avoidCollisions={true}
              collisionPadding={8}
            >
              {workspaces &&
                workspaces.length > 0 &&
                workspaces.map((workspace) => (
                  <DropdownMenu.Item
                    key={workspace.id}
                    className={cn(
                      "flex items-center px-3 py-2 text-sm cursor-pointer outline-none",
                      workspace.id === selectedWorkspace?.id
                        ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
                        : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700",
                    )}
                    onClick={() => handleSelectWorkspace(workspace)}
                  >
                    {workspace.name}
                  </DropdownMenu.Item>
                ))}
              {workspaces && workspaces.length > 0 && (
                <DropdownMenu.Separator className="h-px bg-zinc-200 dark:bg-zinc-700 my-1" />
              )}
              <DropdownMenu.Item
                className="flex items-center px-3 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer outline-none"
                onClick={handleCreateWorkspace}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Workspace
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      ) : (
        // Collapsed version - just show workspace initial
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
            {selectedWorkspace?.name?.charAt(0).toUpperCase() || "W"}
          </div>
        </div>
      )}

      <CreateWorkspaceModal
        open={isCreateWorkspaceOpen}
        onClose={() => setIsCreateWorkspaceOpen(false)}
      />
    </div>
  );
}

export default WorkspacePicker;
