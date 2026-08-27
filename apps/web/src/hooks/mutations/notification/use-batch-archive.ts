import { useMutation, useQueryClient } from "@tanstack/react-query";
import { looseClient } from "@/lib/rpc-client";
import { toast } from "sonner";
import { userMessage } from "@/lib/user-message";

function useBatchArchive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationIds: string[]) => {
      const response = await looseClient.notification.batch.archive.$post({
        json: { ids: notificationIds },
      });

      if (!response.ok) {
        throw new Error("Failed to archive notifications");
      }

      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(`${data.updated} notification(s) archived`);
    },
    onError: (error) => {
      console.error("Failed to batch archive:", error);
      toast.error(userMessage(error, "archive those notifications"));
    },
  });
}

export default useBatchArchive;
