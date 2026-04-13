import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { API_BASE_URL } from '@/constants/urls';

// 📧 Send workspace invitation
interface SendInvitationData {
  workspaceId: string;
  inviteeEmail: string;
  roleToAssign: "member" | "team-lead" | "project-manager" | "department-head";
  message?: string;
}

export function useSendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SendInvitationData) => {
      const response = await fetch(`${API_BASE_URL}/workspace/${data.workspaceId}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          inviteeEmail: data.inviteeEmail,
          roleToAssign: data.roleToAssign,
          message: data.message,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send invitation");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(`Invitation sent to ${data.inviteeEmail}`);
      queryClient.invalidateQueries({ queryKey: ["workspace-invitations"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to send invitation");
    },
  });
}

// ✅ Accept workspace invitation
interface AcceptInvitationData {
  invitationToken: string;
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AcceptInvitationData) => {
      const response = await fetch(`${API_BASE_URL}/workspace/invitations/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          invitationToken: data.invitationToken,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to accept invitation");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(data.message || `Welcome to ${data.workspaceName}!`);
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-invitations"] });
      
      // Redirect to the main dashboard after successful acceptance
      window.location.href = "/dashboard";
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to accept invitation");
    },
  });
}

// 📋 Get pending invitations for user (if needed)
export function usePendingInvitations() {
  return useQuery({
    queryKey: ["pending-invitations"],
    queryFn: async () => {
      // This would be implemented if we add an endpoint to get user's pending invitations
      // For now, invitations will be handled via email links
      return [];
    },
    enabled: false, // Disabled for now
  });
} 