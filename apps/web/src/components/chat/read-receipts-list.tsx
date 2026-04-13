// @epic-3.1-messaging: Read Receipts List Component
// @persona-sarah: PM needs to see who has read important messages
// @persona-david: Team lead needs visibility into message delivery

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL, API_URL } from '@/constants/urls';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCheck, Eye, Users, Monitor, Smartphone, Tablet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ReadReceipt {
  id: string;
  messageId: string;
  userId: string;
  userEmail: string;
  userName: string;
  readAt: Date;
  deviceType: string;
  readMethod: string;
  timeSpentMs?: number;
}

interface ReadReceiptSummary {
  totalReaders: number;
  recentReaders: number;
  deviceBreakdown: Record<string, number>;
  lastReadAt: Date | null;
}

interface ReadReceiptsListProps {
  messageId: string;
  currentUserEmail: string;
  trigger?: React.ReactNode;
  className?: string;
}

async function fetchReadReceipts(messageId: string): Promise<{
  receipts: ReadReceipt[];
  summary: ReadReceiptSummary;
}> {
  const response = await fetch(`${API_BASE_URL}/messages/${messageId}/receipts`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch read receipts');
  }
  
  return response.json();
}

function getDeviceIcon(deviceType: string) {
  switch (deviceType?.toLowerCase()) {
    case 'mobile':
      return <Smartphone className="w-3 h-3" />;
    case 'tablet':
      return <Tablet className="w-3 h-3" />;
    case 'desktop':
    default:
      return <Monitor className="w-3 h-3" />;
  }
}

function getReadMethodBadge(readMethod: string) {
  switch (readMethod) {
    case 'clicked':
      return <Badge variant="outline" className="text-xs">Clicked</Badge>;
    case 'scrolled_past':
      return <Badge variant="outline" className="text-xs">Seen</Badge>;
    case 'viewed':
    default:
      return <Badge variant="outline" className="text-xs">Viewed</Badge>;
  }
}

export function ReadReceiptIndicator({ 
  messageId, 
  currentUserEmail,
  className 
}: Omit<ReadReceiptsListProps, 'trigger'>) {
  const { data, isLoading } = useQuery({
    queryKey: ['readReceipts', messageId],
    queryFn: () => fetchReadReceipts(messageId),
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  const receipts = data?.receipts || [];
  const summary = data?.summary;

  if (isLoading || !summary || summary.totalReaders === 0) {
    return null;
  }

  // Show simple indicator for small numbers, detailed for larger
  if (summary.totalReaders <= 3) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("flex items-center gap-1", className)}>
              <CheckCheck className="w-3 h-3 text-blue-500" />
              <span className="text-xs text-muted-foreground">{summary.totalReaders}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              {receipts.slice(0, 3).map((receipt) => (
                <div key={receipt.id} className="text-xs">
                  Read by {receipt.userName || receipt.userEmail} 
                  {receipt.readAt && ` ${formatDistanceToNow(new Date(receipt.readAt), { addSuffix: true })}`}
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <ReadReceiptsList 
      messageId={messageId}
      currentUserEmail={currentUserEmail}
      trigger={
        <Button variant="ghost" size="sm" className={cn("h-5 px-1 text-xs", className)}>
          <CheckCheck className="w-3 h-3 text-blue-500 mr-1" />
          {summary.totalReaders}
        </Button>
      }
    />
  );
}

export default function ReadReceiptsList({
  messageId,
  currentUserEmail,
  trigger,
  className
}: ReadReceiptsListProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['readReceipts', messageId],
    queryFn: () => fetchReadReceipts(messageId),
    enabled: isOpen, // Only fetch when dialog is open
    refetchInterval: isOpen ? 15000 : false, // Refetch every 15 seconds when open
    staleTime: 5000, // Consider data stale after 5 seconds
  });

  const receipts = data?.receipts || [];
  const summary = data?.summary;

  const defaultTrigger = (
    <Button variant="ghost" size="sm" className={cn("h-6 px-2 text-xs", className)}>
      <Eye className="w-3 h-3 mr-1" />
      Read receipts
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCheck className="w-5 h-5" />
            Read Receipts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Stats */}
          {summary && (
            <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.totalReaders}</div>
                <div className="text-xs text-muted-foreground">Total readers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{summary.recentReaders}</div>
                <div className="text-xs text-muted-foreground">Last 24h</div>
              </div>
            </div>
          )}

          {/* Device breakdown */}
          {summary && Object.keys(summary.deviceBreakdown).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Devices</h4>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(summary.deviceBreakdown).map(([device, count]) => (
                  <Badge key={device} variant="outline" className="text-xs">
                    {getDeviceIcon(device)}
                    <span className="ml-1">{device}: {count}</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="text-center py-8 text-red-600">
              <p>Failed to load read receipts</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
                Try again
              </Button>
            </div>
          )}

          {/* Receipts list */}
          {!isLoading && !error && receipts.length > 0 && (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Readers ({receipts.length})
              </h4>
              {receipts.map((receipt) => (
                <div key={receipt.id} className="flex items-center justify-between p-2 bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">
                        {receipt.userName?.charAt(0) || receipt.userEmail.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">
                        {receipt.userName || receipt.userEmail}
                        {receipt.userEmail === currentUserEmail && (
                          <span className="text-xs text-muted-foreground ml-1">(you)</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(receipt.readAt), { addSuffix: true })}
                        {receipt.timeSpentMs && receipt.timeSpentMs > 1000 && (
                          <span className="ml-2">
                            • {Math.round(receipt.timeSpentMs / 1000)}s
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getDeviceIcon(receipt.deviceType)}
                    {getReadMethodBadge(receipt.readMethod)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && receipts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No read receipts yet</p>
              <p className="text-sm mt-1">This message hasn't been read by anyone</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { ReadReceiptsList };