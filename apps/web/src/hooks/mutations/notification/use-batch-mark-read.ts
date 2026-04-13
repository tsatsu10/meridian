import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@meridian/libs";
import { toast } from "sonner";

function useBatchMarkRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationIds: string[]) => {
      const response = await client.notification.batch["mark-read"].$post({
        json: { ids: notificationIds },
      });

      if (!response.ok) {
        throw new Error("Failed to mark notifications as read");
      }

      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(`${data.updated} notification(s) marked as read`);
    },
    onError: (error) => {
      console.error("Failed to batch mark as read:", error);
      toast.error("Failed to mark notifications as read");
    },
  });
}

export default useBatchMarkRead;

