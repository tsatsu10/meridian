import { useMutation } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";
import { toast } from "sonner";

interface ResetPasswordData {
  workspaceId: string;
  userEmail: string;
}

// @epic-3.4-teams: Hook for resetting user password
export function useResetPassword() {
  return useMutation({
    mutationFn: async ({ workspaceId, userEmail }: ResetPasswordData) => {
      const response = await fetchApi(
        `/workspace-user/${workspaceId}/${userEmail}/reset-password`,
        {
          method: "POST",
        },
      );
      return response;
    },
    onSuccess: () => {
      toast.success("Password reset email sent successfully");
    },
    onError: (error: Error) => {
      toast.error(error?.message || "Failed to reset password");
    },
  });
}
