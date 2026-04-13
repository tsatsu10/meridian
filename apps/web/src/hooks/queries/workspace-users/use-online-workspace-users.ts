import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL, API_URL } from '@/constants/urls';

export interface OnlineUserRequest {
  workspaceId: string;
}

export interface OnlineUser {
  userEmail: string;
  userName: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  currentPage?: string;
}

async function getOnlineWorkspaceUsers({ workspaceId }: OnlineUserRequest): Promise<OnlineUser[]> {
  const response = await fetch(`${API_BASE_URL}/workspace-user/${workspaceId}/online`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch online workspace users');
  }
  
  return response.json();
}

export const useGetOnlineWorkspaceUsers = ({ workspaceId }: OnlineUserRequest) => {
  return useQuery({
    queryKey: ["workspace-users", "online", workspaceId],
    queryFn: () => getOnlineWorkspaceUsers({ workspaceId }),
    enabled: !!workspaceId && workspaceId.length > 0,
    refetchInterval: 30000, // Refetch every 30 seconds to keep online status current
    staleTime: 10000, // Consider data stale after 10 seconds
  });
}; 