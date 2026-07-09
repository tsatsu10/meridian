// Task comment thread: list, add, edit, and resolve comments.
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ClickableUserProfile } from '@/components/user/clickable-user-profile';

export interface LiveComment {
  id: string;
  taskId: string;
  userId?: string;
  userEmail: string;
  userName: string;
  content: string;
  timestamp: string;
  isEditing?: boolean;
  editHistory?: Array<{
    content: string;
    timestamp: string;
    userEmail: string;
  }>;
  mentions?: string[];
  isResolved?: boolean;
  parentCommentId?: string;
}

interface LiveCommentThreadProps {
  taskId: string;
  comments: LiveComment[];
  onAddComment: (content: string) => void;
  onEditComment: (commentId: string, content: string) => void;
  onResolveComment: (commentId: string) => void;
  className?: string;
}

export function LiveCommentThread({
  taskId,
  comments,
  onAddComment,
  onEditComment,
  onResolveComment,
  className = ''
}: LiveCommentThreadProps) {
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [liveComments, setLiveComments] = useState<LiveComment[]>(comments);

  // Sync comments with props
  useEffect(() => {
    setLiveComments(comments);
  }, [comments]);

  const handleSubmitComment = () => {
    if (newComment.trim()) {
      onAddComment(newComment.trim());
      setNewComment('');
    }
  };

  const handleStartEdit = (comment: LiveComment) => {
    setEditingCommentId(comment.id);
    setEditContent(comment.content);

    // Mark comment as being edited
    setLiveComments(prev =>
      prev.map(c =>
        c.id === comment.id
          ? { ...c, isEditing: true }
          : c
      )
    );
  };

  const handleSaveEdit = () => {
    if (editingCommentId && editContent.trim()) {
      onEditComment(editingCommentId, editContent.trim());
      setEditingCommentId(null);
      setEditContent('');
    }
  };

  const handleCancelEdit = () => {
    if (editingCommentId) {
      // Remove editing state
      setLiveComments(prev =>
        prev.map(c =>
          c.id === editingCommentId
            ? { ...c, isEditing: false }
            : c
        )
      );
    }

    setEditingCommentId(null);
    setEditContent('');
  };

  const renderComment = (comment: LiveComment) => {
    const isEditing = editingCommentId === comment.id;

    return (
      <div key={comment.id} className="flex space-x-3 p-3 border rounded-lg">
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ClickableUserProfile
                userId={comment.userId}
                userEmail={comment.userEmail}
                userName={comment.userName}
                size="sm"
                openMode="both"
              />
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true })}
              </span>
              {comment.isEditing && (
                <Badge variant="outline" className="text-xs">
                  Editing...
                </Badge>
              )}
              {comment.isResolved && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                  Resolved
                </Badge>
              )}
            </div>

            <div className="flex items-center space-x-1">
              {!isEditing && !comment.isResolved && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStartEdit(comment)}
                    className="text-xs"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onResolveComment(comment.id)}
                    className="text-xs"
                  >
                    Resolve
                  </Button>
                </>
              )}
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[60px]"
                placeholder="Edit your comment..."
              />
              <div className="flex items-center space-x-2">
                <Button size="sm" onClick={handleSaveEdit}>
                  Save
                </Button>
                <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {comment.content}
            </p>
          )}

          {comment.editHistory && comment.editHistory.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Edited {comment.editHistory.length} time{comment.editHistory.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-4 ${className}`} data-task-comments={taskId}>
      <div className="space-y-3">
        {liveComments.map(renderComment)}
      </div>

      {liveComments.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No comments yet. Start the conversation!</p>
        </div>
      )}

      <div className="space-y-2 border-t pt-4">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="min-h-[80px]"
        />

        <div className="flex items-center justify-end">
          <Button
            onClick={handleSubmitComment}
            disabled={!newComment.trim()}
            size="sm"
          >
            Comment
          </Button>
        </div>
      </div>
    </div>
  );
}
