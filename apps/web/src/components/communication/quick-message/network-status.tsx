import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';
import { toast } from '@/lib/toast';

interface NetworkStatusProps {
  showWhenOnline?: boolean;
  className?: string;
}

export default function NetworkStatus({ 
  showWhenOnline = false, 
  className = '' 
}: NetworkStatusProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        toast.success('Connection restored!');
        setWasOffline(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      toast.warning('You are now offline. Messages will be sent when connection is restored.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  // Don't show anything if online and showWhenOnline is false
  if (isOnline && !showWhenOnline) {
    return null;
  }

  return (
    <Badge
      variant={isOnline ? 'default' : 'destructive'}
      className={`flex items-center gap-1 ${className}`}
    >
      {isOnline ? (
        <>
          <Wifi className="w-3 h-3" />
          Online
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3" />
          Offline
        </>
      )}
    </Badge>
  );
}

// Hook for network status
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}