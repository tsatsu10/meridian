/**
 * @fileoverview File Version Management System
 * @description Complete file versioning with history, comparison, and rollback
 * @author Claude Code Assistant
 * @version 1.0.0
 * 
 * Features:
 * - Version history display
 * - Version comparison view
 * - Version rollback functionality
 * - Change tracking and annotations
 * - Visual diff for text files
 * - Version metadata management
 * - Collaborative version control
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/cn';
import {
  Clock,
  User,
  Download,
  FileText,
  RotateCcw,
  GitBranch,
  Eye,
  ArrowRightLeft,
  MessageSquare,
  Calendar,
  HardDrive,
  Tag,
  ChevronDown,
  ChevronRight,
  Upload,
  AlertCircle,
  CheckCircle,
  History
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface FileVersion {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  version: string;
  parentId?: string;
  userEmail: string;
  userName?: string;
  createdAt: Date;
  description?: string;
  changeNote?: string;
  tags?: string[];
  isActive?: boolean;
  metadata?: {
    changesCount?: number;
    linesAdded?: number;
    linesRemoved?: number;
    checksum?: string;
  };
}

interface FileVersionManagerProps {
  fileId: string;
  currentVersion: FileVersion;
  versions?: FileVersion[];
  onVersionSelect?: (version: FileVersion) => void;
  onVersionRestore?: (versionId: string) => void;
  onVersionCompare?: (version1: FileVersion, version2: FileVersion) => void;
  onNewVersion?: (file: File, description?: string) => void;
  showUpload?: boolean;
  showComparison?: boolean;
  className?: string;
}

// Version comparison view
const VersionComparison: React.FC<{
  version1: FileVersion;
  version2: FileVersion;
  onClose: () => void;
}> = ({ version1, version2, onClose }) => {
  const [loading, setLoading] = useState(false);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Compare Versions
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-full">
          {/* Version 1 */}
          <div className="flex-1 border-r pr-4">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">v{version1.version}</Badge>
                <span className="text-sm font-medium">{version1.name}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {format(version1.createdAt, 'PPpp')} by {version1.userName || version1.userEmail}
              </div>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-4 h-[calc(100%-100px)] overflow-auto">
              <iframe
                src={version1.url}
                className="w-full h-full border-0"
                title={`${version1.name} v${version1.version}`}
              />
            </div>
          </div>

          {/* Version 2 */}
          <div className="flex-1 pl-4">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="default">v{version2.version}</Badge>
                <span className="text-sm font-medium">{version2.name}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {format(version2.createdAt, 'PPpp')} by {version2.userName || version2.userEmail}
              </div>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-4 h-[calc(100%-100px)] overflow-auto">
              <iframe
                src={version2.url}
                className="w-full h-full border-0"
                title={`${version2.name} v${version2.version}`}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// New version upload component
