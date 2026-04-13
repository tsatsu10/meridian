import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Clock, 
  User, 
  GitMerge, 
  CheckCircle, 
  XCircle, 
  RotateCcw,
  Eye,
  Download,
  Upload,
  Zap,
  Info
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { AccessibleMotion } from './accessible-animations';

interface ConflictData {
  id: string;
  type: 'message' | 'file' | 'settings' | 'user_data';
  entity: string;
  localVersion: any;
  serverVersion: any;
  conflictTime: Date;
  lastModified: {
    local: Date;
    server: Date;
  };
  modifiedBy: {
    local: string;
    server: string;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoResolvable: boolean;
}

interface ConflictResolution {
  id: string;
  conflictId: string;
  strategy: 'use_local' | 'use_server' | 'merge' | 'create_copy' | 'manual_edit';
  resolvedData?: any;
  timestamp: Date;
  resolvedBy: string;
}

interface OfflineConflictResolverProps {
  conflicts: ConflictData[];
  onResolveConflict: (resolution: ConflictResolution) => Promise<void>;
  onResolveAll: (resolutions: ConflictResolution[]) => Promise<void>;
  onExportConflicts: () => void;
  isResolving?: boolean;
  className?: string;
}

export function OfflineConflictResolver({
  conflicts,
  onResolveConflict,
  onResolveAll,
  onExportConflicts,
  isResolving = false,
  className
}: OfflineConflictResolverProps) {
  const [selectedConflicts, setSelectedConflicts] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('overview');
  const [previewMode, setPreviewMode] = useState<'split' | 'unified'>('split');
  const [autoResolvePreferences, setAutoResolvePreferences] = useState({
    messages: 'use_latest',
    files: 'create_copy',
    settings: 'merge',
    userData: 'manual'
  });

  const conflictsByType = conflicts.reduce((acc, conflict) => {
    acc[conflict.type] = acc[conflict.type] || [];
    acc[conflict.type].push(conflict);
    return acc;
  }, {} as Record<string, ConflictData[]>);

  const conflictsByPriority = conflicts.reduce((acc, conflict) => {
    acc[conflict.severity] = acc[conflict.severity] || [];
    acc[conflict.severity].push(conflict);
    return acc;
  }, {} as Record<string, ConflictData[]>);

  const toggleConflictSelection = (conflictId: string) => {
    const newSelection = new Set(selectedConflicts);
    if (newSelection.has(conflictId)) {
      newSelection.delete(conflictId);
    } else {
      newSelection.add(conflictId);
    }
    setSelectedConflicts(newSelection);
  };

  const selectAllConflicts = (type?: string) => {
    const conflictsToSelect = type ? conflictsByType[type] : conflicts;
    const newSelection = new Set([...selectedConflicts, ...conflictsToSelect.map(c => c.id)]);
    setSelectedConflicts(newSelection);
  };

  const clearSelection = () => {
    setSelectedConflicts(new Set());
  };

  const resolveSelectedConflicts = async (strategy: ConflictResolution['strategy']) => {
    const resolutions: ConflictResolution[] = Array.from(selectedConflicts).map(conflictId => ({
      id: Math.random().toString(36).substr(2, 9),
      conflictId,
      strategy,
      timestamp: new Date(),
      resolvedBy: 'user'
    }));

    await onResolveAll(resolutions);
    clearSelection();
  };

  const renderConflictDiff = (conflict: ConflictData) => {
    const { localVersion, serverVersion } = conflict;
    
    if (previewMode === 'split') {
      return (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Local Version
            </h4>
            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-3">
                <pre className="text-xs whitespace-pre-wrap font-mono">
                  {typeof localVersion === 'string' ? localVersion : JSON.stringify(localVersion, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Server Version
            </h4>
            <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <CardContent className="p-3">
                <pre className="text-xs whitespace-pre-wrap font-mono">
                  {typeof serverVersion === 'string' ? serverVersion : JSON.stringify(serverVersion, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    // Unified diff view (simplified)
    return (
      <Card>
        <CardContent className="p-3">
          <pre className="text-xs whitespace-pre-wrap font-mono">
            {`- ${typeof localVersion === 'string' ? localVersion : JSON.stringify(localVersion, null, 2)}\n+ ${typeof serverVersion === 'string' ? serverVersion : JSON.stringify(serverVersion, null, 2)}`}
          </pre>
        </CardContent>
      </Card>
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'low': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'message': return '💬';
      case 'file': return '📁';
      case 'settings': return '⚙️';
      case 'user_data': return '👤';
      default: return '📄';
    }
  };

  return (
    <AccessibleMotion
      animation="slide"
      direction="up"
      className={cn("w-full max-w-6xl mx-auto", className)}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Offline Sync Conflicts
              </CardTitle>
              <CardDescription>
                Resolve conflicts that occurred while offline. {conflicts.length} conflicts detected.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onExportConflicts}
                disabled={isResolving}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              {selectedConflicts.size > 0 && (
                <Badge variant="secondary">
                  {selectedConflicts.size} selected
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="by-type">By Type</TabsTrigger>
              <TabsTrigger value="by-priority">By Priority</TabsTrigger>
              <TabsTrigger value="bulk-actions">Bulk Actions</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {Object.entries(conflictsByType).map(([type, typeConflicts]) => (
                  <Card key={type} className="text-center">
                    <CardContent className="p-4">
                      <div className="text-2xl mb-2">{getTypeIcon(type)}</div>
                      <div className="text-2xl font-bold">{typeConflicts.length}</div>
                      <div className="text-sm text-muted-foreground capitalize">
                        {type.replace('_', ' ')}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {conflicts.map((conflict) => (
                    <Card key={conflict.id} className="cursor-pointer hover:bg-muted/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={selectedConflicts.has(conflict.id)}
                              onChange={() => toggleConflictSelection(conflict.id)}
                              className="mt-1"
                            />
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{getTypeIcon(conflict.type)}</span>
                                <span className="font-medium">{conflict.entity}</span>
                                <Badge className={getSeverityColor(conflict.severity)}>
                                  {conflict.severity}
                                </Badge>
                                {conflict.autoResolvable && (
                                  <Badge variant="outline">
                                    <Zap className="w-3 h-3 mr-1" />
                                    Auto-resolvable
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Local: Modified by {conflict.modifiedBy.local} at {conflict.lastModified.local.toLocaleString()}
                                <br />
                                Server: Modified by {conflict.modifiedBy.server} at {conflict.lastModified.server.toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Show detailed view
                                setActiveTab(`detail-${conflict.id}`);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onResolveConflict({
                                id: Math.random().toString(36).substr(2, 9),
                                conflictId: conflict.id,
                                strategy: 'use_local',
                                timestamp: new Date(),
                                resolvedBy: 'user'
                              })}
                              disabled={isResolving}
                            >
                              Use Local
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onResolveConflict({
                                id: Math.random().toString(36).substr(2, 9),
                                conflictId: conflict.id,
                                strategy: 'use_server',
                                timestamp: new Date(),
                                resolvedBy: 'user'
                              })}
                              disabled={isResolving}
                            >
                              Use Server
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="by-type" className="space-y-4">
              {Object.entries(conflictsByType).map(([type, typeConflicts]) => (
                <Card key={type}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 capitalize">
                        <span className="text-xl">{getTypeIcon(type)}</span>
                        {type.replace('_', ' ')} Conflicts ({typeConflicts.length})
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => selectAllConflicts(type)}
                      >
                        Select All
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {typeConflicts.map((conflict) => (
                        <div key={conflict.id} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedConflicts.has(conflict.id)}
                              onChange={() => toggleConflictSelection(conflict.id)}
                            />
                            <span className="font-medium">{conflict.entity}</span>
                            <Badge className={getSeverityColor(conflict.severity)}>
                              {conflict.severity}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {conflict.conflictTime.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="by-priority" className="space-y-4">
              {(['critical', 'high', 'medium', 'low'] as const).map((priority) => {
                const priorityConflicts = conflictsByPriority[priority] || [];
                if (priorityConflicts.length === 0) return null;

                return (
                  <Card key={priority}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 capitalize">
                        <AlertTriangle className={cn(
                          "w-5 h-5",
                          priority === 'critical' ? "text-red-500" :
                          priority === 'high' ? "text-orange-500" :
                          priority === 'medium' ? "text-yellow-500" : "text-blue-500"
                        )} />
                        {priority} Priority ({priorityConflicts.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 gap-2">
                        {priorityConflicts.map((conflict) => (
                          <div key={conflict.id} className="flex items-center justify-between p-3 border rounded">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selectedConflicts.has(conflict.id)}
                                onChange={() => toggleConflictSelection(conflict.id)}
                              />
                              <span className="text-lg">{getTypeIcon(conflict.type)}</span>
                              <div>
                                <div className="font-medium">{conflict.entity}</div>
                                <div className="text-sm text-muted-foreground">
                                  {conflict.type.replace('_', ' ')}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {conflict.conflictTime.toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="bulk-actions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Bulk Resolution Actions</CardTitle>
                  <CardDescription>
                    Apply resolution strategies to multiple conflicts at once.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Selected conflicts: {selectedConflicts.size}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => selectAllConflicts()}
                      >
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearSelection}
                      >
                        Clear Selection
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-start"
                      onClick={() => resolveSelectedConflicts('use_local')}
                      disabled={selectedConflicts.size === 0 || isResolving}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Download className="w-4 h-4" />
                        Use Local Versions
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Keep the offline changes for all selected conflicts
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-start"
                      onClick={() => resolveSelectedConflicts('use_server')}
                      disabled={selectedConflicts.size === 0 || isResolving}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Upload className="w-4 h-4" />
                        Use Server Versions
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Accept the server changes for all selected conflicts
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-start"
                      onClick={() => resolveSelectedConflicts('create_copy')}
                      disabled={selectedConflicts.size === 0 || isResolving}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <GitMerge className="w-4 h-4" />
                        Create Copies
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Keep both versions by creating copies
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-start"
                      onClick={() => resolveSelectedConflicts('merge')}
                      disabled={selectedConflicts.size === 0 || isResolving}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4" />
                        Auto-Merge
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Attempt to automatically merge compatible changes
                      </div>
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Auto-Resolution Preferences</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Messages:</span>
                        <select
                          value={autoResolvePreferences.messages}
                          onChange={(e) => setAutoResolvePreferences(prev => ({ ...prev, messages: e.target.value }))}
                          className="px-2 py-1 border rounded"
                        >
                          <option value="use_latest">Use Latest</option>
                          <option value="use_local">Use Local</option>
                          <option value="use_server">Use Server</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Files:</span>
                        <select
                          value={autoResolvePreferences.files}
                          onChange={(e) => setAutoResolvePreferences(prev => ({ ...prev, files: e.target.value }))}
                          className="px-2 py-1 border rounded"
                        >
                          <option value="create_copy">Create Copy</option>
                          <option value="use_latest">Use Latest</option>
                          <option value="manual">Manual Review</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </AccessibleMotion>
  );
}