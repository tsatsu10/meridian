import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@meridian/libs";
import { toast } from "sonner";

function useBatchArchive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationIds: string[]) => {
      const response = await client.notification.batch.archive.$post({
        json: { ids: notificationIds },
      });

      if (!response.ok) {
        throw new Error("Failed to archive notifications");
      }

      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(`${data.updated} notification(s) archived`);
    },
    onError: (error) => {
      console.error("Failed to batch archive:", error);
      toast.error("Failed to archive notifications");
    },
  });
}

export default useBatchArchive;

