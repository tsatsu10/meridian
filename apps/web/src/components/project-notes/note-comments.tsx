/**
 * Note Comments Component - Phase 5.2
 * Comments section for note discussions
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { MessageSquare, Send, Edit, Trash2, Clock } from 'lucide-react';
import { API_BASE_URL } from '@/constants/urls';
import { formatDistanceToNow } from 'date-fns';

interface NoteComment {
  id: string;
  noteId: string;
  userEmail: string;
  comment: string;
  isEdited: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

interface NoteCommentsProps {
  noteId: string;
  currentUserEmail?: string;
  onClose?: () => void;
}

export function NoteComments({ noteId, currentUserEmail, onClose }: NoteCommentsProps) {
  const [comments, setComments] = useState<NoteComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [noteId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/project-notes/notes/${noteId}/comments`, {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch comments');

      const data = await response.json();
      setComments(data.data || []);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/project-notes/notes/${noteId}/comments`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: newComment }),
      });

      if (!response.ok) throw new Error('Failed to add comment');

      toast.success('Comment added');
      setNewComment('');
      fetchComments();
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/project-notes/notes/${noteId}/comments/${commentId}`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comment: editContent }),
        }
      );

      if (!response.ok) throw new Error('Failed to update comment');

      toast.success('Comment updated');
      setEditingId(null);
      setEditContent('');
      fetchComments();
    } catch (error) {
      console.error('Failed to update comment:', error);
      toast.error('Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/project-notes/notes/${noteId}/comments/${commentId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      if (!response.ok) throw new Error('Failed to delete comment');

      toast.success('Comment deleted');
      fetchComments();
    } catch (error) {
      console.error('Failed to delete comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  const startEdit = (comment: NoteComment) => {
    setEditingId(comment.id);
    setEditContent(comment.comment);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const getUserInitials = (email: string) => {
    const name = email.split('@')[0];
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Comments ({comments.length})
              </CardTitle>
            </div>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4">
        {/* Add New Comment */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[100px] resize-none"
              />
              <div className="flex justify-end">
                <Button onClick={handleAddComment} disabled={submitting || !newComment.trim()}>
                  <Send className="w-4 h-4 mr-2" />
                  {submitting ? 'Posting...' : 'Post Comment'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comments List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Discussion</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading comments...</div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No comments yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Be the first to start a discussion!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-4 p-4 rounded-lg border">
                      {/* Avatar */}
                      <Avatar className="w-10 h-10">
                        <AvatarFallback>{getUserInitials(comment.userEmail)}</AvatarFallback>
                      </Avatar>

                      {/* Comment Content */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-sm">{comment.userEmail}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {formatDistanceToNow(new Date(comment.createdAt))} ago
                              {comment.isEdited && <span>• edited</span>}
                            </div>
                          </div>

                          {/* Actions (only for comment author) */}
                          {currentUserEmail === comment.userEmail && (
                            <div className="flex items-center gap-2">
                              {editingId !== comment.id && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => startEdit(comment)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteComment(comment.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Comment Text */}
                        {editingId === comment.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="min-h-[80px] resize-none"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleUpdateComment(comment.id)}>
                                Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={cancelEdit}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

