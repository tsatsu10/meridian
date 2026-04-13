import { client } from "@meridian/libs";
import { useMutation, useQueryClient } from "@tanstack/react-query";

async function pinNotification(id: string) {
  const response = await client.notification[":id"].pin.$patch({
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
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export default usePinNotification; 