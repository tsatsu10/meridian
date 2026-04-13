import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";

export interface NotificationPreferences {
  taskAssigned: boolean;
  taskCompleted: boolean;
  taskOverdue: boolean;
  memberJoined: boolean;
  memberLeft: boolean;
  teamUpdated: boolean;
  mentions: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  digest: "realtime" | "hourly" | "daily" | "weekly" | "never";
}

// @epic-3.4-teams: Hook for fetching team notification preferences
export function useGetTeamNotifications(teamId: string | undefined, userId?: string) {
  return useQuery<{ preferences: NotificationPreferences }>({
    queryKey: ["team-notifications", teamId, userId],
    queryFn: async () => {
      if (!teamId) throw new Error("Team ID is required");
      const params = userId ? `?userId=${userId}` : "";
      const response = await fetchApi(`/team/${teamId}/notifications${params}`);
      return response;
    },
    enabled: !!teamId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

