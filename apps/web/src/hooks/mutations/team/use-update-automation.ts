import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";
import { toast } from "sonner";

interface UpdateAutomationData {
  teamId: string;
  automationId: string;
  name?: string;
  description?: string;
  trigger?: {
    type: string;
    config: any;
  };
  actions?: any[];
  enabled?: boolean;
}

// @epic-3.4-teams: Hook for updating team automation
export function useUpdateAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId, automationId, ...data }: UpdateAutomationData) => {
      const response = await fetchApi(`/team/${teamId}/automations/${automationId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["team-automations", variables.teamId] });
      toast.success("Automation updated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update automation");
    },
  });
}

