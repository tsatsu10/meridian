import type { Workspace } from "@/types/workspace";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface WorkspaceStore {
  workspace: Workspace | undefined;
  currentWorkspace: Workspace | undefined; // Alias for compatibility
  setWorkspace: (updatedWorkspace: Workspace | undefined) => void;
}

const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      workspace: undefined,
      get currentWorkspace() {
        // Fix: Ensure getter returns current workspace value
        const state = get();
        return state.workspace;
      },
      setWorkspace: (updatedWorkspace) => {
        console.log('🔧 setWorkspace called:', updatedWorkspace?.name || 'undefined');
        set(() => ({ workspace: updatedWorkspace }));
      },
    }),
    {
      name: "meridian-workspace",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        workspace: state.workspace,
      }),
    }
  )
);

export { useWorkspaceStore };
export default useWorkspaceStore;
