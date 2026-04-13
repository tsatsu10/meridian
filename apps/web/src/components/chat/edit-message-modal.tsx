import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AlertTriangle, Edit, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useEditMessage } from '@/hooks/use-messages';

interface EditMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: {
    id: string;
    content: string;
    userEmail: string;
    userName?: string;
    createdAt: Date;
    isEdited: boolean;
    editedAt?: Date;
  } | null;
}

export default function EditMessageModal({
  isOpen,
  onClose,
  message
}: EditMessageModalProps) {
  const [editedContent, setEditedContent] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const editMessageMutation = useEditMessage();

  // Update content when message changes
  useEffect(() => {
    if (message) {
      setEditedContent(message.content);
      setHasChanges(false);
    }
  }, [message]);

  // Track changes
  useEffect(() => {
    setHasChanges(message ? editedContent !== message.content : false);
  }, [editedContent, message]);

  const handleSave = async () => {
    if (!message || !hasChanges || !editedContent.trim()) return;

    try {
      await editMessageMutation.mutateAsync({
        messageId: message.id,
        content: editedContent.trim()
      });
      onClose();
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  };

  const handleCancel = () => {
    if (message) {
      setEditedContent(message.content);
    }
    setHasChanges(false);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && hasChanges) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (!message) return null;

  const timeAgo = formatDistanceToNow(new Date(message.createdAt), { addSuffix: true });
  const lastEditedTime = message.editedAt 
    ? formatDistanceToNow(new Date(message.editedAt), { addSuffix: true })
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Message
          </DialogTitle>
          <DialogDescription>
            Modify your message content. Changes will be visible to all participants.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Message Author Info */}
          <div className="flex items-center space-x-3 pb-3 border-b">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="text-xs">
                {message.userName?.charAt(0) || message.userEmail.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-sm">
                  {message.userName || message.userEmail.split('@')[0]}
                </span>
                <span className="text-xs text-gray-500">
                  {timeAgo}
                </span>
                {message.isEdited && (
                  <Badge variant="outline" className="text-xs">
                    edited {lastEditedTime}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Edit Warning */}
          <div className="flex items-start space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Editing this message</p>
              <p className="text-amber-700">
                Changes will be visible to all channel members. You have 24 hours to edit this message.
              </p>
            </div>
          </div>

          {/* Content Editor */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Message Content</label>
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="min-h-[120px] resize-none"
              maxLength={4000}
              disabled={editMessageMutation.isPending}
              autoFocus
            />
            <div className="flex justify-between items-center text-xs text-gray-500">
              <div className="flex items-center space-x-4">
                <span>
                  {editedContent.length}/4000 characters
                </span>
                {hasChanges && (
                  <span className="text-amber-600">• Unsaved changes</span>
                )}
              </div>
              <div className="text-right">
                <p>Ctrl+Enter to save, Esc to cancel</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="space-x-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={editMessageMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || !editedContent.trim() || editMessageMutation.isPending}
            className="min-w-[100px]"
          >
            {editMessageMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}