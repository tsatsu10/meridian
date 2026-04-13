/**
 * 🗑️ Remove Member Mutation Hook
 * 
 * @epic-3.4-teams - Member removal with proper cleanup
 * @persona-sarah - PM needs to remove inactive members
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/constants/urls';
import { invalidateDashboardQueriesForWorkspace } from '@/lib/dashboard/invalidate-workspace-project-surface';

interface RemoveMemberParams {
  workspaceId: string;
  memberId: string;
}

interface RemoveMemberResponse {
  success: boolean;
  message: string;
  member: {
    id: string;
    userId?: string;
    email: string;
    name: string;
    role: string;
  };
  impact: {
    unassignedTasks: number;
    projectsAffected: number;
  };
  removedAt: string;
}

async function removeMember({ workspaceId, memberId }: RemoveMemberParams): Promise<RemoveMemberResponse> {
  const response = await fetch(
    `${API_BASE_URL}/workspace-user/${workspaceId}/members/${memberId}`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to remove member');
  }

  return response.json();
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeMember,
    
    // Optimistic update
    onMutate: async ({ workspaceId, memberId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['project-members'] });
      await queryClient.cancelQueries({ queryKey: ['workspace-users', workspaceId] });
      
      // Snapshot previous values
      const previousMembers = queryClient.getQueryData(['project-members']);
      const previousWorkspaceUsers = queryClient.getQueryData(['workspace-users', workspaceId]);
      
      // Optimistically remove from project members
      queryClient.setQueryData(['project-members'], (old: any) => {
        if (!old) return old;
        return old.filter((member: any) => member.id !== memberId);
      });
      
      // Optimistically remove from workspace users
      queryClient.setQueryData(['workspace-users', workspaceId], (old: any) => {
        if (!old) return old;
        return old.filter((user: any) => user.id !== memberId);
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
      
      console.error('❌ Failed to remove member:', error);
      toast.error(error.message || 'Failed to remove member. Please try again.');
    },
    
    // Refetch on success
    onSuccess: (data, variables) => {
      const impactMessage = data.impact.unassignedTasks > 0 
        ? ` (${data.impact.unassignedTasks} tasks unassigned)`
        : '';
      
      toast.success(data.message + impactMessage);
      
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ['project-members'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-users', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] }); // Refetch tasks since assignments changed
      invalidateDashboardQueriesForWorkspace(queryClient, variables.workspaceId);
    },
  });
}

