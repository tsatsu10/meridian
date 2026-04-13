import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  Circle,
  Square,
  Pause,
  Play,
  Download,
  Trash2,
  Settings,
  Cloud,
  HardDrive,
  Monitor,
  FileVideo,
  Clock,
  Users,
  Share,
  Edit,
  Copy,
  FolderOpen,
  Upload,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { toast } from '@/lib/toast';

interface RecordingFile {
  id: string;
  name: string;
  blob: Blob;
  size: number;
  duration: number;
  timestamp: Date;
  participants: string[];
  roomId: string;
  format: string;
}

interface RecordingOptions {
  quality: 'high' | 'medium' | 'low';
  includeAudio: boolean;
  includeVideo: boolean;
  saveLocation: 'browser' | 'local' | 'cloud';
  format: 'webm' | 'mp4' | 'mov';
  splitDuration?: number;
}

interface RecordingManagerProps {
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: string;
  recordedFiles: RecordingFile[];
  recordingOptions: RecordingOptions;
  onStartRecording: () => void;
  onPauseRecording: () => void;
  onStopRecording: () => void;
  onDeleteRecording: (id: string) => void;
  onDownloadFile: (file: RecordingFile) => void;
  onExportRecording: (id: string, format: 'webm' | 'mp4' | 'mov') => void;
  onUpdateOptions: (options: RecordingOptions) => void;
  formatFileSize: (bytes: number) => string;
  formatRecordingTime: (seconds: number) => string;
  isVisible: boolean;
  onClose: () => void;
}

