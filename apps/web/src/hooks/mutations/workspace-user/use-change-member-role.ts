/**
 * 🔄 Change Member Role Mutation Hook
 * 
 * @epic-3.4-teams - Role management with optimistic updates
 * @persona-sarah - PM needs to change member roles efficiently
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API_BASE_URL, API_URL } from '@/constants/urls';

interface ChangeMemberRoleParams {
  workspaceId: string;
  memberId: string;
  newRole: string;
}

interface MemberData {
  id: string;
  userId?: string;
  email: string;
  name: string;
  role: string;
  oldRole?: string;
  updatedAt: string;
}

interface ChangeMemberRoleResponse {
  success: boolean;
  message: string;
  member: MemberData;
}

async function changeMemberRole({ workspaceId, memberId, newRole }: ChangeMemberRoleParams): Promise<ChangeMemberRoleResponse> {
  const response = await fetch(
    `${API_BASE_URL}/workspace-user/${workspaceId}/members/${memberId}/role`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ role: newRole }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to change role');
  }

  return response.json();
}

export function useChangeMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: changeMemberRole,
    
    // Optimistic update
    onMutate: async ({ workspaceId, memberId, newRole }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['project-members'] });
      await queryClient.cancelQueries({ queryKey: ['workspace-users', workspaceId] });
      
      // Snapshot previous values
      const previousMembers = queryClient.getQueryData(['project-members']);
      const previousWorkspaceUsers = queryClient.getQueryData(['workspace-users', workspaceId]);
      
      // Optimistically update project members
      queryClient.setQueryData(['project-members'], (old: any) => {
        if (!old) return old;
        return old.map((member: any) => 
          member.id === memberId 
            ? { ...member, role: newRole }
            : member
        );
      });
      
      // Optimistically update workspace users
      queryClient.setQueryData(['workspace-users', workspaceId], (old: any) => {
        if (!old) return old;
        return old.map((user: any) => 
          user.id === memberId 
            ? { ...user, role: newRole }
            : user
        );
      });
      
      return { previousMembers, previousWorkspaceUsers };
    },
    
    // Rollback on error
    onError: (error: Error, variables, context) => {
      // Restore previous values
      if (context?.previousMembers) {
        queryClient.setQueryData(['project-members'], context.previousMembers);
      }
      if (context?.previousWorkspaceUsers) {
        queryClient.setQueryData(['workspace-users', variables.workspaceId], context.previousWorkspaceUsers);
      }
      
      console.error('❌ Failed to change role:', error);
      toast.error(error.message || 'Failed to change role. Please try again.');
    },
    
    // Refetch on success
    onSuccess: (data, variables) => {
      toast.success(data.message || `Role changed to ${variables.newRole}`);
      
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ['project-members'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-users', variables.workspaceId] });
    },
  });
}

