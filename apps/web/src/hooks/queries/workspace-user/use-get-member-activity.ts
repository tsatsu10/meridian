/**
 * 📊 Get Member Activity Hook
 * 
 * @epic-3.4-teams - Enhanced member details with activity data
 */

import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL, API_URL } from '@/constants/urls';

interface MemberActivityData {
  member: {
    id: string;
    userId: string;
    email: string;
    name: string;
    role: string;
    joinedAt: string;
  };
  taskStats: {
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
    highPriority: number;
    completedThisWeek: number;
    completedThisMonth: number;
  };
  timeline: Array<{
    id: string;
    type: string;
    action: string;
    details: string;
    createdAt: string;
    icon: string;
    color: string;
  }>;
  attachments: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    createdAt: string;
  }>;
  contributionGraph: Array<{
    date: string;
    count: number;
  }>;
  performanceTrends: Array<{
    week: string;
    weekStart: string;
    weekEnd: string;
    tasksCompleted: number;
    hoursLogged: number;
    productivity: number;
  }>;
  timeStats: {
    totalHoursLogged: number;
    averageHoursPerWeek: number;
    timeEntriesCount: number;
  };
}

async function getMemberActivity(workspaceId: string, memberId: string): Promise<MemberActivityData> {
  const response = await fetch(
    `${API_BASE_URL}/workspace-user/${workspaceId}/members/${memberId}/activity`,
    {
      method: 'GET',
      credentials: 'include',
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch member activity');
  }

  return response.json();
}

export function useGetMemberActivity(workspaceId: string, memberId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['member-activity', workspaceId, memberId],
    queryFn: () => getMemberActivity(workspaceId, memberId),
    enabled: enabled && !!workspaceId && !!memberId,
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
  });
}

