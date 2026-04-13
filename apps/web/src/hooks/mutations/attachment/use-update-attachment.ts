import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateAttachment, type UpdateAttachmentRequest } from '@/fetchers/attachment/update-attachment';

// @epic-2.1-files: React Query mutation hook for updating attachments
export function useUpdateAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAttachment,
    onSuccess: (data, variables) => {
      // Invalidate attachment queries to refresh the data
      queryClient.invalidateQueries({
        queryKey: ['attachments'],
      });
    },
  });
}

export default useUpdateAttachment; 