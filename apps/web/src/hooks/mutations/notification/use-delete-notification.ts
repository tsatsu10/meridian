import { useMutation, useQueryClient } from "@tanstack/react-query";
import { looseClient } from "@/lib/rpc-client";
import { toast } from "sonner";
import { invalidateNotificationQueries } from "./invalidate-notifications";

function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await looseClient.notification[":id"].$delete({
        param: { id: notificationId },
      });
      if (!response.ok) {
        throw new Error("Failed to delete notification");
      }
      return response.json();
    },
    onSuccess: () => {
      invalidateNotificationQueries(queryClient);
      toast.success("Notification deleted");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete notification");
    },
  });
}

export default useDeleteNotification;
