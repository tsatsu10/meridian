import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Send,
  Eye,
  MessageCircle
} from 'lucide-react';
import { cn } from '@/lib/cn';

export type DeliveryStatus = 
  | 'sending' 
  | 'sent' 
  | 'delivered' 
  | 'read' 
  | 'failed' 
  | 'partial';

export interface DeliveryInfo {
  status: DeliveryStatus;
  timestamp?: Date;
  totalRecipients: number;
  successfulRecipients: number;
  failedRecipients?: string[];
  readBy?: { name: string; readAt: Date }[];
}

interface DeliveryStatusProps {
  deliveryInfo: DeliveryInfo;
  className?: string;
  showDetails?: boolean;
}

const STATUS_CONFIG = {
  sending: {
    icon: Clock,
    label: 'Sending...',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  sent: {
    icon: Send,
    label: 'Sent',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  delivered: {
    icon: CheckCircle,
    label: 'Delivered',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  read: {
    icon: Eye,
    label: 'Read',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  failed: {
    icon: XCircle,
    label: 'Failed',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  partial: {
    icon: AlertCircle,
    label: 'Partial',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
};

export default function DeliveryStatus({ 
  deliveryInfo, 
  className,
  showDetails = true 
}: DeliveryStatusProps) {
  const config = STATUS_CONFIG[deliveryInfo.status];
  const Icon = config.icon;

  // Format timestamp
  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  // Generate tooltip content
  const getTooltipContent = () => {
    const lines = [];
    
    lines.push(`Status: ${config.label}`);
    
    if (deliveryInfo.timestamp) {
      lines.push(`Time: ${formatTime(deliveryInfo.timestamp)}`);
    }
    
    if (deliveryInfo.status === 'partial') {
      lines.push(`Sent to: ${deliveryInfo.successfulRecipients}/${deliveryInfo.totalRecipients} recipients`);
      if (deliveryInfo.failedRecipients?.length) {
        lines.push(`Failed: ${deliveryInfo.failedRecipients.length} recipients`);
      }
    } else if (deliveryInfo.totalRecipients > 1) {
      lines.push(`Recipients: ${deliveryInfo.totalRecipients}`);
    }
    
    if (deliveryInfo.readBy?.length) {
      lines.push(`Read by: ${deliveryInfo.readBy.length} recipients`);
    }
    
    return lines.join('\n');
  };

  const statusElement = (
    <div className={cn(
      "flex items-center gap-2 px-2 py-1 rounded-md border text-xs",
      config.color,
      config.bgColor,
      config.borderColor,
      className
    )}>
      <Icon className="h-3 w-3" />
      <span className="font-medium">{config.label}</span>
      
      {showDetails && deliveryInfo.totalRecipients > 1 && (
        <>
          {deliveryInfo.status === 'partial' ? (
            <Badge variant="outline" className="text-xs h-4 px-1">
              {deliveryInfo.successfulRecipients}/{deliveryInfo.totalRecipients}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs h-4 px-1">
              {deliveryInfo.totalRecipients}
            </Badge>
          )}
        </>
      )}
      
      {showDetails && deliveryInfo.timestamp && (
        <span className="text-muted-foreground ml-1">
          {formatTime(deliveryInfo.timestamp)}
        </span>
      )}
    </div>
  );

  if (!showDetails) {
    return statusElement;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {statusElement}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <div className="whitespace-pre-line text-sm">
            {getTooltipContent()}
            
            {deliveryInfo.readBy?.length > 0 && (
              <div className="mt-2 pt-2 border-t border-muted">
                <div className="font-medium mb-1">Read by:</div>
                {deliveryInfo.readBy.slice(0, 5).map((reader, index) => (
                  <div key={index} className="text-xs text-muted-foreground">
                    {reader.name} • {formatTime(reader.readAt)}
                  </div>
                ))}
                {deliveryInfo.readBy.length > 5 && (
                  <div className="text-xs text-muted-foreground">
                    +{deliveryInfo.readBy.length - 5} more
                  </div>
                )}
              </div>
            )}
            
            {deliveryInfo.failedRecipients?.length > 0 && (
              <div className="mt-2 pt-2 border-t border-muted">
                <div className="font-medium mb-1 text-red-600">Failed recipients:</div>
                {deliveryInfo.failedRecipients.slice(0, 3).map((recipient, index) => (
                  <div key={index} className="text-xs text-red-600">
                    {recipient}
                  </div>
                ))}
                {deliveryInfo.failedRecipients.length > 3 && (
                  <div className="text-xs text-red-600">
                    +{deliveryInfo.failedRecipients.length - 3} more
                  </div>
                )}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Hook for managing delivery status with real-time updates
export function useDeliveryStatus(messageId: string) {
  const [deliveryInfo, setDeliveryInfo] = React.useState<DeliveryInfo | null>(null);

  React.useEffect(() => {
    if (!messageId) return;

    // Initialize with sending status
    setDeliveryInfo({
      status: 'sending',
      totalRecipients: 1,
      successfulRecipients: 0,
      timestamp: new Date(),
    });

    // Connect to WebSocket for real-time delivery status updates
    const wsUrl = (import.meta.env.VITE_WS_URL || 'ws://localhost:3005').replace('http', 'ws');
    let ws: WebSocket | null = null;

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        // Subscribe to delivery status updates for this message
        ws?.send(JSON.stringify({
          type: 'subscribe_delivery_status',
          messageId: messageId
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'delivery_status' && data.messageId === messageId) {
            setDeliveryInfo({
              status: data.status,
              totalRecipients: data.totalRecipients || 1,
              successfulRecipients: data.successfulRecipients || 0,
              failedRecipients: data.failedRecipients,
              readRecipients: data.readRecipients,
              timestamp: new Date(data.timestamp),
            });
          }
        } catch (error) {
          console.error('Error parsing delivery status:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error for delivery status:', error);
        // Fallback to polling or optimistic status
        setDeliveryInfo(prev => prev ? {
          ...prev,
          status: 'sent',
          successfulRecipients: prev.totalRecipients,
        } : null);
      };

    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      // Fallback: Optimistically set to sent
      setTimeout(() => {
        setDeliveryInfo(prev => prev ? {
          ...prev,
          status: 'sent',
          successfulRecipients: prev.totalRecipients,
        } : null);
      }, 1000);
    }

    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        // Unsubscribe from delivery status updates
        ws.send(JSON.stringify({
          type: 'unsubscribe_delivery_status',
          messageId: messageId
        }));
        ws.close();
      }
    };
  }, [messageId]);

  return deliveryInfo;
}