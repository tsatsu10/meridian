import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";
import { toast } from "sonner";

interface CreateAutomationData {
  teamId: string;
  name: string;
  description?: string;
  trigger: {
    type: string;
    config: any;
  };
  actions: any[];
  enabled?: boolean;
}

// @epic-3.4-teams: Hook for creating team automation
export function useCreateAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId, ...data }: CreateAutomationData) => {
      const response = await fetchApi(`/team/${teamId}/automations`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["team-automations", variables.teamId] });
      toast.success("Automation created successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to create automation");
    },
  });
}

