import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteAttachment, type DeleteAttachmentRequest } from '@/fetchers/attachment/delete-attachment';

// @epic-2.1-files: React Query mutation hook for deleting attachments
export function useDeleteAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAttachment,
    onSuccess: (data, variables) => {
      // Invalidate attachment queries to refresh the data
      queryClient.invalidateQueries({
        queryKey: ['attachments'],
      });
    },
  });
}

export default useDeleteAttachment; 