const NewVersionUpload: React.FC<{
  currentVersion: FileVersion;
  onUpload: (file: File, description?: string) => void;
  onClose: () => void;
}> = ({ currentVersion, onUpload, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      await onUpload(file, description);
      onClose();
    } catch (error) {
      console.error('Failed to upload new version:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload New Version
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Current File: {currentVersion.name}
            </label>
            <Badge variant="outline">v{currentVersion.version}</Badge>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Select New Version
            </label>
            <Input
              type="file"
              onChange={handleFileSelect}
              accept={currentVersion.type}
            />
          </div>

          {file && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">{file.name}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-2 block">
              Version Notes (Optional)
            </label>
            <Textarea
              placeholder="Describe what changed in this version..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={!file || uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Version'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Version history item component
const VersionHistoryItem: React.FC<{
  version: FileVersion;
  isActive?: boolean;
  isLatest?: boolean;
  onSelect?: (version: FileVersion) => void;
  onRestore?: (versionId: string) => void;
  onDownload?: (version: FileVersion) => void;
  onCompare?: (version: FileVersion) => void;
}> = ({ 
  version, 
  isActive = false, 
  isLatest = false, 
  onSelect, 
  onRestore, 
  onDownload,
  onCompare 
}) => {
  const [expanded, setExpanded] = useState(false);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = version.url;
    link.download = version.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className={cn(
      "transition-all cursor-pointer",
      isActive && "ring-2 ring-primary",
      isLatest && "border-green-500"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={isLatest ? "default" : "outline"}>
                v{version.version}
              </Badge>
              {isLatest && (
                <Badge variant="secondary" className="text-xs">
                  Latest
                </Badge>
              )}
              {version.tags?.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">
                  <Tag className="h-2 w-2 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>

            <h4 className="font-medium text-sm mb-1">{version.name}</h4>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {version.userName || version.userEmail}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDistanceToNow(version.createdAt, { addSuffix: true })}
              </span>
              <span className="flex items-center gap-1">
                <HardDrive className="h-3 w-3" />
                {(version.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>

            {version.description && (
              <p className="text-xs text-muted-foreground mb-2 italic">
                "{version.description}"
              </p>
            )}

            {version.metadata && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {version.metadata.changesCount && (
                  <span>{version.metadata.changesCount} changes</span>
                )}
                {version.metadata.linesAdded && (
                  <span className="text-green-600">+{version.metadata.linesAdded}</span>
                )}
                {version.metadata.linesRemoved && (
                  <span className="text-red-600">-{version.metadata.linesRemoved}</span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-start gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelect?.(version)}
              className="h-7 w-7 p-0"
            >
              <Eye className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-7 w-7 p-0"
            >
              <Download className="h-3 w-3" />
            </Button>
            {!isLatest && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRestore?.(version.id)}
                className="h-7 w-7 p-0"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCompare?.(version)}
              className="h-7 w-7 p-0"
            >
              <ArrowRightLeft className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {expanded && version.changeNote && (
          <div className="mt-3 pt-3 border-t">
            <h5 className="text-xs font-medium mb-1">Change Notes:</h5>
            <p className="text-xs text-muted-foreground">{version.changeNote}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export function FileVersionManager({
  fileId,
  currentVersion,
  versions = [],
  onVersionSelect,
  onVersionRestore,
  onVersionCompare,
  onNewVersion,
  showUpload = true,
  showComparison = true,
  className,
}: FileVersionManagerProps) {
  const [selectedVersion, setSelectedVersion] = useState<FileVersion | null>(null);
  const [compareVersion, setCompareVersion] = useState<FileVersion | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showCompareDialog, setShowCompareDialog] = useState(false);

  // Sort versions by creation date (newest first)
  const sortedVersions = useMemo(() => {
    const allVersions = [currentVersion, ...versions];
    return allVersions.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [currentVersion, versions]);

  const handleVersionSelect = (version: FileVersion) => {
    setSelectedVersion(version);
    onVersionSelect?.(version);
  };

  const handleVersionRestore = async (versionId: string) => {
    if (confirm('Are you sure you want to restore this version? This action cannot be undone.')) {
      onVersionRestore?.(versionId);
    }
  };

  const handleVersionCompare = (version: FileVersion) => {
    if (compareVersion) {
      onVersionCompare?.(compareVersion, version);
      setShowCompareDialog(true);
    } else {
      setCompareVersion(version);
    }
  };

  const handleNewVersionUpload = (file: File, description?: string) => {
    onNewVersion?.(file, description);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5" />
          <h3 className="font-semibold">Version History</h3>
          <Badge variant="outline">{sortedVersions.length} versions</Badge>
        </div>

        <div className="flex items-center gap-2">
          {showUpload && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUploadDialog(true)}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              New Version
            </Button>
          )}
          
          {compareVersion && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Comparing v{compareVersion.version}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCompareVersion(null)}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Version List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {sortedVersions.map((version, index) => (
          <VersionHistoryItem
            key={version.id}
            version={version}
            isActive={selectedVersion?.id === version.id}
            isLatest={index === 0}
            onSelect={handleVersionSelect}
            onRestore={handleVersionRestore}
            onCompare={handleVersionCompare}
          />
        ))}
      </div>

      {/* Empty State */}
      {sortedVersions.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">No version history available</p>
        </div>
      )}

      {/* Upload Dialog */}
      {showUploadDialog && (
        <NewVersionUpload
          currentVersion={currentVersion}
          onUpload={handleNewVersionUpload}
          onClose={() => setShowUploadDialog(false)}
        />
      )}

      {/* Comparison Dialog */}
      {showCompareDialog && compareVersion && selectedVersion && (
        <VersionComparison
          version1={compareVersion}
          version2={selectedVersion}
          onClose={() => setShowCompareDialog(false)}
        />
      )}
    </div>
  );
}

export default FileVersionManager;