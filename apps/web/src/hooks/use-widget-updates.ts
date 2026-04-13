/**
 * 🔔 Widget Update Detection Hook
 * 
 * Detects available updates for installed widgets
 */

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";
import useWorkspaceStore from "@/store/workspace";

export interface WidgetUpdate {
  widgetId: string;
  widgetName: string;
  currentVersion: string;
  latestVersion: string;
  changelog: VersionChangelog;
  releaseDate: string;
  isBreakingChange: boolean;
}

export interface VersionChangelog {
  version: string;
  releaseDate: string;
  changes: {
    type: "feature" | "bugfix" | "performance" | "breaking";
    description: string;
  }[];
  upgradeNotes?: string;
}

export function useWidgetUpdates() {
  const { user } = useAuth();
  const { workspace } = useWorkspaceStore();

  const { data, isLoading } = useQuery({
    queryKey: ['widget-updates', user?.email, workspace?.id],
    queryFn: async () => {
      const response = await api.get(`/api/settings/widget-updates/${user?.email}/${workspace?.id}`);
      return response?.data || response;
    },
    enabled: !!user?.email && !!workspace?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30 * 60 * 1000, // Check every 30 minutes
  });

  const updates = (data?.data || data || []) as WidgetUpdate[];
  const hasUpdates = updates.length > 0;
  const breakingChanges = updates.filter(u => u.isBreakingChange).length;

  return {
    updates,
    hasUpdates,
    breakingChanges,
    isLoading,
  };
}

// Helper function to compare semantic versions
export function compareVersions(current: string, latest: string): number {
  const parseVersion = (v: string) => {
    const match = v.match(/(\d+)\.(\d+)\.(\d+)/);
    if (!match) return [0, 0, 0];
    return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
  };

  const [currMajor, currMinor, currPatch] = parseVersion(current);
  const [latMajor, latMinor, latPatch] = parseVersion(latest);

  if (latMajor > currMajor) return 1; // Major update
  if (latMajor < currMajor) return -1;
  
  if (latMinor > currMinor) return 0.5; // Minor update
  if (latMinor < currMinor) return -1;
  
  if (latPatch > currPatch) return 0.1; // Patch update
  
  return 0; // Same version
}

// Helper to check if update is available
export function hasUpdateAvailable(currentVersion: string, latestVersion: string): boolean {
  return compareVersions(currentVersion, latestVersion) > 0;
}

