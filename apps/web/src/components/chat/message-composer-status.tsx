// @epic-3.1-messaging: Message composer delivery status indicator
// @persona-sarah: PM needs to see message sending progress
// @persona-david: Team lead needs confirmation that important messages are being sent

import React from 'react';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type MessageSendingState = 'idle' | 'sending' | 'sent' | 'delivered' | 'failed';

interface MessageComposerStatusProps {
  state: MessageSendingState;
  error?: string;
  className?: string;
}

export function MessageComposerStatus({ 
  state, 
  error, 
  className = "" 
}: MessageComposerStatusProps) {
  if (state === 'idle') {
    return null;
  }

  const getStatusContent = () => {
    switch (state) {
      case 'sending':
        return (
          <Badge variant="secondary" className={cn("animate-pulse", className)}>
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Sending...
          </Badge>
        );
      case 'sent':
        return (
          <Badge variant="outline" className={cn("text-blue-600 border-blue-200 bg-blue-50", className)}>
            <CheckCircle className="w-3 h-3 mr-1" />
            Sent
          </Badge>
        );
      case 'delivered':
        return (
          <Badge variant="outline" className={cn("text-green-600 border-green-200 bg-green-50", className)}>
            <CheckCircle className="w-3 h-3 mr-1" />
            Delivered
          </Badge>
        );
      case 'failed':
        return (
          <div className="space-y-2">
            <Badge variant="destructive" className={className}>
              <AlertCircle className="w-3 h-3 mr-1" />
              Failed to send
            </Badge>
            {error && (
              <Alert variant="destructive" className="text-xs">
                <AlertCircle className="h-3 w-3" />
                <AlertDescription className="text-xs">
                  {error}
                </AlertDescription>
              </Alert>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center justify-end">
      {getStatusContent()}
    </div>
  );
}

// Hook to manage message sending state
export function useMessageSendingState() {
  const [state, setState] = React.useState<MessageSendingState>('idle');
  const [error, setError] = React.useState<string | undefined>();

  const reset = () => {
    setState('idle');
    setError(undefined);
  };

  const setSending = () => {
    setState('sending');
    setError(undefined);
  };

  const setSent = () => {
    setState('sent');
    setError(undefined);
  };

  const setDelivered = () => {
    setState('delivered');
    setError(undefined);
  };

  const setFailed = (errorMessage?: string) => {
    setState('failed');
    setError(errorMessage);
  };

  return {
    state,
    error,
    reset,
    setSending,
    setSent,
    setDelivered,
    setFailed,
  };
}

export default MessageComposerStatus;