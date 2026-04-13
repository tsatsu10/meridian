import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ConnectionState } from "@/hooks/useUnifiedWebSocket";
import { Wifi, WifiOff, Signal, Clock } from "lucide-react";

interface ConnectionStatusProps {
  connectionState: ConnectionState;
  className?: string;
}

function formatUptime(uptime: number): string {
  const seconds = Math.floor(uptime / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

function getQualityColor(quality: ConnectionState['connectionQuality']) {
  switch (quality) {
    case 'excellent': return 'bg-green-500';
    case 'good': return 'bg-blue-500';
    case 'poor': return 'bg-yellow-500';
    case 'disconnected': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
}

function getQualityIcon(quality: ConnectionState['connectionQuality']) {
  switch (quality) {
    case 'excellent': return <Signal className="h-3 w-3" />;
    case 'good': return <Wifi className="h-3 w-3" />;
    case 'poor': return <Signal className="h-3 w-3" />;
    case 'disconnected': return <WifiOff className="h-3 w-3" />;
    default: return <Wifi className="h-3 w-3" />;
  }
}

export function ConnectionStatus({ connectionState, className }: ConnectionStatusProps) {
  const [currentUptime, setCurrentUptime] = useState(connectionState.uptime);

  // Update uptime every second when connected
  useEffect(() => {
    if (!connectionState.isConnected) return;

    const interval = setInterval(() => {
      setCurrentUptime(Date.now() - (Date.now() - connectionState.uptime));
    }, 1000);

    return () => clearInterval(interval);
  }, [connectionState.isConnected, connectionState.uptime]);

  const qualityColor = getQualityColor(connectionState.connectionQuality);
  const qualityIcon = getQualityIcon(connectionState.connectionQuality);

  const tooltipContent = (
    <div className="space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <span>Status:</span>
        <span className="capitalize font-medium">
          {connectionState.isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      
      <div className="flex items-center justify-between">
        <span>Quality:</span>
        <span className="capitalize font-medium">
          {connectionState.connectionQuality}
        </span>
      </div>
      
      {connectionState.latency && (
        <div className="flex items-center justify-between">
          <span>Latency:</span>
          <span className="font-medium">{connectionState.latency}ms</span>
        </div>
      )}
      
      {connectionState.isConnected && (
        <div className="flex items-center justify-between">
          <span>Uptime:</span>
          <span className="font-medium">{formatUptime(currentUptime)}</span>
        </div>
      )}
      
      {connectionState.reconnectAttempts > 0 && (
        <div className="flex items-center justify-between">
          <span>Reconnects:</span>
          <span className="font-medium">{connectionState.reconnectAttempts}</span>
        </div>
      )}
      
      {connectionState.error && (
        <div className="pt-1 border-t">
          <span className="text-red-400 text-xs">{connectionState.error}</span>
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="secondary" 
            className={`${className} ${qualityColor} text-white cursor-help transition-all duration-200 hover:scale-105`}
          >
            <div className="flex items-center space-x-1">
              {qualityIcon}
              <span className="text-xs font-medium">
                {connectionState.isConnected ? (
                  connectionState.latency ? `${connectionState.latency}ms` : 'Connected'
                ) : (
                  connectionState.isConnecting ? 'Connecting...' : 'Offline'
                )}
              </span>
              {connectionState.isConnected && (
                <div className="flex items-center ml-1">
                  <Clock className="h-2 w-2 mr-0.5" />
                  <span className="text-xs">{formatUptime(currentUptime)}</span>
                </div>
              )}
            </div>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-gray-900 text-white border-gray-700">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}