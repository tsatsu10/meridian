// @epic-1.1-workspace: Workspace Provider - Handle workspace initialization and selection
// @persona-sarah: PM needs proper workspace loading for project management
// @persona-david: Team lead needs reliable workspace access across sessions

import React, { useEffect } from 'react';
import useWorkspaceStore from '@/store/workspace';
import useAuth from './auth-provider/hooks/use-auth';
import useGetWorkspaces from '@/hooks/queries/workspace/use-get-workspaces';
import { useUserPreferencesStore } from '@/store/user-preferences';

interface WorkspaceProviderProps {
  children: React.ReactNode;
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const { setWorkspace } = useWorkspaceStore();
  const { user } = useAuth();
  const { data: workspaces, isLoading, error: workspacesError } = useGetWorkspaces();
  const { activeWorkspaceId, setActiveWorkspaceId } = useUserPreferencesStore();

  useEffect(() => {
    // Exit early if we don't have the required data
    if (!user || isLoading || !workspaces) {
      return;
    }

    // If we have an active workspace ID, try to find and set that workspace
    if (activeWorkspaceId) {
      const selectedWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
      if (selectedWorkspace) {
        setWorkspace(selectedWorkspace);
        return;
      } else {
        // Clear invalid workspace ID from localStorage
        setActiveWorkspaceId(null);
        setWorkspace(undefined);
        useWorkspaceStore.getState().setWorkspace(undefined);
        // Continue to set first available workspace
      }
    }

    // If no saved workspace or invalid workspace, set first available workspace
    if (workspaces.length > 0) {
      const firstWorkspace = workspaces[0];
      setWorkspace(firstWorkspace);
      setActiveWorkspaceId(firstWorkspace.id);
    } else {
      // No workspaces available
      setWorkspace(undefined);
      setActiveWorkspaceId(null);
      useWorkspaceStore.getState().setWorkspace(undefined);
    }
  }, [user, workspaces, isLoading, activeWorkspaceId, setWorkspace, setActiveWorkspaceId]);

  return <>{children}</>;
}

export default WorkspaceProvider; 