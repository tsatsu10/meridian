import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";
import { toast } from "sonner";

interface DeleteAutomationData {
  teamId: string;
  automationId: string;
}

// @epic-3.4-teams: Hook for deleting team automation
export function useDeleteAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId, automationId }: DeleteAutomationData) => {
      const response = await fetchApi(`/team/${teamId}/automations/${automationId}`, {
        method: "DELETE",
      });
      return response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["team-automations", variables.teamId] });
      toast.success("Automation deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to delete automation");
    },
  });
}

