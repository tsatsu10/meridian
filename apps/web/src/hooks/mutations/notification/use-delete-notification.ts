import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@meridian/libs";
import { toast } from "sonner";

function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await client.notification[":id"].$delete({
        param: { id: notificationId },
      });
      if (!response.ok) {
        throw new Error("Failed to delete notification");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notification deleted");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete notification");
    },
  });
}

export default useDeleteNotification;

