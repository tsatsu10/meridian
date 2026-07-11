import { looseClient } from "@/lib/rpc-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

async function unpinNotification(id: string) {
  const response = await looseClient.notification[":id"].unpin.$patch({
    param: { id },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

function useUnpinNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unpinNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export default useUnpinNotification;
