import clearNotifications from "@/fetchers/notification/clear-notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateNotificationQueries } from "./invalidate-notifications";

function useClearNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clearNotifications,
    onSuccess: () => {
      invalidateNotificationQueries(queryClient);
    },
  });
}

export default useClearNotifications;
