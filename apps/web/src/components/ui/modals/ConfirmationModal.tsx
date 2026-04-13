import React, { forwardRef } from 'react';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import { BaseModal, BaseModalProps } from './BaseModal';
import { cn } from '@/lib/utils';

export type ConfirmationType = 'info' | 'warning' | 'success' | 'danger';

export interface ConfirmationModalProps extends Omit<BaseModalProps, 'children'> {
  title: string;
  description?: string;
  type?: ConfirmationType;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
  confirmDisabled?: boolean;
  showIcon?: boolean;
  icon?: React.ReactNode;
  destructive?: boolean;
}

const typeConfig = {
  info: {
    icon: Info,
    iconColor: 'text-blue-500',
    buttonVariant: 'default' as const,
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-yellow-500',
    buttonVariant: 'default' as const,
  },
  success: {
    icon: CheckCircle,
    iconColor: 'text-green-500',
    buttonVariant: 'default' as const,
  },
  danger: {
    icon: XCircle,
    iconColor: 'text-red-500',
    buttonVariant: 'destructive' as const,
  },
};

export const ConfirmationModal = forwardRef<HTMLDivElement, ConfirmationModalProps>(
  (
    {
      title,
      description,
      type = 'info',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      onConfirm,
      onCancel,
      isLoading = false,
      confirmDisabled = false,
      showIcon = true,
      icon,
      destructive = false,
      onClose,
      ...props
    },
    ref
  ) => {
    const config = typeConfig[type];
    const IconComponent = icon || config.icon;
    const buttonVariant = destructive ? 'destructive' : config.buttonVariant;

    const handleConfirm = () => {
      if (onConfirm && !isLoading && !confirmDisabled) {
        onConfirm();
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
        size="sm"
        {...props}
      >
        <DialogHeader className="space-y-3">
          <div className="flex items-center space-x-3">
            {showIcon && (
              <div className={cn('flex-shrink-0', config.iconColor)}>
                <IconComponent className="h-5 w-5" />
              </div>
            )}
            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          </div>
          {description && (
            <DialogDescription className="text-sm text-muted-foreground">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <DialogFooter className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={buttonVariant}
            onClick={handleConfirm}
            disabled={isLoading || confirmDisabled}
          >
            {isLoading ? 'Loading...' : confirmText}
          </Button>
        </DialogFooter>
      </BaseModal>
    );
  }
);

ConfirmationModal.displayName = 'ConfirmationModal'; 