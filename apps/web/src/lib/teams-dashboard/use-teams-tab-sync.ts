import { useEffect } from "react";

export type TeamsDashboardViewMode =
  | "teams"
  | "members"
  | "users"
  | "directory";

/**
 * Syncs tab query param (?tab=members) from `/dashboard/teams` into local view mode state.
 */
export function useTeamsTabFromSearch(
  tabFromSearch: string | undefined,
  setViewMode: (mode: TeamsDashboardViewMode) => void,
) {
  useEffect(() => {
    if (
      tabFromSearch === "teams" ||
      tabFromSearch === "members" ||
      tabFromSearch === "users" ||
      tabFromSearch === "directory"
    ) {
      setViewMode(tabFromSearch);
    }
  }, [tabFromSearch, setViewMode]);
}
