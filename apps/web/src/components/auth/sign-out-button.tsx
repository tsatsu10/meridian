import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  LogOut, 
  Shield, 
  AlertTriangle,
  ChevronDown,
  Settings,
  User
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useSignOut } from '@/hooks/use-sign-out';
import SignOutConfirmationDialog, { useSignOutConfirmation } from '@/components/ui/sign-out-confirmation-dialog';
import { toast } from '@/lib/toast';

interface SignOutButtonProps {
  variant?: 'default' | 'ghost' | 'outline' | 'secondary' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showIcon?: boolean;
  showText?: boolean;
  showDropdown?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export default function SignOutButton({
  variant = 'ghost',
  size = 'default',
  showIcon = true,
  showText = true,
  showDropdown = false,
  className,
  children
}: SignOutButtonProps) {
  const { 
    handleSignOut, 
    handleQuickSignOut, 
    handleSecuritySignOut, 
    isSigningOut,
    hasUnsavedData,
    getUnsavedDataSummary 
  } = useSignOut({
    onSuccess: () => {
      toast.success('Signed out successfully');
    },
    onError: (error) => {
      toast.error(`Sign out failed: ${error.message}`);
    }
  });

  const {
    showConfirmation,
    dialogProps
  } = useSignOutConfirmation();

  const handleNormalSignOut = () => {
    if (hasUnsavedData()) {
      // Show confirmation dialog with unsaved data summary
      showConfirmation({
        reason: 'user_initiated',
        onConfirm: () => handleSignOut({ skipConfirmation: true }),
        unsavedData: getUnsavedDataSummary()
      });
    } else {
      // No unsaved data, sign out directly
      handleSignOut({ skipConfirmation: true });
    }
  };

  const handleForceSignOut = () => {
    showConfirmation({
      reason: 'security',
      onConfirm: () => handleSecuritySignOut(),
      unsavedData: getUnsavedDataSummary()
    });
  };

  const handleQuickSignOutClick = () => {
    if (hasUnsavedData()) {
      toast.warning('You have unsaved changes. Use normal sign out to review them.');
      return;
    }
    handleQuickSignOut();
  };

  // Simple button without dropdown
  if (!showDropdown) {
    return (
      <>
        <Button
          variant={variant}
          size={size}
          onClick={handleNormalSignOut}
          disabled={isSigningOut}
          className={cn("gap-2", className)}
        >
          {isSigningOut ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
          ) : (
            showIcon && <LogOut className="h-4 w-4" />
          )}
          {showText && (isSigningOut ? 'Signing out...' : (children || 'Sign Out'))}
        </Button>

        <SignOutConfirmationDialog 
          {...dialogProps} 
          isLoading={isSigningOut}
        />
      </>
    );
  }

  // Dropdown button with multiple options
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            disabled={isSigningOut}
            className={cn("gap-2", className)}
          >
            {isSigningOut ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
            ) : (
              showIcon && <LogOut className="h-4 w-4" />
            )}
            {showText && (isSigningOut ? 'Signing out...' : (children || 'Sign Out'))}
            {!isSigningOut && <ChevronDown className="h-3 w-3 ml-1" />}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem 
            onClick={handleNormalSignOut}
            disabled={isSigningOut}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
            {hasUnsavedData() && (
              <AlertTriangle className="h-3 w-3 text-amber-500 ml-auto" />
            )}
          </DropdownMenuItem>

          <DropdownMenuItem 
            onClick={handleQuickSignOutClick}
            disabled={isSigningOut || hasUnsavedData()}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Quick Sign Out
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem 
            onClick={handleForceSignOut}
            disabled={isSigningOut}
            className="gap-2 text-red-600 focus:text-red-600"
          >
            <Shield className="h-4 w-4" />
            Security Sign Out
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            {hasUnsavedData() ? (
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                Unsaved changes detected
              </div>
            ) : (
              'All changes saved'
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <SignOutConfirmationDialog 
        {...dialogProps} 
        isLoading={isSigningOut}
      />
    </>
  );
}

// Specialized sign out buttons for different contexts
export function UserMenuSignOutButton() {
  return (
    <SignOutButton
      variant="ghost"
      size="sm"
      showDropdown={true}
      className="w-full justify-start"
    />
  );
}

export function HeaderSignOutButton() {
  return (
    <SignOutButton
      variant="outline"
      size="sm"
      showIcon={true}
      showText={false}
      className="h-8 w-8 p-0"
    />
  );
}

export function SecuritySignOutButton() {
  const { handleSecuritySignOut, isSigningOut } = useSignOut();
  
  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleSecuritySignOut}
      disabled={isSigningOut}
      className="gap-2"
    >
      {isSigningOut ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
      ) : (
        <Shield className="h-4 w-4" />
      )}
      {isSigningOut ? 'Signing out...' : 'Sign Out Now'}
    </Button>
  );
}

export function MobileSignOutButton() {
  return (
    <SignOutButton
      variant="ghost"
      size="lg"
      showIcon={true}
      showText={true}
      className="w-full justify-start text-left h-12 px-4"
    >
      Sign Out
    </SignOutButton>
  );
}