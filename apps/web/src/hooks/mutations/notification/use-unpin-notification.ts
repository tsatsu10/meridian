import { client } from "@meridian/libs";
import { useMutation, useQueryClient } from "@tanstack/react-query";

async function unpinNotification(id: string) {
  const response = await client.notification[":id"].unpin.$patch({
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