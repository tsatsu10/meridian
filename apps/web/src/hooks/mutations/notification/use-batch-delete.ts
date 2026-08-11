import { useMutation, useQueryClient } from "@tanstack/react-query";
import { looseClient } from "@/lib/rpc-client";
import { toast } from "sonner";
import { invalidateNotificationQueries } from "./invalidate-notifications";

function useBatchDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationIds: string[]) => {
      const response = await looseClient.notification.batch.delete.$post({
        json: { ids: notificationIds },
      });

      if (!response.ok) {
        throw new Error("Failed to delete notifications");
      }

      return await response.json();
    },
    onSuccess: (data) => {
      invalidateNotificationQueries(queryClient);
      toast.success(`${data.deleted} notification(s) deleted`);
    },
    onError: (error) => {
      console.error("Failed to batch delete:", error);
      toast.error("Failed to delete notifications");
    },
  });
}

export default useBatchDelete;
