// Delete Message Modal - Confirmation dialog for deleting messages

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface DeleteMessageModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  messagePreview?: string;
}

/**
 * DeleteMessageModal - Confirmation dialog before deleting a message
 */
export function DeleteMessageModal({
  open,
  onConfirm,
  onCancel,
  messagePreview,
}: DeleteMessageModalProps) {
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Delete Message?
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. The message will be permanently deleted.
          </DialogDescription>
        </DialogHeader>

        {messagePreview && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground italic line-clamp-3">
              "{messagePreview}"
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
          >
            Delete Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

