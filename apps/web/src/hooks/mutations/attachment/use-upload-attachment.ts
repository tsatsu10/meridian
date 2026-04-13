import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadAttachment, type UploadAttachmentRequest } from '@/fetchers/attachment/upload-attachment';

// @epic-2.1-files: React Query mutation hook for uploading attachments
export function useUploadAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadAttachment,
    onSuccess: (data, variables) => {
      // Invalidate and refetch attachments for the task or comment
      if (variables.taskId) {
        queryClient.invalidateQueries({
          queryKey: ['attachments', 'task', variables.taskId],
        });
      }
      if (variables.commentId) {
        queryClient.invalidateQueries({
          queryKey: ['attachments', 'comment', variables.commentId],
        });
      }
    },
  });
}

export default useUploadAttachment; 