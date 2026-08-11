import { useMutation, useQueryClient } from "@tanstack/react-query";
import { looseClient } from "@/lib/rpc-client";
import { toast } from "sonner";
import { invalidateNotificationQueries } from "./invalidate-notifications";

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
      invalidateNotificationQueries(queryClient);
      toast.success(`${data.updated} notification(s) archived`);
    },
    onError: (error) => {
      console.error("Failed to batch archive:", error);
      toast.error("Failed to archive notifications");
    },
  });
}

export default useBatchArchive;
