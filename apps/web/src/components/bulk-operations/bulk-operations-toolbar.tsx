import { useBulkOperations } from "@/contexts/bulk-operations-context";
// Removed Lucide imports due to React 18/19 type conflicts
import { useState } from "react";
import useWorkspaceStore from "@/store/workspace";
import useGetActiveWorkspaceUsers from "@/hooks/queries/workspace-users/use-active-workspace-users";

export function BulkOperationsToolbar() {
  // Use bulk operations if available, otherwise return null
  let selectedTasks = new Set<string>();
  let isSelectionMode = false;
  let clearSelection = () => {};
  let exitSelectionMode = () => {};
  let bulkUpdateStatus = (_status: string) => {};
  let bulkUpdatePriority = (_priority: string) => {};
  let bulkDelete = () => {};
  let bulkAssign = (_userEmail: string) => {};

  try {
    const bulkOps = useBulkOperations();
    selectedTasks = bulkOps.selectedTasks;
    isSelectionMode = bulkOps.isSelectionMode;
    clearSelection = bulkOps.clearSelection;
    exitSelectionMode = bulkOps.exitSelectionMode;
    bulkUpdateStatus = bulkOps.bulkUpdateStatus;
    bulkUpdatePriority = bulkOps.bulkUpdatePriority;
    bulkDelete = bulkOps.bulkDelete;
    bulkAssign = bulkOps.bulkAssign;
  } catch (error) {
    // BulkOperationsProvider not available, don't render
    return null;
  }

  const { workspace } = useWorkspaceStore();
  const { data: workspaceUsers } = useGetActiveWorkspaceUsers({
    workspaceId: workspace?.id ?? "",
  });

  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showAssignMenu, setShowAssignMenu] = useState(false);

  if (!isSelectionMode || selectedTasks.size === 0) {
    return null;
  }

  const statusOptions = [
    { id: "todo", name: "To Do", color: "bg-gray-500" },
    { id: "in_progress", name: "In Progress", color: "bg-blue-500" },
    { id: "done", name: "In Review", color: "bg-yellow-500" },
    { id: "done", name: "Done", color: "bg-green-500" },
  ];

  const priorityOptions = [
    { id: "low", name: "Low", color: "bg-green-500" },
    { id: "medium", name: "Medium", color: "bg-yellow-500" },
    { id: "high", name: "High", color: "bg-orange-500" },
    { id: "urgent", name: "Urgent", color: "bg-red-500" },
  ];

  const assignOptions = [
    { id: "", name: "Unassigned" },
    ...(workspaceUsers?.map((user) => ({
      id: user.userEmail ?? "",
      name: user.userName ?? user.userEmail ?? "",
    })) || []),
  ];

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg p-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <div className="w-4 h-4 border-2 border-current rounded flex items-center justify-center">
              <div className="w-2 h-2 bg-current rounded-sm"></div>
            </div>
            <span>{selectedTasks.size} selected</span>
          </div>

          <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-600" />

          {/* Status Update */}
          <div className="relative">
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <div className="w-4 h-4 flex items-center justify-center">
                <div className="w-3 h-2 border-l-2 border-b-2 border-current transform rotate-[-45deg] translate-y-[-1px]"></div>
              </div>
              Status
            </button>
            {showStatusMenu && (
              <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg p-1 min-w-32">
                {statusOptions.map((status) => (
                  <button
                    key={status.id}
                    onClick={() => {
                      bulkUpdateStatus(status.id);
                      setShowStatusMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md"
                  >
                    <div className={`w-2 h-2 rounded-full ${status.color}`} />
                    {status.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Priority Update */}
          <div className="relative">
            <button
              onClick={() => setShowPriorityMenu(!showPriorityMenu)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-md hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
            >
              <div className="w-4 h-4 flex items-center justify-start">
                <div className="w-3 h-2 bg-current rounded-r"></div>
                <div className="w-px h-3 bg-current ml-[-1px]"></div>
              </div>
              Priority
            </button>
            {showPriorityMenu && (
              <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg p-1 min-w-32">
                {priorityOptions.map((priority) => (
                  <button
                    key={priority.id}
                    onClick={() => {
                      bulkUpdatePriority(priority.id);
                      setShowPriorityMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md"
                  >
                    <div className={`w-2 h-2 rounded-full ${priority.color}`} />
                    {priority.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Assign */}
          <div className="relative">
            <button
              onClick={() => setShowAssignMenu(!showAssignMenu)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
            >
              <div className="w-4 h-4 flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-current rounded-full mb-1"></div>
                <div className="w-3 h-1.5 bg-current rounded-b-full absolute mt-1"></div>
              </div>
              Assign
            </button>
            {showAssignMenu && (
              <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg p-1 min-w-40">
                {assignOptions.map((assignee) => (
                  <button
                    key={assignee.id}
                    onClick={() => {
                      bulkAssign(assignee.id);
                      setShowAssignMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md"
                  >
                    <div className="w-4 h-4 flex items-center justify-center text-zinc-400">
                      <div className="w-2.5 h-2.5 bg-current rounded-full mb-1"></div>
                      <div className="w-3 h-1.5 bg-current rounded-b-full absolute mt-1"></div>
                    </div>
                    {assignee.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Delete */}
          <button
            onClick={() => {
              if (confirm(`Delete ${selectedTasks.size} selected tasks?`)) {
                bulkDelete();
              }
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <div className="w-4 h-4 flex items-center justify-center">
              <div className="w-3 h-3 border border-current rounded relative">
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-0.5 bg-current rounded"></div>
                <div className="absolute top-0.5 left-1/2 transform -translate-x-1/2 w-px h-1.5 bg-current"></div>
              </div>
            </div>
            Delete
          </button>

          <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-600" />

          {/* Clear Selection */}
          <button
            onClick={clearSelection}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            Clear
          </button>

          {/* Exit Selection Mode */}
          <button
            onClick={exitSelectionMode}
            className="flex items-center gap-1 px-2 py-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            <div className="w-4 h-4 flex items-center justify-center">
              <div className="relative">
                <div className="w-3 h-0.5 bg-current transform rotate-45 absolute"></div>
                <div className="w-3 h-0.5 bg-current transform -rotate-45 absolute"></div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
} 