import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";
import { toast } from "sonner";
import type { NotificationPreferences } from "@/hooks/queries/team/use-get-team-notifications";

interface UpdateNotificationsData {
  teamId: string;
  preferences: Partial<NotificationPreferences>;
}

// @epic-3.4-teams: Hook for updating team notification preferences
export function useUpdateTeamNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId, preferences }: UpdateNotificationsData) => {
      const response = await fetchApi(`/team/${teamId}/notifications`, {
        method: "PUT",
        body: JSON.stringify({ preferences }),
      });
      return response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["team-notifications", variables.teamId] });
      toast.success("Notification preferences updated");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update notification preferences");
    },
  });
}

