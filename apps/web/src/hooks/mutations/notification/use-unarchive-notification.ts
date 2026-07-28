import { useMutation, useQueryClient } from "@tanstack/react-query";
import { looseClient } from "@/lib/rpc-client";
import { toast } from "sonner";
import { userMessage } from "@/lib/user-message";

function useUnarchiveNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await looseClient.notification[":id"].unarchive.$patch({
        param: { id: notificationId },
      });

      if (!response.ok) {
        throw new Error("Failed to unarchive notification");
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notification restored");
    },
    onError: (error) => {
      console.error("Failed to unarchive notification:", error);
      toast.error(userMessage(error, "unarchive the notification"));
    },
  });
}

export default useUnarchiveNotification;
