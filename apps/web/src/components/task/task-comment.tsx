// @epic-2.2-realtime: Real-time collaborative commenting
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";
import useCreateComment from "@/hooks/mutations/comment/use-create-comment";
import useUpdateComment from "@/hooks/mutations/comment/use-update-comment";
import useGetActivitiesByTaskId from "@/hooks/queries/activity/use-get-activities-by-task-id";
import { Route } from "@/routes/dashboard/workspace/$workspaceId/project/$projectId/task/$taskId";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LiveCommentThread } from "@/components/comments/live-comment-thread";
import type { LiveComment } from "@/types/realtime";

function TaskComment({
  initialComment = "",
  commentId = null,
  onSubmit,
}: {
  initialComment?: string;
  commentId?: string | null;
  onSubmit?: () => void;
}) {
  const { taskId } = Route.useParams();
  const { user } = useAuth();
  const { mutateAsync: createComment } = useCreateComment();
  const { mutateAsync: updateComment } = useUpdateComment();
  const { data: activities } = useGetActivitiesByTaskId(taskId);
  const queryClient = useQueryClient();

  // Convert activities to live comments format
  const comments: LiveComment[] = (activities || [])
    .filter(activity => activity.type === 'comment')
    .map(activity => ({
      id: activity.id || '',
      taskId: taskId,
      userEmail: activity.userEmail || '',
      userName: activity.userEmail || '', // TODO: Get actual user name
      content: activity.content || '',
      timestamp: activity.createdAt.toISOString(),
      isEditing: false,
      editHistory: [],
      reactions: [],
      mentions: [],
      isResolved: false
    }));

  const handleAddComment = async (content: string) => {
    if (!user?.email) {
      toast.error("You must be logged in to comment");
      return;
    }

    try {
      await createComment({
        taskId: taskId,
        content: content,
        userEmail: user.email,
      });

      await queryClient.invalidateQueries({
        queryKey: ["activities", taskId],
      });

      toast.success("Comment added successfully");
      onSubmit?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add comment",
      );
    }
  };

  const handleEditComment = async (commentId: string, content: string) => {
    if (!user?.email) {
      toast.error("You must be logged in to edit comments");
      return;
    }

    try {
      await updateComment({
        id: commentId,
        userEmail: user.email,
        content: content,
      });

      await queryClient.invalidateQueries({
        queryKey: ["activities", taskId],
      });

      toast.success("Comment updated successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update comment",
      );
    }
  };

  const handleResolveComment = async (commentId: string) => {
    // TODO: Implement comment resolution in backendtoast.success("Comment resolved");
  };

  return (
    <div className="space-y-4">
      <LiveCommentThread
        taskId={taskId}
        comments={comments}
        onAddComment={handleAddComment}
        onEditComment={handleEditComment}
        onResolveComment={handleResolveComment}
        className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200/50 dark:border-zinc-800/50 p-4"
      />
    </div>
  );
}

export default TaskComment;