export function RecordingManager({
  isRecording,
  isPaused,
  recordingTime,
  recordedFiles,
  recordingOptions,
  onStartRecording,
  onPauseRecording,
  onStopRecording,
  onDeleteRecording,
  onDownloadFile,
  onExportRecording,
  onUpdateOptions,
  formatFileSize,
  formatRecordingTime,
  isVisible,
  onClose
}: RecordingManagerProps) {
  const [activeTab, setActiveTab] = useState<'controls' | 'recordings' | 'settings'>('controls');
  const [selectedRecordings, setSelectedRecordings] = useState<Set<string>>(new Set());
  const [editingName, setEditingName] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const toggleRecordingSelection = (id: string) => {
    const newSelection = new Set(selectedRecordings);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedRecordings(newSelection);
  };

  const selectAllRecordings = () => {
    if (selectedRecordings.size === recordedFiles.length) {
      setSelectedRecordings(new Set());
    } else {
      setSelectedRecordings(new Set(recordedFiles.map(f => f.id)));
    }
  };

  const deleteSelectedRecordings = () => {
    selectedRecordings.forEach(id => onDeleteRecording(id));
    setSelectedRecordings(new Set());
    toast.success(`Deleted ${selectedRecordings.size} recordings`);
  };

  const getTotalStorageUsed = () => {
    return recordedFiles.reduce((total, file) => total + file.size, 0);
  };

  const getQualityBadgeColor = (quality: string) => {
    switch (quality) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSaveLocationIcon = (location: string) => {
    switch (location) {
      case 'local': return <HardDrive className="w-4 h-4" />;
      case 'cloud': return <Cloud className="w-4 h-4" />;
      case 'browser': return <Monitor className="w-4 h-4" />;
      default: return <HardDrive className="w-4 h-4" />;
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2">
            <FileVideo className="w-5 h-5" />
            Recording Manager
          </CardTitle>
          <div className="flex items-center gap-2">
            {isRecording && (
              <Badge variant="secondary" className="bg-red-100 text-red-800">
                <Circle className="w-3 h-3 mr-1 fill-current animate-pulse" />
                REC {recordingTime}
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex space-x-1 border-b">
            <button
              onClick={() => setActiveTab('controls')}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors",
                activeTab === 'controls' 
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" 
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <Circle className="w-4 h-4 inline mr-2" />
              Recording Controls
            </button>
            <button
              onClick={() => setActiveTab('recordings')}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors",
                activeTab === 'recordings' 
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" 
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <FileVideo className="w-4 h-4 inline mr-2" />
              Recordings ({recordedFiles.length})
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors",
                activeTab === 'settings' 
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" 
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Settings
            </button>
          </div>

          {/* Recording Controls Tab */}
          {activeTab === 'controls' && (
            <div className="space-y-6">
              {/* Current Recording Status */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Current Recording</CardTitle>
                </CardHeader>
                <CardContent>
                  {isRecording ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                          <span className="text-lg font-mono">{recordingTime}</span>
                          {isPaused && (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                              PAUSED
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getQualityBadgeColor(recordingOptions.quality)}>
                            {recordingOptions.quality.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">
                            {recordingOptions.format.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={onPauseRecording}
                          className="flex items-center gap-2"
                        >
                          {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                          {isPaused ? 'Resume' : 'Pause'}
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={onStopRecording}
                          className="flex items-center gap-2"
                        >
                          <Square className="w-4 h-4" />
                          Stop Recording
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Circle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-semibold mb-2">Ready to Record</h3>
                      <p className="text-gray-600 mb-4">
                        Start recording your video call with {recordingOptions.quality} quality
                      </p>
                      <Button onClick={onStartRecording} className="bg-red-600 hover:bg-red-700">
                        <Circle className="w-4 h-4 mr-2" />
                        Start Recording
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <FileVideo className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Recordings</p>
                        <p className="text-2xl font-bold">{recordedFiles.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Storage Used</p>
                        <p className="text-2xl font-bold">{formatFileSize(getTotalStorageUsed())}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-purple-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Duration</p>
                        <p className="text-2xl font-bold">
                          {formatRecordingTime(recordedFiles.reduce((total, file) => total + file.duration, 0))}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Recordings Tab */}
          {activeTab === 'recordings' && (
            <div className="space-y-4">
              {/* Recordings Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedRecordings.size === recordedFiles.length && recordedFiles.length > 0}
                    onChange={selectAllRecordings}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-600">
                    {selectedRecordings.size > 0 ? `${selectedRecordings.size} selected` : 'Select all'}
                  </span>
                </div>
                {selectedRecordings.size > 0 && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-1" />
                      Download Selected
                    </Button>
                    <Button variant="destructive" size="sm" onClick={deleteSelectedRecordings}>
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete Selected
                    </Button>
                  </div>
                )}
              </div>

              {/* Recordings List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {recordedFiles.length === 0 ? (
                  <div className="text-center py-12">
                    <FileVideo className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">No Recordings Yet</h3>
                    <p className="text-gray-600">Your recorded calls will appear here</p>
                  </div>
                ) : (
                  recordedFiles.map((file) => (
                    <Card key={file.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedRecordings.has(file.id)}
                            onChange={() => toggleRecordingSelection(file.id)}
                            className="rounded"
                          />
                          
                          <FileVideo className="w-8 h-8 text-blue-500 flex-shrink-0" />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {editingName === file.id ? (
                                <Input
                                  value={newName}
                                  onChange={(e) => setNewName(e.target.value)}
                                  onBlur={() => {
                                    setEditingName(null);
                                    // Update file name logic would go here
                                  }}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      setEditingName(null);
                                      // Update file name logic would go here
                                    }
                                  }}
                                  className="h-6 text-sm"
                                  autoFocus
                                />
                              ) : (
                                <h4 
                                  className="font-medium truncate cursor-pointer hover:text-blue-600"
                                  onClick={() => {
                                    setEditingName(file.id);
                                    setNewName(file.name);
                                  }}
                                >
                                  {file.name}
                                </h4>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {file.format.toUpperCase()}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatRecordingTime(file.duration)}
                              </div>
                              <div className="flex items-center gap-1">
                                <HardDrive className="w-3 h-3" />
                                {formatFileSize(file.size)}
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {file.participants.length} participants
                              </div>
                              <span>{file.timestamp.toLocaleDateString()}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDownloadFile(file)}
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(URL.createObjectURL(file.blob));
                                toast.success('Recording link copied');
                              }}
                              title="Copy link"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDeleteRecording(file.id)}
                              title="Delete"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Recording Quality */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recording Quality</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {['high', 'medium', 'low'].map((quality) => (
                      <button
                        key={quality}
                        onClick={() => onUpdateOptions({ ...recordingOptions, quality: quality as any })}
                        className={cn(
                          "p-3 rounded-lg border text-center transition-colors",
                          recordingOptions.quality === quality
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <div className="font-medium capitalize">{quality}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {quality === 'high' && '1080p, 5 Mbps'}
                          {quality === 'medium' && '720p, 2.5 Mbps'}
                          {quality === 'low' && '480p, 1 Mbps'}
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Save Location */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Save Location</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'local', label: 'Local Drive', icon: <HardDrive className="w-5 h-5" /> },
                      { value: 'browser', label: 'Browser Storage', icon: <Monitor className="w-5 h-5" /> },
                      { value: 'cloud', label: 'Cloud Storage', icon: <Cloud className="w-5 h-5" /> }
                    ].map((location) => (
                      <button
                        key={location.value}
                        onClick={() => onUpdateOptions({ ...recordingOptions, saveLocation: location.value as any })}
                        className={cn(
                          "p-3 rounded-lg border text-center transition-colors",
                          recordingOptions.saveLocation === location.value
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <div className="flex justify-center mb-2">{location.icon}</div>
                        <div className="font-medium">{location.label}</div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Format & Options */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Format & Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Format</Label>
                      <select
                        value={recordingOptions.format}
                        onChange={(e) => onUpdateOptions({ ...recordingOptions, format: e.target.value as any })}
                        className="w-full p-2 border rounded-lg"
                      >
                        <option value="webm">WebM (recommended)</option>
                        <option value="mp4">MP4</option>
                        <option value="mov">MOV</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Split Duration (minutes)</Label>
                      <Input
                        type="number"
                        min="5"
                        max="120"
                        value={recordingOptions.splitDuration || ''}
                        onChange={(e) => onUpdateOptions({ 
                          ...recordingOptions, 
                          splitDuration: e.target.value ? parseInt(e.target.value) : undefined 
                        })}
                        placeholder="No splitting"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="include-audio"
                        checked={recordingOptions.includeAudio}
                        onChange={(e) => onUpdateOptions({ ...recordingOptions, includeAudio: e.target.checked })}
                      />
                      <Label htmlFor="include-audio">Include Audio</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="include-video"
                        checked={recordingOptions.includeVideo}
                        onChange={(e) => onUpdateOptions({ ...recordingOptions, includeVideo: e.target.checked })}
                      />
                      <Label htmlFor="include-video">Include Video</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}