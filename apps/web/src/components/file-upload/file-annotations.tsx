import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import { API_BASE_URL } from '@/constants/urls';

interface FileAnnotation {
  id: string;
  attachmentId: string;
  content: string;
  type: 'comment' | 'annotation' | 'review';
  position?: string;
  isResolved: boolean;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  userEmail: string;
  userName?: string;
}

interface FileAnnotationsProps {
  attachmentId: string;
  className?: string;
}

// @epic-2.1-files: File annotations component for commenting on files
export function FileAnnotations({ attachmentId, className }: FileAnnotationsProps) {
  const [annotations, setAnnotations] = useState<FileAnnotation[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load annotations
  useEffect(() => {
    loadAnnotations();
  }, [attachmentId]);

  const loadAnnotations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/attachment/${attachmentId}/annotations`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setAnnotations(data);
      } else {
        console.error('🔍 Failed to load annotations:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Failed to load annotations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/attachment/${attachmentId}/annotations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: newComment,
          type: 'comment',
        }),
      });
      
      if (response.ok) {
        const annotation = await response.json();
        setAnnotations(prev => [...prev, annotation]);
        setNewComment('');
      } else {
        const errorText = await response.text();
        console.error('🔍 Response error:', errorText);
      }
    } catch (error) {
      console.error('🔍 Failed to create annotation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveAnnotation = async (annotationId: string, isResolved: boolean) => {
    try {
      const response = await fetch(`${API_BASE_URL}/attachment/${attachmentId}/annotations/${annotationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          isResolved: !isResolved,
        }),
      });

      if (response.ok) {
        const updatedAnnotation = await response.json();
        setAnnotations(prev => 
          prev.map(ann => 
            ann.id === annotationId 
              ? { ...ann, isResolved: updatedAnnotation.isResolved }
              : ann
          )
        );
      } else {
        console.error('🔍 Failed to resolve annotation:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Failed to update annotation:', error);
    }
  };

  const handleDeleteAnnotation = async (annotationId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/attachment/${attachmentId}/annotations/${annotationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setAnnotations(prev => prev.filter(ann => ann.id !== annotationId));
      } else {
        console.error('🔍 Failed to delete annotation:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Failed to delete annotation:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'comment': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'annotation': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'review': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className={cn("p-4", className)}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Comments & Annotations
        </h3>
        <Badge variant="secondary">
          {annotations.length} {annotations.length === 1 ? 'comment' : 'comments'}
        </Badge>
      </div>

      {/* New Comment Form */}
      <div className="space-y-3">
        <textarea
          placeholder="Add a comment or annotation..."
          value={newComment}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewComment(e.target.value)}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <div className="flex justify-end">
          <Button 
            onClick={handleSubmitComment}
            disabled={!newComment.trim() || isSubmitting}
            size="sm"
          >
            {isSubmitting ? 'Adding...' : 'Add Comment'}
          </Button>
        </div>
      </div>

      {/* Annotations List */}
      <div className="space-y-3">
        {annotations.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <div className="w-12 h-12 mx-auto mb-3 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
              💬
            </div>
            <p>No comments yet. Be the first to add one!</p>
          </div>
        ) : (
          annotations.map((annotation) => (
            <div
              key={annotation.id}
              className={cn(
                "p-4 rounded-lg border border-gray-200 dark:border-gray-700",
                annotation.isResolved 
                  ? "bg-gray-50 dark:bg-gray-800/50 opacity-75" 
                  : "bg-white dark:bg-gray-800"
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                    {annotation.userName || annotation.userEmail.split('@')[0]}
                  </span>
                  <Badge className={getTypeColor(annotation.type)} variant="secondary">
                    {annotation.type}
                  </Badge>
                  {annotation.isResolved && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      ✓ Resolved
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(annotation.createdAt)}
                </span>
              </div>
              
              <p className="text-gray-700 dark:text-gray-300 mb-3 whitespace-pre-wrap">
                {annotation.content}
              </p>
              
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResolveAnnotation(annotation.id, annotation.isResolved)}
                  className="text-xs"
                >
                  {annotation.isResolved ? 'Unresolve' : 'Resolve'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeleteAnnotation(annotation.id)}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 