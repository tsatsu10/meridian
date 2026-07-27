// @epic-1.1-workspace: Workspace Provider - Handle workspace initialization and selection
// @persona-sarah: PM needs proper workspace loading for project management
// @persona-david: Team lead needs reliable workspace access across sessions

import type React from "react";
import { useLayoutEffect, useState } from "react";
import { AppLoadingScreen } from "@/components/branding/app-loading-screen";
import useWorkspaceStore from "@/store/workspace";
import useAuth from "./auth-provider/hooks/use-auth";
import useGetWorkspaces from "@/hooks/queries/workspace/use-get-workspaces";
import { useUserPreferencesStore } from "@/store/user-preferences";

interface WorkspaceProviderProps {
  children: React.ReactNode;
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const { setWorkspace } = useWorkspaceStore();
  const { user } = useAuth();
  const { data: workspaces, isLoading } = useGetWorkspaces();
  const { activeWorkspaceId, setActiveWorkspaceId } = useUserPreferencesStore();
  const [hasInitialized, setHasInitialized] = useState(false);

  // useLayoutEffect (not useEffect) so the selection lands before the browser
  // paints. With useEffect, the render where workspaces have loaded but no
  // workspace is selected yet was painted first, flashing "Select Workspace"
  // for a frame before the real dashboard appeared.
  useLayoutEffect(() => {
    // Exit early if we don't have the required data
    if (!user || isLoading || !workspaces) {
      return;
    }

    // Data is ready — every branch below settles the selection, so the boot
    // gate can lift. Batched with the setWorkspace calls into one re-render.
    setHasInitialized(true);

    // If we have an active workspace ID, try to find and set that workspace
    if (activeWorkspaceId) {
      const selectedWorkspace = workspaces.find(
        (w: { id: string }) => w.id === activeWorkspaceId,
      );
      if (selectedWorkspace) {
        setWorkspace(selectedWorkspace);
        return;
      }
      // Clear invalid workspace ID from localStorage
      setActiveWorkspaceId(null);
      setWorkspace(undefined);
      useWorkspaceStore.getState().setWorkspace(undefined);
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
  }, [
    user,
    workspaces,
    isLoading,
    activeWorkspaceId,
    setWorkspace,
    setActiveWorkspaceId,
  ]);

  // Hold the boot screen until the FIRST workspace selection has landed.
  // Without this, the dashboard chrome renders for a frame with no workspace
  // chosen and flashes "Select Workspace" before the real one appears.
  // Only gates the initial boot — once initialized, later deselections (e.g.
  // clicking the logo) render normally.
  if (user && !hasInitialized) {
    return <AppLoadingScreen />;
  }

  return <>{children}</>;
}

export default WorkspaceProvider;
