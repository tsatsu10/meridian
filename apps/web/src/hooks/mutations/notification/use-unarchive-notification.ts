import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@meridian/libs";
import { toast } from "sonner";

function useUnarchiveNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await client.notification[":id"]["unarchive"].$patch({
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
      toast.error("Failed to unarchive notification");
    },
  });
}

export default useUnarchiveNotification;

