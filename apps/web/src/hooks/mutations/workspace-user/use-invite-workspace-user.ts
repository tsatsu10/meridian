import inviteWorkspaceMember from "@/fetchers/workspace-user/invite-workspace-member";
import { useMutation } from "@tanstack/react-query";

function useInviteWorkspaceUser() {
  return useMutation({
    mutationFn: ({
      workspaceId,
      userEmail,
      role,
    }: { workspaceId: string; userEmail: string; role?: string }) =>
      inviteWorkspaceMember({ workspaceId, userEmail, role }),
  });
}

export default useInviteWorkspaceUser;
