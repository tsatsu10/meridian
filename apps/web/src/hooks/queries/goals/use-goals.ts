/**
 * 🎯 useGoals Hook
 * 
 * Fetches goals for a workspace with optional filters
 */

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface GoalFilters {
  status?: 'draft' | 'active' | 'completed' | 'abandoned';
  type?: 'objective' | 'personal' | 'team' | 'strategic';
  userId?: string;
  privacy?: 'private' | 'team' | 'organization';
}

export interface Goal {
  id: string;
  workspaceId: string;
  userId: string;
  title: string;
  description?: string;
  type: string;
  timeframe: string;
  startDate?: string;
  endDate?: string;
  status: string;
  progress: number;
  privacy: string;
  parentGoalId?: string;
  priority: string;
  metadata: any;
  createdAt: string;
  updatedAt: string;
  keyResults?: KeyResult[];
}

export interface KeyResult {
  id: string;
  goalId: string;
  title: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  dueDate?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function useGoals(workspaceId: string, filters?: GoalFilters) {
  return useQuery({
    queryKey: ['goals', workspaceId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filters?.status) params.set('status', filters.status);
      if (filters?.type) params.set('type', filters.type);
      if (filters?.userId) params.set('userId', filters.userId);
      if (filters?.privacy) params.set('privacy', filters.privacy);
      
      const queryString = params.toString();
      const url = `/api/goals/${workspaceId}${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get(url);
      return response.data;
    },
    staleTime: 30000, // 30 seconds
    enabled: !!workspaceId,
  });
}

