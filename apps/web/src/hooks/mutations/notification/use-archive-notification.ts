import { useMutation, useQueryClient } from "@tanstack/react-query";
import { looseClient } from "@/lib/rpc-client";
import { toast } from "sonner";
import { userMessage } from "@/lib/user-message";

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
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notification archived");
    },
    onError: (error) => {
      console.error("Failed to archive notification:", error);
      toast.error(userMessage(error, "archive the notification"));
    },
  });
}

export default useArchiveNotification;
