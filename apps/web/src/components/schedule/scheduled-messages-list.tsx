// @epic-3.1-messaging: Scheduled messages list component
// @persona-sarah: PM needs to view and manage scheduled messages
// @persona-david: Team lead needs oversight of scheduled communications

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isAfter, isBefore, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';
import { schedulingAPI } from '@/services/scheduling-api';
import {
  Clock,
  Calendar,
  Send,
  X,
  Edit,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Globe,
  MessageSquare,
  Filter,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ScheduledMessage {
  id: string;
  channelId: string;
  userEmail: string;
  content: string;
  messageType: string;
  scheduledFor: string;
  scheduledForLocal: string;
  timezone: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  sentAt?: string;
  sentMessageId?: string;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  mentions: string[];
  attachments: any[];
  createdAt: string;
  updatedAt: string;
}

interface ScheduledMessagesResponse {
  scheduledMessages: ScheduledMessage[];
  count: number;
  status: string;
}

async function fetchScheduledMessages(status?: string): Promise<ScheduledMessagesResponse> {
  return schedulingAPI.getUserScheduledMessages(status);
}

async function cancelScheduledMessage(messageId: string): Promise<void> {
  await schedulingAPI.cancelScheduledMessage(messageId);
}

interface ScheduledMessagesListProps {
  className?: string;
  compact?: boolean;
  showHeader?: boolean;
}

export function ScheduledMessagesList({
  className = "",
  compact = false,
  showHeader = true
}: ScheduledMessagesListProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedMessage, setSelectedMessage] = useState<ScheduledMessage | null>(null);
  const queryClient = useQueryClient();

  const {
    data: messagesResponse,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['scheduledMessages', statusFilter],
    queryFn: () => fetchScheduledMessages(statusFilter),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const cancelMutation = useMutation({
    mutationFn: cancelScheduledMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledMessages'] });
      setSelectedMessage(null);
    },
    onError: (error) => {
      console.error('Failed to cancel message:', error);
    }
  });

  const messages = messagesResponse?.scheduledMessages || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'sent':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string, retryCount: number = 0) => {
    const baseClasses = "text-xs font-medium";
    
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className={cn(baseClasses, "text-blue-700 bg-blue-100")}>
            Pending {retryCount > 0 && `(Retry ${retryCount})`}
          </Badge>
        );
      case 'sent':
        return (
          <Badge variant="secondary" className={cn(baseClasses, "text-green-700 bg-green-100")}>
            Sent
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className={baseClasses}>
            Failed
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="secondary" className={cn(baseClasses, "text-gray-700 bg-gray-100")}>
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline" className={baseClasses}>{status}</Badge>;
    }
  };

  const getTimeUntilScheduled = (scheduledFor: string) => {
    const scheduled = new Date(scheduledFor);
    const now = new Date();
    
    if (isBefore(scheduled, now)) {
      return "Overdue";
    }

    const diffInMinutes = differenceInMinutes(scheduled, now);
    const diffInHours = differenceInHours(scheduled, now);
    const diffInDays = differenceInDays(scheduled, now);

    if (diffInDays > 0) {
      return `in ${diffInDays} day${diffInDays > 1 ? 's' : ''}`;
    } else if (diffInHours > 0) {
      return `in ${diffInHours} hour${diffInHours > 1 ? 's' : ''}`;
    } else {
      return `in ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
    }
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (error) {
    return (
      <div className={cn("text-center py-8", className)}>
        <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
        <h3 className="text-lg font-medium mb-2">Failed to load scheduled messages</h3>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Scheduled Messages</h2>
            <p className="text-sm text-muted-foreground">
              {messagesResponse?.count || 0} scheduled messages
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="w-6 h-6 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Messages list */}
      {!isLoading && (
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No scheduled messages</h3>
              <p className="text-muted-foreground">
                {statusFilter === 'all' 
                  ? "You don't have any scheduled messages yet."
                  : `No messages with status "${statusFilter}".`
                }
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <Card key={message.id} className="hover:shadow-md transition-shadow">
                <CardContent className={cn("p-4", compact && "p-3")}>
                  <div className="flex items-start gap-3">
                    {getStatusIcon(message.status)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(message.status, message.retryCount)}
                        <span className="text-xs text-muted-foreground">
                          {message.status === 'pending' && getTimeUntilScheduled(message.scheduledForLocal)}
                          {message.status === 'sent' && message.sentAt && `Sent ${format(new Date(message.sentAt), 'MMM d, h:mm a')}`}
                        </span>
                      </div>

                      <div className="mb-2">
                        <p className={cn("text-sm", compact ? "text-xs" : "")}>
                          {truncateContent(message.content, compact ? 80 : 150)}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(message.scheduledForLocal), 'MMM d, yyyy h:mm a')}
                        </div>
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {message.timezone}
                        </div>
                        {message.mentions.length > 0 && (
                          <div className="flex items-center gap-1">
                            <span>@{message.mentions.length}</span>
                          </div>
                        )}
                      </div>

                      {message.failureReason && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-600 dark:text-red-400">
                          {message.failureReason}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedMessage(message)}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View details</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {message.status === 'pending' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => cancelMutation.mutate(message.id)}
                                disabled={cancelMutation.isPending}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Cancel</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Message details dialog */}
      {selectedMessage && (
        <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getStatusIcon(selectedMessage.status)}
                Scheduled Message Details
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {getStatusBadge(selectedMessage.status, selectedMessage.retryCount)}
                  {selectedMessage.status === 'pending' && (
                    <Badge variant="outline" className="text-xs">
                      {getTimeUntilScheduled(selectedMessage.scheduledForLocal)}
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Content</Label>
                <div className="mt-1 p-3 bg-muted/50 rounded border text-sm">
                  {selectedMessage.content}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Scheduled For</Label>
                  <div className="mt-1 text-sm">
                    {format(new Date(selectedMessage.scheduledForLocal), 'EEEE, MMMM d, yyyy')}
                    <br />
                    {format(new Date(selectedMessage.scheduledForLocal), 'h:mm a')}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Timezone</Label>
                  <div className="mt-1 text-sm">{selectedMessage.timezone}</div>
                </div>
              </div>

              {selectedMessage.mentions.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Mentions</Label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selectedMessage.mentions.map((mention, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        @{mention}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedMessage.failureReason && (
                <div>
                  <Label className="text-sm font-medium text-red-600">Failure Reason</Label>
                  <div className="mt-1 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-600 dark:text-red-400">
                    {selectedMessage.failureReason}
                  </div>
                </div>
              )}

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Created: {format(new Date(selectedMessage.createdAt), 'MMM d, h:mm a')}</span>
                {selectedMessage.retryCount > 0 && (
                  <span>Retries: {selectedMessage.retryCount}/{selectedMessage.maxRetries}</span>
                )}
              </div>

              {selectedMessage.status === 'pending' && (
                <div className="flex justify-end">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      cancelMutation.mutate(selectedMessage.id);
                    }}
                    disabled={cancelMutation.isPending}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel Message
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default ScheduledMessagesList;