import { useEffect, useRef, useState } from "react";

export interface DashboardTrackedStats {
  totalTasks: number;
  activeProjects: number;
  completedTasks: number;
  teamMembers: number;
}

const STORAGE_PREFIX = "meridian-dashboard-stats:";

function readStored(workspaceId: string): DashboardTrackedStats | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + workspaceId);
    return raw ? (JSON.parse(raw) as DashboardTrackedStats) : null;
  } catch {
    return null;
  }
}

function writeStored(workspaceId: string, stats: DashboardTrackedStats): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + workspaceId, JSON.stringify(stats));
  } catch {
    // localStorage unavailable (private mode, quota) — trend just won't persist.
  }
}

/**
 * Tracks stat values from the LAST time this workspace's dashboard was
 * viewed, so stat cards can show "change since you last looked" without a
 * backend history endpoint. Returns null until a prior value exists for
 * this workspace (first-ever view, or a workspace switch).
 *
 * The "previous" snapshot is captured once per workspace per mount, not on
 * every re-render — otherwise a later refetch (e.g. clicking Refresh) would
 * overwrite the baseline with itself before the user ever saw a delta.
 */
export function useDashboardStatsTrend(
  workspaceId: string | undefined,
  totalTasks: number,
  activeProjects: number,
  completedTasks: number,
  teamMembers: number,
): DashboardTrackedStats | null {
  const [previous, setPrevious] = useState<DashboardTrackedStats | null>(null);
  const capturedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;

    if (capturedFor.current !== workspaceId) {
      setPrevious(readStored(workspaceId));
      capturedFor.current = workspaceId;
    }

    writeStored(workspaceId, {
      totalTasks,
      activeProjects,
      completedTasks,
      teamMembers,
    });
  }, [workspaceId, totalTasks, activeProjects, completedTasks, teamMembers]);

  return previous;
}
