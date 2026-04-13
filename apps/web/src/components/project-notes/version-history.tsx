/**
 * Version History Component - Phase 5.2
 * Displays version history for a note with diff comparison
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { History, Clock, User, ChevronRight, FileText } from 'lucide-react';
import { API_BASE_URL } from '@/constants/urls';
import { formatDistanceToNow, format } from 'date-fns';

interface NoteVersion {
  id: string;
  noteId: string;
  content: string;
  editedBy: string;
  versionNumber: number;
  changeDescription?: string | null;
  createdAt: string;
}

interface VersionHistoryProps {
  noteId: string;
  onClose?: () => void;
}

export function VersionHistory({ noteId, onClose }: VersionHistoryProps) {
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<NoteVersion | null>(null);
  const [compareVersion, setCompareVersion] = useState<NoteVersion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVersions();
  }, [noteId]);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/project-notes/notes/${noteId}/versions`, {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch versions');

      const data = await response.json();
      setVersions(data.data || []);
      
      // Select latest version by default
      if (data.data && data.data.length > 0) {
        setSelectedVersion(data.data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch versions:', error);
      toast.error('Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = (version: NoteVersion) => {
    if (compareVersion?.id === version.id) {
      setCompareVersion(null);
    } else {
      setCompareVersion(version);
    }
  };

  const getDiff = () => {
    if (!selectedVersion || !compareVersion) return null;

    const older = selectedVersion.versionNumber < compareVersion.versionNumber 
      ? selectedVersion 
      : compareVersion;
    const newer = selectedVersion.versionNumber > compareVersion.versionNumber 
      ? selectedVersion 
      : compareVersion;

    return {
      older,
      newer,
      addedLines: newer.content.split('\n').filter(line => !older.content.split('\n').includes(line)),
      removedLines: older.content.split('\n').filter(line => !newer.content.split('\n').includes(line)),
    };
  };

  const diff = getDiff();

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Version History
              </CardTitle>
              <CardDescription className="mt-1">
                {versions.length} versions • Select two versions to compare
              </CardDescription>
            </div>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Version List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">All Versions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading versions...</div>
              ) : versions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No versions found</div>
              ) : (
                <div className="space-y-2 p-4">
                  {versions.map((version) => (
                    <div
                      key={version.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent ${
                        selectedVersion?.id === version.id ? 'bg-accent border-primary' : ''
                      } ${compareVersion?.id === version.id ? 'border-secondary' : ''}`}
                      onClick={() => setSelectedVersion(version)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={version.versionNumber === 1 ? 'default' : 'secondary'}>
                          v{version.versionNumber}
                        </Badge>
                        <Button
                          variant={compareVersion?.id === version.id ? 'default' : 'ghost'}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompare(version);
                          }}
                        >
                          {compareVersion?.id === version.id ? 'Selected' : 'Compare'}
                        </Button>
                      </div>
                      
                      {version.changeDescription && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {version.changeDescription}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(version.createdAt))} ago
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <User className="w-3 h-3" />
                        {version.editedBy}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Content Display */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {diff ? 'Version Comparison' : selectedVersion ? `Version ${selectedVersion.versionNumber}` : 'Select a Version'}
            </CardTitle>
            {selectedVersion && !diff && (
              <CardDescription>
                {format(new Date(selectedVersion.createdAt), 'PPpp')} • Edited by {selectedVersion.editedBy}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[550px]">
              {!selectedVersion ? (
                <div className="text-center py-12 text-muted-foreground">
                  Select a version to view its content
                </div>
              ) : diff ? (
                <div className="space-y-4">
                  {/* Comparison Header */}
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <Badge variant="secondary">v{diff.older.versionNumber}</Badge>
                      <p className="text-sm text-muted-foreground mt-1">
                        {format(new Date(diff.older.createdAt), 'PP')}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <Badge variant="default">v{diff.newer.versionNumber}</Badge>
                      <p className="text-sm text-muted-foreground mt-1">
                        {format(new Date(diff.newer.createdAt), 'PP')}
                      </p>
                    </div>
                  </div>

                  {/* Added Lines */}
                  {diff.addedLines.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-green-600 dark:text-green-400">
                        Added ({diff.addedLines.length} lines)
                      </h4>
                      <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
                        {diff.addedLines.map((line, index) => (
                          <pre key={index} className="text-sm text-green-800 dark:text-green-200">
                            + {line}
                          </pre>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Removed Lines */}
                  {diff.removedLines.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-red-600 dark:text-red-400">
                        Removed ({diff.removedLines.length} lines)
                      </h4>
                      <div className="bg-red-50 dark:bg-red-950 rounded-lg p-4">
                        {diff.removedLines.map((line, index) => (
                          <pre key={index} className="text-sm text-red-800 dark:text-red-200">
                            - {line}
                          </pre>
                        ))}
                      </div>
                    </div>
                  )}

                  {diff.addedLines.length === 0 && diff.removedLines.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No differences found
                    </div>
                  )}
                </div>
              ) : (
                <div className="prose dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm">{selectedVersion.content}</pre>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

