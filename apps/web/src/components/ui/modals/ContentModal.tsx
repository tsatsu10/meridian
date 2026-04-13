import React, { forwardRef } from 'react';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BaseModal, BaseModalProps } from './BaseModal';
import { cn } from '@/lib/utils';

export interface ContentModalProps extends Omit<BaseModalProps, 'children'> {
  title: string;
  description?: string;
  children: React.ReactNode;
  closeText?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
  scrollable?: boolean;
  maxHeight?: string;
  headerClassName?: string;
  contentClassName?: string;
  footerClassName?: string;
}

export const ContentModal = forwardRef<HTMLDivElement, ContentModalProps>(
  (
    {
      title,
      description,
      children,
      closeText = 'Close',
      onClose,
      showCloseButton = true,
      scrollable = false,
      maxHeight = 'max-h-[80vh]',
      headerClassName,
      contentClassName,
      footerClassName,
      ...props
    },
    ref
  ) => {
    const handleClose = () => {
      if (onClose) {
        onClose();
      }
    };

    const content = scrollable ? (
      <ScrollArea className={cn('max-h-[60vh]', maxHeight)}>
        <div className="pr-4">
          {children}
        </div>
      </ScrollArea>
    ) : (
      children
    );

    return (
      <BaseModal
        ref={ref}
        onClose={onClose}
        {...props}
      >
        <DialogHeader className={cn('space-y-2', headerClassName)}>
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-sm text-muted-foreground">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className={cn('space-y-4', contentClassName)}>
          {content}
        </div>

        {showCloseButton && (
          <DialogFooter className={cn('flex justify-end pt-4', footerClassName)}>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              {closeText}
            </Button>
          </DialogFooter>
        )}
      </BaseModal>
    );
  }
);

ContentModal.displayName = 'ContentModal'; 