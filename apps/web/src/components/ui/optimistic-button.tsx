import React, { useState, useCallback } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

// @epic-3.2-time: Mike needs immediate feedback during task operations
// @persona-mike: Developer wants responsive UI that doesn't feel laggy

interface OptimisticButtonProps extends Omit<ButtonProps, 'onClick'> {
  onClick: () => Promise<void> | void;
  loadingText?: string;
  successText?: string;
  errorText?: string;
  showSuccessState?: boolean;
  successDuration?: number;
  children: React.ReactNode;
}

type ButtonState = 'idle' | 'loading' | 'success' | 'error';

export const OptimisticButton: React.FC<OptimisticButtonProps> = ({
  onClick,
  loadingText = "Loading...",
  successText = "Success!",
  errorText = "Error",
  showSuccessState = true,
  successDuration = 2000,
  children,
  disabled,
  className,
  ...props
}) => {
  const [state, setState] = useState<ButtonState>('idle');

  const handleClick = useCallback(async () => {
    if (state === 'loading') return;

    setState('loading');

    try {
      await Promise.resolve(onClick());
      
      if (showSuccessState) {
        setState('success');
        setTimeout(() => setState('idle'), successDuration);
      } else {
        setState('idle');
      }
    } catch (error) {
      setState('error');
      setTimeout(() => setState('idle'), 3000);
      console.error('OptimisticButton error:', error);
    }
  }, [onClick, showSuccessState, successDuration, state]);

  const getContent = () => {
    switch (state) {
      case 'loading':
        return (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {loadingText}
          </>
        );
      case 'success':
        return (
          <>
            <Check className="h-4 w-4 mr-2" />
            {successText}
          </>
        );
      case 'error':
        return (
          <>
            <AlertCircle className="h-4 w-4 mr-2" />
            {errorText}
          </>
        );
      default:
        return children;
    }
  };

  const getVariant = () => {
    if (state === 'success') return 'default';
    if (state === 'error') return 'destructive';
    return props.variant || 'default';
  };

  return (
    <Button
      {...props}
      variant={getVariant()}
      disabled={disabled || state === 'loading'}
      onClick={handleClick}
      className={cn(
        'transition-all duration-200',
        state === 'success' && 'bg-green-600 hover:bg-green-700 border-green-600',
        state === 'error' && 'bg-red-600 hover:bg-red-700 border-red-600',
        className
      )}
    >
      {getContent()}
    </Button>
  );
};

export default OptimisticButton; 