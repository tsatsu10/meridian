import React, { forwardRef } from 'react';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BaseModal, BaseModalProps } from './BaseModal';
import { cn } from '@/lib/utils';

export interface FormModalProps extends Omit<BaseModalProps, 'children'> {
  title: string;
  description?: string;
  children: React.ReactNode;
  onSubmit?: () => void;
  onCancel?: () => void;
  submitText?: string;
  cancelText?: string;
  isLoading?: boolean;
  submitDisabled?: boolean;
  showFooter?: boolean;
  footerClassName?: string;
  headerClassName?: string;
}

export const FormModal = forwardRef<HTMLDivElement, FormModalProps>(
  (
    {
      title,
      description,
      children,
      onSubmit,
      onCancel,
      submitText = 'Submit',
      cancelText = 'Cancel',
      isLoading = false,
      submitDisabled = false,
      showFooter = true,
      footerClassName,
      headerClassName,
      onClose,
      ...props
    },
    ref
  ) => {
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (onSubmit && !isLoading && !submitDisabled) {
        onSubmit();
      }
    };

    const handleCancel = () => {
      if (onCancel) {
        onCancel();
      } else if (onClose) {
        onClose();
      }
    };

    return (
      <BaseModal
        ref={ref}
        onClose={onClose}
        {...props}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader className={cn('space-y-2', headerClassName)}>
            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
            {description && (
              <DialogDescription className="text-sm text-muted-foreground">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4">
            {children}
          </div>

          {showFooter && (
            <DialogFooter className={cn('flex justify-end space-x-2 pt-4', footerClassName)}>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                {cancelText}
              </Button>
              <Button
                type="submit"
                onClick={onSubmit}
                disabled={isLoading || submitDisabled}
              >
                {isLoading ? 'Loading...' : submitText}
              </Button>
            </DialogFooter>
          )}
        </form>
      </BaseModal>
    );
  }
);

FormModal.displayName = 'FormModal'; 