import markAllNotificationsAsRead from "@/fetchers/notification/mark-all-notifications-as-read";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateNotificationQueries } from "./invalidate-notifications";

function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      invalidateNotificationQueries(queryClient);
    },
  });
}

export default useMarkAllNotificationsAsRead;
