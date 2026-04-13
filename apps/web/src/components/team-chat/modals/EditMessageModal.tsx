// Edit Message Modal - Dialog for editing messages

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Edit } from 'lucide-react';

interface EditMessageModalProps {
  open: boolean;
  initialContent: string;
  onSave: (newContent: string) => void;
  onCancel: () => void;
}

/**
 * EditMessageModal - Modal dialog for editing message content
 */
export function EditMessageModal({
  open,
  initialContent,
  onSave,
  onCancel,
}: EditMessageModalProps) {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);

  // Reset content when modal opens
  useEffect(() => {
    if (open) {
      setContent(initialContent);
    }
  }, [open, initialContent]);

  const handleSave = async () => {
    if (!content.trim() || content === initialContent) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(content);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const hasChanges = content !== initialContent;
  const isValid = content.trim().length > 0 && content.length <= 2000;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Message
          </DialogTitle>
          <DialogDescription>
            Make changes to your message. Press Ctrl+Enter to save.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter message content..."
            className="min-h-[120px] max-h-[300px]"
            autoFocus
            maxLength={2000}
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Ctrl+Enter to save, Esc to cancel</span>
            <span className={content.length > 2000 ? 'text-red-500' : ''}>
              {content.length}/2000
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || !isValid || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

