// Phase 3: Advanced Offline Conflict Resolution
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  ArrowRight, 
  Clock, 
  User, 
  Merge,
  RotateCcw,
  Check,
  X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ConflictData {
  id: string;
  type: 'message_edit' | 'message_delete' | 'duplicate_send' | 'order_conflict';
  localMessage: {
    id: string;
    content: string;
    timestamp: Date;
    userEmail: string;
  };
  serverMessage: {
    id: string;
    content: string;
    timestamp: Date;
    userEmail: string;
  };
  conflictReason: string;
  autoResolution?: 'keep_local' | 'keep_server' | 'merge' | 'manual';
}

interface OfflineConflictResolverProps {
  conflicts: ConflictData[];
  onResolveConflict: (conflictId: string, resolution: 'keep_local' | 'keep_server' | 'merge', mergedContent?: string) => void;
  onResolveAll: (resolution: 'keep_local' | 'keep_server') => void;
  className?: string;
}

export function OfflineConflictResolver({ 
  conflicts, 
  onResolveConflict, 
  onResolveAll,
  className 
}: OfflineConflictResolverProps) {
  const [selectedConflict, setSelectedConflict] = useState<string | null>(null);
  const [mergeContent, setMergeContent] = useState<string>('');

  if (conflicts.length === 0) return null;

  const handleMerge = (conflict: ConflictData) => {
    const merged = `${conflict.localMessage.content}\n\n${conflict.serverMessage.content}`;
    setMergeContent(merged);
    onResolveConflict(conflict.id, 'merge', merged);
  };

  const getConflictTypeLabel = (type: ConflictData['type']) => {
    switch (type) {
      case 'message_edit': return 'Message Edit Conflict';
      case 'message_delete': return 'Message Delete Conflict';
      case 'duplicate_send': return 'Duplicate Message';
      case 'order_conflict': return 'Message Order Conflict';
      default: return 'Unknown Conflict';
    }
  };

  const getConflictSeverity = (type: ConflictData['type']) => {
    switch (type) {
      case 'message_delete': return 'destructive';
      case 'message_edit': return 'warning';
      case 'duplicate_send': return 'secondary';
      case 'order_conflict': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <Card className={`border-orange-200 bg-orange-50 ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <CardTitle className="text-lg text-orange-900">
              Offline Sync Conflicts ({conflicts.length})
            </CardTitle>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onResolveAll('keep_server')}
              className="text-xs"
            >
              Keep All Server
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onResolveAll('keep_local')}
              className="text-xs"
            >
              Keep All Local
            </Button>
          </div>
        </div>
        <p className="text-sm text-orange-700">
          Some of your offline messages conflict with server changes. Please resolve these conflicts.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {conflicts.map((conflict) => (
          <div key={conflict.id} className="border rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge variant={getConflictSeverity(conflict.type) as any}>
                  {getConflictTypeLabel(conflict.type)}
                </Badge>
                <span className="text-xs text-gray-500">
                  {conflict.conflictReason}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Local Version */}
              <div className="border rounded p-3 bg-blue-50">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Your Version (Local)</span>
                  <Badge variant="outline" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatDistanceToNow(conflict.localMessage.timestamp, { addSuffix: true })}
                  </Badge>
                </div>
                <div className="text-sm text-gray-700 bg-white p-2 rounded border">
                  {conflict.localMessage.content}
                </div>
              </div>

              {/* Server Version */}
              <div className="border rounded p-3 bg-green-50">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowRight className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Server Version</span>
                  <Badge variant="outline" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatDistanceToNow(conflict.serverMessage.timestamp, { addSuffix: true })}
                  </Badge>
                </div>
                <div className="text-sm text-gray-700 bg-white p-2 rounded border">
                  {conflict.serverMessage.content}
                </div>
              </div>
            </div>

            {/* Resolution Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onResolveConflict(conflict.id, 'keep_local')}
                className="flex items-center gap-1"
              >
                <Check className="w-4 h-4" />
                Keep Local
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onResolveConflict(conflict.id, 'keep_server')}
                className="flex items-center gap-1"
              >
                <RotateCcw className="w-4 h-4" />
                Keep Server
              </Button>
              {conflict.type === 'message_edit' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMerge(conflict)}
                  className="flex items-center gap-1"
                >
                  <Merge className="w-4 h-4" />
                  Merge Both
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onResolveConflict(conflict.id, 'keep_server')}
                className="flex items-center gap-1 text-red-600 hover:text-red-700"
              >
                <X className="w-4 h-4" />
                Ignore
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}