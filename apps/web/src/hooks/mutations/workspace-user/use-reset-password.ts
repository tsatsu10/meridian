import { useMutation } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface ResetPasswordData {
  userEmail: string;
}

// @epic-3.4-teams: Hook for resetting user password
export function useResetPassword() {
  return useMutation({
    mutationFn: async ({ userEmail }: ResetPasswordData) => {
      const response = await fetchApi(`/workspace-user/${userEmail}/reset-password`, {
        method: "POST",
      });
      return response;
    },
    onSuccess: (data) => {
      toast.success("Password reset email sent successfully");
      // In production, don't show the temp password
      if (data.tempPassword) {
        logger.debug("Temporary password:", data.tempPassword);
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to reset password");
    },
  });
}

