import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  MessageSquare, 
  Clock, 
  User, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { toast } from '@/lib/toast';

interface MessageConflict {
  messageId: string;
  offlineMessage: {
    content: string;
    timestamp: number;
    author: string;
  };
  serverMessage: {
    content: string;
    timestamp: number;
    author: string;
  };
  conflictReason: string;
}

interface MessageConflictResolverProps {
  conflicts: MessageConflict[];
  onResolveConflict: (messageId: string, resolution: 'keep-offline' | 'keep-server' | 'merge') => void;
  onDismiss: (messageId: string) => void;
  className?: string;
}

export function MessageConflictResolver({ 
  conflicts, 
  onResolveConflict, 
  onDismiss,
  className 
}: MessageConflictResolverProps) {
  const [selectedConflict, setSelectedConflict] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);

  if (conflicts.length === 0) return null;

  const handleResolveConflict = async (messageId: string, resolution: 'keep-offline' | 'keep-server' | 'merge') => {
    setResolving(messageId);
    
    try {
      await onResolveConflict(messageId, resolution);
      
      const resolutionText = {
        'keep-offline': 'offline version',
        'keep-server': 'server version', 
        'merge': 'merged versions'
      }[resolution];
      
      toast.success(`Conflict resolved - kept ${resolutionText}`);
    } catch (error) {
      toast.error('Failed to resolve conflict');
    } finally {
      setResolving(null);
    }
  };

  const handleDismiss = (messageId: string) => {
    onDismiss(messageId);
    toast.info('Conflict dismissed');
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Conflict Summary */}
      <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
            <AlertTriangle className="w-5 h-5" />
            Message Conflicts Detected
            <Badge variant="outline" className="ml-auto">
              {conflicts.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-orange-700 dark:text-orange-300">
            Some messages sent while offline conflict with messages already on the server. 
            Please review and resolve these conflicts.
          </p>
        </CardContent>
      </Card>

      {/* Individual Conflicts */}
      {conflicts.map((conflict) => (
        <Card key={conflict.messageId} className="border-orange-200 dark:border-orange-800">
          <CardHeader 
            className="cursor-pointer" 
            onClick={() => setSelectedConflict(
              selectedConflict === conflict.messageId ? null : conflict.messageId
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <span className="font-medium">Message Conflict</span>
                <Badge variant="outline" className="text-xs">
                  {conflict.conflictReason}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {resolving === conflict.messageId ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className={cn(
                    "w-4 h-4 transition-transform",
                    selectedConflict === conflict.messageId && "rotate-90"
                  )} />
                )}
              </div>
            </div>
          </CardHeader>

          {selectedConflict === conflict.messageId && (
            <CardContent className="space-y-4">
              {/* Conflict Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Offline Message */}
                <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="font-medium text-sm text-blue-800 dark:text-blue-200">
                      Your Offline Message
                    </span>
                  </div>
                  <p className="text-sm mb-2 p-2 bg-white dark:bg-gray-800 rounded border">
                    {conflict.offlineMessage.content}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-blue-600 dark:text-blue-400">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {conflict.offlineMessage.author}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(conflict.offlineMessage.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Server Message */}
                <div className="p-3 border rounded-lg bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="font-medium text-sm text-green-800 dark:text-green-200">
                      Server Message
                    </span>
                  </div>
                  <p className="text-sm mb-2 p-2 bg-white dark:bg-gray-800 rounded border">
                    {conflict.serverMessage.content}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-green-600 dark:text-green-400">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {conflict.serverMessage.author}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(conflict.serverMessage.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Resolution Actions */}
              <div className="flex flex-wrap gap-2 pt-3 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResolveConflict(conflict.messageId, 'keep-offline')}
                  disabled={resolving === conflict.messageId}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="w-3 h-3" />
                  Keep My Version
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResolveConflict(conflict.messageId, 'keep-server')}
                  disabled={resolving === conflict.messageId}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="w-3 h-3" />
                  Keep Server Version
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResolveConflict(conflict.messageId, 'merge')}
                  disabled={resolving === conflict.messageId}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-3 h-3" />
                  Merge Both
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDismiss(conflict.messageId)}
                  disabled={resolving === conflict.messageId}
                  className="flex items-center gap-2 ml-auto"
                >
                  <XCircle className="w-3 h-3" />
                  Dismiss
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}