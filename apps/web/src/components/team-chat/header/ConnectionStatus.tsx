// Connection Status Indicator
// Shows WebSocket connection status with color-coded dot

import React from 'react';
import { cn } from '@/lib/cn';
import type { ConnectionStatus as Status } from '../types';

interface ConnectionStatusProps {
  status: Status;
}

const STATUS_CONFIG = {
  connected: {
    dot: 'bg-green-500',
    text: 'Connected',
    pulse: true,
  },
  connecting: {
    dot: 'bg-yellow-500',
    text: 'Connecting...',
    pulse: true,
  },
  disconnected: {
    dot: 'bg-red-500',
    text: 'Disconnected',
    pulse: false,
  },
  reconnecting: {
    dot: 'bg-orange-500',
    text: 'Reconnecting...',
    pulse: true,
  },
};

/**
 * ConnectionStatus - Visual indicator of WebSocket connection state
 */
export function ConnectionStatus({ status }: ConnectionStatusProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div 
      className="flex items-center gap-1.5 text-xs"
      title={config.text}
      role="status"
      aria-label={`Connection status: ${config.text}`}
    >
      <div
        className={cn(
          'w-2 h-2 rounded-full transition-colors',
          config.dot,
          config.pulse && 'animate-pulse'
        )}
      />
      <span className="text-muted-foreground hidden sm:inline">
        {config.text}
      </span>
    </div>
  );
}

