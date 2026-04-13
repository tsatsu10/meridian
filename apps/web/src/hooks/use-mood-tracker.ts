import { useState, useEffect, useCallback } from 'react';
import { useWorkspaceStore } from '@/store/workspace';
import { useAuth } from './auth';
import { API_BASE_URL } from '@/constants/urls';
import { toast } from 'sonner';

export type MoodType = 'great' | 'good' | 'okay' | 'bad' | 'stressed';

export interface MoodCheckin {
  id: string;
  mood: MoodType;
  notes?: string;
  createdAt: Date;
}

export interface MoodAnalytics {
  id: string;
  workspaceId: string;
  date: Date;
  moodDistribution: Record<MoodType, number>;
  averageScore: number;
  totalCheckins: number;
}

export interface MoodSummary {
  date: Date;
  totalCheckins: number;
  distribution: Record<MoodType, number>;
  averageScore: number;
}

export function useMoodTracker() {
  const { user } = useAuth();
  const workspace = useWorkspaceStore((state) => state.workspace);
  const currentWorkspace = workspace;
  const [analytics, setAnalytics] = useState<MoodAnalytics[]>([]);
  const [todaySummary, setTodaySummary] = useState<MoodSummary | null>(null);
  const [myHistory, setMyHistory] = useState<MoodCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  
  // Fetch analytics
  const fetchAnalytics = useCallback(async (workspaceId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/mood/analytics/${workspaceId}?limit=30`, {
        credentials: 'include',
      });
      const data = await res.json();
      
      if (data.success) {
        setAnalytics(data.data.map((a: any) => ({
          ...a,
          date: new Date(a.date),
        })));
      }
    } catch (error) {
      console.error('Failed to fetch mood analytics:', error);
    }
  }, []);
  
  // Fetch today's summary
  const fetchTodaySummary = useCallback(async (workspaceId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/mood/summary/${workspaceId}`, {
        credentials: 'include',
      });
      const data = await res.json();
      
      if (data.success) {
        setTodaySummary({
          ...data.data,
          date: new Date(data.data.date),
        });
      }
    } catch (error) {
      console.error('Failed to fetch mood summary:', error);
    }
  }, []);
  
  // Fetch personal history
  const fetchMyHistory = useCallback(async (workspaceId?: string) => {
    try {
      const url = workspaceId 
        ? `${API_BASE_URL}/mood/my-history?workspaceId=${workspaceId}&limit=30`
        : `${API_BASE_URL}/mood/my-history?limit=30`;
      
      const res = await fetch(url, {
        credentials: 'include',
      });
      const data = await res.json();
      
      if (data.success) {
        const history = data.data.map((h: any) => ({
          ...h,
          createdAt: new Date(h.createdAt),
        }));
        
        setMyHistory(history);
        
        // Check if checked in today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkedInToday = history.some((h: MoodCheckin) => {
          const checkinDate = new Date(h.createdAt);
          checkinDate.setHours(0, 0, 0, 0);
          return checkinDate.getTime() === today.getTime();
        });
        setHasCheckedInToday(checkedInToday);
      }
    } catch (error) {
      console.error('Failed to fetch mood history:', error);
    }
  }, []);
  
  // Initial fetch
  useEffect(() => {
    if (!currentWorkspace?.id) return;
    
    setLoading(true);
    
    Promise.all([
      fetchAnalytics(currentWorkspace.id),
      fetchTodaySummary(currentWorkspace.id),
      fetchMyHistory(currentWorkspace.id),
    ]).finally(() => setLoading(false));
  }, [currentWorkspace?.id, fetchAnalytics, fetchTodaySummary, fetchMyHistory]);
  
  // Submit mood check-in
  const submitMoodCheckin = useCallback(async (
    mood: MoodType,
    options?: {
      notes?: string;
      isAnonymous?: boolean;
    }
  ) => {
    if (!currentWorkspace?.id) {
      throw new Error('No workspace selected');
    }
    
    try {
      const res = await fetch(`${API_BASE_URL}/mood/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          workspaceId: currentWorkspace.id,
          mood,
          notes: options?.notes,
          isAnonymous: options?.isAnonymous || false,
        }),
      });
      
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to submit check-in');
      }
      
      toast.success('Mood check-in submitted!');
      
      // Refresh data
      await Promise.all([
        fetchTodaySummary(currentWorkspace.id),
        fetchMyHistory(currentWorkspace.id),
      ]);
      
      setHasCheckedInToday(true);
      
      return data.data;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit check-in');
      throw error;
    }
  }, [currentWorkspace?.id, fetchTodaySummary, fetchMyHistory]);
  
  return {
    analytics,
    todaySummary,
    myHistory,
    hasCheckedInToday,
    loading,
    submitMoodCheckin,
    refetch: () => {
      if (currentWorkspace?.id) {
        fetchAnalytics(currentWorkspace.id);
        fetchTodaySummary(currentWorkspace.id);
        fetchMyHistory(currentWorkspace.id);
      }
    },
  };
}

