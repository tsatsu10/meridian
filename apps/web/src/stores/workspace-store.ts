/**
 * Workspace Store Stub
 * 
 * Temporary stub for workspace state management.
 * Components can import this without errors during build.
 */

import { create } from 'zustand';

interface Workspace {
  id: string;
  name: string;
  slug: string;
}

interface WorkspaceStore {
  workspace: Workspace | null;
  setWorkspace: (workspace: Workspace | null) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  workspace: null,
  setWorkspace: (workspace) => set({ workspace }),
}));

