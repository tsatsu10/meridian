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
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  FileText,
  Upload,
  Edit3,
  LogOut,
  Shield,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/cn';

interface UnsavedDataSummary {
  drafts: number;
  uploads: number;
  forms: number;
}

interface SignOutConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  unsavedData?: UnsavedDataSummary;
  reason?: 'user_initiated' | 'session_expired' | 'security' | 'admin_logout';
  className?: string;
}

const reasonConfig = {
  user_initiated: {
    title: 'Sign Out',
    description: 'Are you sure you want to sign out?',
    icon: LogOut,
    iconColor: 'text-blue-600',
    confirmText: 'Sign Out',
    confirmVariant: 'default' as const
  },
  session_expired: {
    title: 'Session Expired',
    description: 'Your session has expired. You will be signed out automatically.',
    icon: Clock,
    iconColor: 'text-amber-600',
    confirmText: 'Continue',
    confirmVariant: 'default' as const
  },
  security: {
    title: 'Security Sign Out',
    description: 'For security reasons, you need to sign out immediately.',
    icon: Shield,
    iconColor: 'text-red-600',
    confirmText: 'Sign Out Now',
    confirmVariant: 'destructive' as const
  },
  admin_logout: {
    title: 'Administrator Sign Out',
    description: 'An administrator has signed you out of this session.',
    icon: Shield,
    iconColor: 'text-purple-600',
    confirmText: 'Continue',
    confirmVariant: 'default' as const
  }
};

export default function SignOutConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  isLoading = false,
  unsavedData = { drafts: 0, uploads: 0, forms: 0 },
  reason = 'user_initiated',
  className
}: SignOutConfirmationDialogProps) {
  const config = reasonConfig[reason];
  const IconComponent = config.icon;
  
  const hasUnsavedData = unsavedData.drafts > 0 || unsavedData.uploads > 0 || unsavedData.forms > 0;
  const isForced = reason === 'session_expired' || reason === 'security' || reason === 'admin_logout';

  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    if (isForced) {
      // For forced sign outs, we can't really cancel
      onConfirm();
    } else {
      onCancel();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-[425px]", className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconComponent className={cn("h-5 w-5", config.iconColor)} />
            {config.title}
          </DialogTitle>
          <DialogDescription>
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Unsaved Data Warning */}
          {hasUnsavedData && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <h4 className="font-medium text-amber-800 dark:text-amber-200">
                    You have unsaved changes
                  </h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    The following data will be lost if you continue:
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    {unsavedData.drafts > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <FileText className="h-3 w-3 mr-1" />
                        {unsavedData.drafts} draft{unsavedData.drafts > 1 ? 's' : ''}
                      </Badge>
                    )}
                    
                    {unsavedData.uploads > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <Upload className="h-3 w-3 mr-1" />
                        {unsavedData.uploads} upload{unsavedData.uploads > 1 ? 's' : ''}
                      </Badge>
                    )}
                    
                    {unsavedData.forms > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <Edit3 className="h-3 w-3 mr-1" />
                        {unsavedData.forms} form{unsavedData.forms > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Additional context for forced sign outs */}
          {reason === 'session_expired' && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Your session has expired for security reasons. You'll need to sign in again to continue.
              </p>
            </div>
          )}

          {reason === 'security' && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-sm text-red-700 dark:text-red-300">
                A security event has been detected. You are being signed out as a precautionary measure.
              </p>
            </div>
          )}

          {reason === 'admin_logout' && (
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 dark:border-purple-800 dark:bg-purple-900/20">
              <p className="text-sm text-purple-700 dark:text-purple-300">
                A system administrator has ended your session. Please contact support if you have questions.
              </p>
            </div>
          )}

          {/* What happens next */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
            <h4 className="font-medium text-sm mb-2">What happens when you sign out:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• All active sessions will be terminated</li>
              <li>• You'll be redirected to the login page</li>
              <li>• Any unsaved data will be lost</li>
              {hasUnsavedData && <li>• Important drafts may be temporarily preserved</li>}
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {!isForced && (
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
          
          <Button
            variant={config.confirmVariant}
            onClick={handleConfirm}
            disabled={isLoading}
            className="min-w-[100px]"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                Signing out...
              </div>
            ) : (
              config.confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook to manage the confirmation dialog
export function useSignOutConfirmation() {
  const [dialogState, setDialogState] = React.useState<{
    open: boolean;
    reason: 'user_initiated' | 'session_expired' | 'security' | 'admin_logout';
    onConfirm?: () => void;
    unsavedData?: UnsavedDataSummary;
  }>({
    open: false,
    reason: 'user_initiated'
  });

  const showConfirmation = (options: {
    reason?: 'user_initiated' | 'session_expired' | 'security' | 'admin_logout';
    onConfirm: () => void;
    unsavedData?: UnsavedDataSummary;
  }) => {
    setDialogState({
      open: true,
      reason: options.reason || 'user_initiated',
      onConfirm: options.onConfirm,
      unsavedData: options.unsavedData
    });
  };

  const hideConfirmation = () => {
    setDialogState(prev => ({ ...prev, open: false }));
  };

  const handleConfirm = () => {
    dialogState.onConfirm?.();
    hideConfirmation();
  };

  const handleCancel = () => {
    hideConfirmation();
  };

  return {
    dialogState,
    showConfirmation,
    hideConfirmation,
    handleConfirm,
    handleCancel,
    
    // Component props
    dialogProps: {
      open: dialogState.open,
      onOpenChange: (open: boolean) => !open && hideConfirmation(),
      onConfirm: handleConfirm,
      onCancel: handleCancel,
      reason: dialogState.reason,
      unsavedData: dialogState.unsavedData
    }
  };
}