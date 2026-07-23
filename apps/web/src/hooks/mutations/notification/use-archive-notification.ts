import { useMutation, useQueryClient } from "@tanstack/react-query";
import { looseClient } from "@/lib/rpc-client";
import { toast } from "sonner";
import { invalidateNotificationQueries } from "./invalidate-notifications";

function useArchiveNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await looseClient.notification[":id"].archive.$patch({
        param: { id: notificationId },
      });

      if (!response.ok) {
        throw new Error("Failed to archive notification");
      }

      return await response.json();
    },
    onSuccess: () => {
      invalidateNotificationQueries(queryClient);
      toast.success("Notification archived");
    },
    onError: (error) => {
      console.error("Failed to archive notification:", error);
      toast.error("Failed to archive notification");
    },
  });
}

export default useArchiveNotification;
