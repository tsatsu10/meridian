import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface DeleteMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
  messagePreview?: string;
}

export default function DeleteMessageModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting = false,
  messagePreview
}: DeleteMessageModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Delete Message
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this message? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        {messagePreview && (
          <div className="p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-500 line-clamp-3">
              {messagePreview}
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Message"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}