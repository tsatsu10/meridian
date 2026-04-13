import React, { forwardRef } from 'react';
import { Dialog, DialogContent, DialogOverlay } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface BaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  overlayClassName?: string;
  contentClassName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  centered?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  onClose?: () => void;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-[95vw] max-h-[95vh]'
};

export const BaseModal = forwardRef<HTMLDivElement, BaseModalProps>(
  (
    {
      open,
      onOpenChange,
      children,
      className,
      overlayClassName,
      contentClassName,
      size = 'md',
      centered = true,
      closeOnOverlayClick = true,
      closeOnEscape = true,
      showCloseButton = true,
      onClose,
      ...props
    },
    ref
  ) => {
    const handleOpenChange = (newOpen: boolean) => {
      if (!newOpen && onClose) {
        onClose();
      }
      onOpenChange(newOpen);
    };

    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogOverlay
          className={cn(
            'fixed inset-0 z-50 bg-black/85 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            overlayClassName
          )}
          onClick={closeOnOverlayClick ? () => handleOpenChange(false) : undefined}
        />
        <DialogContent
          ref={ref}
          className={cn(
            'fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg',
            sizeClasses[size],
            centered && 'items-center justify-center',
            contentClassName,
            className
          )}
          onKeyDown={(e) => {
            if (closeOnEscape && e.key === 'Escape') {
              handleOpenChange(false);
            }
          }}
          {...props}
        >
          {children}
        </DialogContent>
      </Dialog>
    );
  }
);

BaseModal.displayName = 'BaseModal'; 