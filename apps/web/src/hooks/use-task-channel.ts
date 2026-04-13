import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL, API_URL } from '@/constants/urls';

export function useTaskChannel(taskId: string) {
  return useQuery(['taskChannel', taskId], async () => {
    const res = await fetch(`${API_BASE_URL}/tasks/${taskId}/channel`);
    if (!res.ok) throw new Error('Failed to fetch task channel');
    return res.json();
  });
} 