import signIn from "@/fetchers/user/sign-in";
import { useMutation, useQueryClient } from "@tanstack/react-query";

function useSignIn() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: signIn,
    onSuccess: async () => {
      // Invalidate and wait for /me query to refetch with new session
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      // Force an immediate refetch to ensure fresh data
      await queryClient.refetchQueries({ queryKey: ["me"] });
    },
  });
}

export default useSignIn;
