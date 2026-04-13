import { useRealtimeProvider } from '@/providers/realtime-provider';
import { cn } from '@/lib/utils';
import { WifiOff } from 'lucide-react';

export function ConnectionStatus() {
  const { connectionStatus } = useRealtimeProvider();
  // Always show disconnected
  return (
    <div className={cn('flex items-center gap-2 text-xs text-muted-foreground')}> 
      <WifiOff className="h-4 w-4 text-red-500" />
      <span>Disconnected</span>
    </div>
  );
} 