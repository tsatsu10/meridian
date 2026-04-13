import { useQuery } from '@tanstack/react-query';
import { getTaskAttachments } from '@/fetchers/attachment/get-attachments';

// @epic-2.1-files: React Query hook for task attachments
export function useGetTaskAttachments(taskId: string) {
  return useQuery({
    queryKey: ['attachments', 'task', taskId],
    queryFn: async () => {try {
        const result = await getTaskAttachments(taskId);// Ensure we always return an array
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.error('🔍 useGetTaskAttachments error:', { taskId, error, timestamp: new Date().toISOString() });
        // Return empty array on error
        return [];
      }
    },
    enabled: !!taskId,
    // Provide a default value
    initialData: [],
    // Retry failed requests
    retry: 2,
  });
}

export default useGetTaskAttachments; 