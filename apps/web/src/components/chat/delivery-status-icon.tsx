// @epic-3.1-messaging: Message delivery status indicator
// @persona-sarah: PM needs to see if messages were delivered and read
// @persona-david: Team lead needs delivery confirmation for important communications

import React from 'react';
import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export type DeliveryStatus = 'sent' | 'delivered' | 'read' | 'failed';

interface DeliveryStatusIconProps {
  status: DeliveryStatus;
  deliveredAt?: Date;
  className?: string;
  showTooltip?: boolean;
}

export function DeliveryStatusIcon({ 
  status, 
  deliveredAt, 
  className = "", 
  showTooltip = true 
}: DeliveryStatusIconProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'sent':
        return (
          <Clock 
            className={cn("w-3 h-3 text-gray-400", className)}
            aria-label="Message sent"
          />
        );
      case 'delivered':
        return (
          <Check 
            className={cn("w-3 h-3 text-blue-500", className)}
            aria-label="Message delivered"
          />
        );
      case 'read':
        return (
          <CheckCheck 
            className={cn("w-3 h-3 text-green-500", className)}
            aria-label="Message read"
          />
        );
      case 'failed':
        return (
          <AlertCircle 
            className={cn("w-3 h-3 text-red-500", className)}
            aria-label="Message failed"
          />
        );
      default:
        return null;
    }
  };

  const getTooltipContent = () => {
    switch (status) {
      case 'sent':
        return 'Message sent';
      case 'delivered':
        return deliveredAt 
          ? `Delivered ${formatDistanceToNow(deliveredAt, { addSuffix: true })}`
          : 'Message delivered';
      case 'read':
        return 'Message read';
      case 'failed':
        return 'Message failed to send';
      default:
        return 'Unknown status';
    }
  };

  const icon = getStatusIcon();
  if (!icon) return null;

  if (!showTooltip) {
    return icon;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center">
            {icon}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{getTooltipContent()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default DeliveryStatusIcon;