import markNotificationAsRead from "@/fetchers/notification/mark-notification-as-read";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateNotificationQueries } from "./invalidate-notifications";

function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markNotificationAsRead(id),
    onSuccess: () => {
      invalidateNotificationQueries(queryClient);
    },
  });
}

export default useMarkNotificationAsRead;
