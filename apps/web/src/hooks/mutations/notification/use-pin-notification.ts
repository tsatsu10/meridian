import { looseClient } from "@/lib/rpc-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateNotificationQueries } from "./invalidate-notifications";

async function pinNotification(id: string) {
  const response = await looseClient.notification[":id"].pin.$patch({
    param: { id },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

function usePinNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: pinNotification,
    onSuccess: () => {
      invalidateNotificationQueries(queryClient);
    },
  });
}

export default usePinNotification;
