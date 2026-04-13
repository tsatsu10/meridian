import { useMutation, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL, API_URL } from '@/constants/urls';

export function useCreateCall() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (call: any) => {
      const res = await fetch(`${API_BASE_URL}/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(call),
      });
      if (!res.ok) throw new Error('Failed to create call');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['calls']);
    },
  });
} 