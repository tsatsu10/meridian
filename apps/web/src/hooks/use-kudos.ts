import { useState, useEffect, useCallback } from 'react';
import { useUnifiedWebSocketSingleton } from './useUnifiedWebSocketSingleton';
import { useWorkspaceStore } from '@/store/workspace';
import { useAuth } from './auth';
import { API_BASE_URL } from '@/constants/urls';
import { toast } from 'sonner';

export type KudosCategory = 'helpful' | 'great_work' | 'team_player' | 'creative' | 'leadership';

export interface Kudos {
  id: string;
  fromUserEmail: string;
  fromUserName?: string;
  fromUserAvatar?: string;
  toUserEmail: string;
  toUserName?: string;
  toUserAvatar?: string;
  message: string;
  emoji: string;
  category: KudosCategory;
  isPublic: boolean;
  createdAt: Date;
}

export function useKudos(userEmail?: string) {
  const { user } = useAuth();
  const workspace = useWorkspaceStore((state) => state.workspace);
  const currentWorkspace = workspace;
  const [kudosFeed, setKudosFeed] = useState<Kudos[]>([]);
  const [userKudos, setUserKudos] = useState<Kudos[]>([]);
  const [loading, setLoading] = useState(true);
  
  const socket = useUnifiedWebSocketSingleton({
    userEmail: user?.email || '',
    workspaceId: currentWorkspace?.id || '',
    enabled: !!user && !!currentWorkspace,
    onMessage: (message) => {
      if (message.type === 'kudos:received') {
        // Add to feed if public
        setKudosFeed(prev => [{
          id: message.data.id,
          fromUserEmail: message.data.fromUserEmail,
          fromUserName: message.data.fromUserName,
          fromUserAvatar: message.data.fromUserAvatar,
          toUserEmail: message.data.toUserEmail,
          toUserName: message.data.toUserName,
          toUserAvatar: message.data.toUserAvatar,
          message: message.data.message,
          emoji: message.data.emoji,
          category: message.data.category,
          isPublic: true,
          createdAt: new Date(),
        }, ...prev]);
        
        // Show toast notification
        toast.success(`${message.data.fromUserName} gave kudos to ${message.data.toUserName}!`, {
          description: `${message.data.emoji} ${message.data.message}`,
        });
      } else if (message.type === 'kudos:notification') {
        // Personal notification - received kudos
        toast.success(`You received kudos from ${message.data.fromUserName}!`, {
          description: `${message.data.emoji} ${message.data.message}`,
          duration: 5000,
        });
        
        // Refetch user kudos
        if (userEmail && userEmail === user?.email) {
          fetchUserKudos(userEmail);
        }
      }
    }
  });
  
  // Fetch workspace kudos feed
  const fetchKudosFeed = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/kudos/workspace/${currentWorkspace.id}`, {
        credentials: 'include',
      });
      
      // Check if response is ok
      if (!res.ok) {
        console.error(`Failed to fetch kudos feed: ${res.status} ${res.statusText}`);
        return;
      }
      
      // Check if response has content
      const text = await res.text();
      if (!text) {
        console.warn('Kudos feed returned empty response');
        setKudosFeed([]);
        return;
      }
      
      const data = JSON.parse(text);
      
      if (data.success && Array.isArray(data.data)) {
        setKudosFeed(data.data.map((k: any) => ({
          ...k,
          createdAt: new Date(k.createdAt),
        })));
      } else {
        setKudosFeed([]);
      }
    } catch (error) {
      console.error('Failed to fetch kudos feed:', error);
      setKudosFeed([]);
    }
  }, [currentWorkspace?.id]);
  
  // Fetch user kudos
  const fetchUserKudos = useCallback(async (email: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/kudos/${email}`, {
        credentials: 'include',
      });
      
      // Check if response is ok
      if (!res.ok) {
        console.error(`Failed to fetch user kudos: ${res.status} ${res.statusText}`);
        return;
      }
      
      // Check if response has content
      const text = await res.text();
      if (!text) {
        console.warn('User kudos returned empty response');
        setUserKudos([]);
        return;
      }
      
      const data = JSON.parse(text);
      
      if (data.success && Array.isArray(data.data)) {
        setUserKudos(data.data.map((k: any) => ({
          ...k,
          createdAt: new Date(k.createdAt),
        })));
      } else {
        setUserKudos([]);
      }
    } catch (error) {
      console.error('Failed to fetch user kudos:', error);
      setUserKudos([]);
    }
  }, []);
  
  // Initial fetch
  useEffect(() => {
    setLoading(true);
    
    const promises: Promise<void>[] = [fetchKudosFeed()];
    
    if (userEmail) {
      promises.push(fetchUserKudos(userEmail));
    }
    
    Promise.all(promises).finally(() => setLoading(false));
  }, [userEmail, fetchKudosFeed, fetchUserKudos]);
  
  const giveKudos = useCallback(async (
    toUserEmail: string,
    message: string,
    options?: {
      emoji?: string;
      category?: KudosCategory;
      isPublic?: boolean;
    }
  ) => {
    if (!currentWorkspace?.id) {
      throw new Error('No workspace selected');
    }
    
    try {
      const res = await fetch(`${API_BASE_URL}/kudos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          toUserEmail,
          workspaceId: currentWorkspace.id,
          message,
          emoji: options?.emoji || '🎉',
          category: options?.category || 'great_work',
          isPublic: options?.isPublic !== false,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to give kudos');
      }
      
      // Refresh feed after giving kudos
      await fetchKudosFeed();
      
      // If viewing user kudos, refresh that too
      if (userEmail) {
        await fetchUserKudos(userEmail);
      }
      
      return data.data;
    } catch (error) {
      console.error('Failed to give kudos:', error);
      throw error;
    }
  }, [currentWorkspace?.id, fetchKudosFeed, fetchUserKudos, userEmail]);
  
  return {
    kudosFeed,
    userKudos,
    loading,
    giveKudos,
    refetch: fetchKudosFeed,
    refetchUserKudos: fetchUserKudos,
  };
}

