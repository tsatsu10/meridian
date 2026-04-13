import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@meridian/libs";
import { toast } from "sonner";

function useBatchDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationIds: string[]) => {
      const response = await client.notification.batch.delete.$post({
        json: { ids: notificationIds },
      });

      if (!response.ok) {
        throw new Error("Failed to delete notifications");
      }

      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(`${data.deleted} notification(s) deleted`);
    },
    onError: (error) => {
      console.error("Failed to batch delete:", error);
      toast.error("Failed to delete notifications");
    },
  });
}

export default useBatchDelete;

