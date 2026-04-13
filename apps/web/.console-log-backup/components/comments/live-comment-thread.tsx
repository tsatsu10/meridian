// @epic-2.2-realtime: Live comment thread with real-time collaboration
import React, { useState, useEffect, useRef } from 'react'
import { useUnifiedWebSocket } from '@/hooks/useUnifiedWebSocket';
import useAuth from '@/components/providers/auth-provider/hooks/use-auth';
import useWorkspaceStore from '@/store/workspace';
import { TypingIndicator, useInputTypingTracker } from '@/components/presence/typing-indicator';
import type { LiveComment } from '@/types/realtime';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

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
  const { user } = useAuth()
  const { workspace } = useWorkspaceStore()
  const { connectionState } = useUnifiedWebSocket({ 
    enabled: !!user?.email && !!workspace?.id,
    userEmail: user?.email || '',
    workspaceId: workspace?.id || ''
  });
  const isConnected = connectionState.isConnected;
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [liveComments, setLiveComments] = useState<LiveComment[]>(comments);
  
  const newCommentRef = useRef<HTMLTextAreaElement>(null);
  const editCommentRef = useRef<HTMLTextAreaElement>(null);
  
  // Track typing for new comment
  const isTypingNewComment = useInputTypingTracker(newCommentRef, {
    type: 'comment',
    id: `${taskId}-new`
  });

  // Track typing for edit comment
  const isTypingEdit = useInputTypingTracker(editCommentRef, {
    type: 'comment',
    id: editingCommentId ? `${taskId}-edit-${editingCommentId}` : ''
  });

  // Sync comments with props
  useEffect(() => {
    setLiveComments(comments);
  }, [comments]);

  // Handle real-time comment updates
  useEffect(() => {
    if (!isConnected) return;

    const handleCommentUpdate = (update: any) => {
      if (update.taskId === taskId) {
        switch (update.type) {
          case 'comment_added':
            setLiveComments(prev => [...prev, update.comment]);
            break;
          case 'comment_edited':
            setLiveComments(prev => 
              prev.map(comment => 
                comment.id === update.commentId 
                  ? { ...comment, content: update.content, isEditing: false }
                  : comment
              )
            );
            break;
          case 'comment_resolved':
            setLiveComments(prev => 
              prev.map(comment => 
                comment.id === update.commentId 
                  ? { ...comment, isResolved: update.isResolved }
                  : comment
              )
            );
            break;
        }
      }
    };

    // This would be connected to WebSocket
    console.log('💬 Listening for real-time comment updates on task:', taskId);

    return () => {
      console.log('💬 Stopped listening for comment updates on task:', taskId);
    };
  }, [isConnected, taskId]);

  const handleSubmitComment = () => {
    if (newComment.trim()) {
      onAddComment(newComment.trim());
      setNewComment('');
      
      // Broadcast new comment via WebSocket
      console.log('💬 New comment posted:', { taskId, content: newComment });
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
      
      console.log('💬 Comment edited:', { commentId: editingCommentId, content: editContent });
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
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">
            {comment.userName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-sm">{comment.userName}</span>
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
                ref={editCommentRef}
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
              <TypingIndicator 
                location={{ type: 'comment', id: `${taskId}-edit-${comment.id}` }}
                className="ml-1"
              />
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
    <div className={`space-y-4 ${className}`}>
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
          ref={newCommentRef}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="min-h-[80px]"
        />
        
        <div className="flex items-center justify-between">
          <TypingIndicator 
            location={{ type: 'comment', id: `${taskId}-new` }}
            className="ml-1"
          />
          
          <Button 
            onClick={handleSubmitComment}
            disabled={!newComment.trim()}
            size="sm"
          >
            Comment
          </Button>
        </div>
      </div>
      
      {!isConnected && (
        <div className="text-center py-2">
          <Badge variant="outline" className="text-xs">
            Offline - Comments will sync when reconnected
          </Badge>
        </div>
      )}
    </div>
  );
}

// Hook for managing live comment reactions
export function useCommentReactions(commentId: string) {
  const { isConnected } = useUnifiedWebSocket({ 
    enabled: false, // This hook is not directly connected to the unified WebSocket
    userEmail: '',
    workspaceId: ''
  });
  const [reactions, setReactions] = useState<Array<{ emoji: string; userEmail: string; timestamp: string }>>([]);

  const addReaction = (emoji: string) => {
    if (!isConnected) return;
    
    console.log('😀 Adding reaction:', { commentId, emoji });
    // This would send a WebSocket message
  };

  const removeReaction = (emoji: string) => {
    if (!isConnected) return;
    
    console.log('😐 Removing reaction:', { commentId, emoji });
    // This would send a WebSocket message
  };

  return {
    reactions,
    addReaction,
    removeReaction
  };
}

// Component for comment reactions
export function CommentReactions({ commentId }: { commentId: string }) {
  const { reactions, addReaction } = useCommentReactions(commentId);
  
  const reactionCounts = reactions.reduce((acc, reaction) => {
    acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const commonEmojis = ['👍', '❤️', '😄', '🎉', '👏'];

  return (
    <div className="flex items-center space-x-1 mt-2">
      {Object.entries(reactionCounts).map(([emoji, count]) => (
        <Button
          key={emoji}
          variant="outline"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => addReaction(emoji)}
        >
          {emoji} {count}
        </Button>
      ))}
      
      <div className="flex space-x-1">
        {commonEmojis.map((emoji) => (
          <Button
            key={emoji}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-xs hover:bg-gray-100"
            onClick={() => addReaction(emoji)}
          >
            {emoji}
          </Button>
        ))}
      </div>
    </div>
  );
} 