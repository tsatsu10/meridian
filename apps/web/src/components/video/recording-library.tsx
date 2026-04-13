/**
 * Recording Library Component
 * Browse and manage video recordings
 * Phase 4.1 - Video Communication System
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Play,
  Download,
  Trash2,
  Search,
  Calendar,
  Clock,
  Users,
  Eye,
  Share2,
} from 'lucide-react';

interface Recording {
  id: string;
  roomId: string;
  title: string;
  description: string | null;
  fileUrl: string;
  thumbnailUrl: string | null;
  duration: number; // seconds
  fileSize: number; // bytes
  format: string;
  resolution: string | null;
  recordedAt: string;
  viewCount: number;
  isPublic: boolean;
}

interface RecordingLibraryProps {
  workspaceId: string;
}

export function RecordingLibrary({ workspaceId }: RecordingLibraryProps) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);

  useEffect(() => {
    loadRecordings();
  }, [workspaceId]);

  const loadRecordings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/video/recordings?workspaceId=${workspaceId}&limit=50`);
      const data = await response.json();
      setRecordings(data.recordings || []);
    } catch (error) {
      console.error('Failed to load recordings:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) {
      return `${mb.toFixed(1)} MB`;
    }
    return `${(mb / 1024).toFixed(1)} GB`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredRecordings = recordings.filter((recording) =>
    recording.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePlay = (recording: Recording) => {
    setSelectedRecording(recording);
    // Open video player modal or navigate to player page
  };

  const handleDownload = async (recording: Recording) => {
    // Trigger download
    const link = document.createElement('a');
    link.href = recording.fileUrl;
    link.download = `${recording.title}.${recording.format}`;
    link.click();
  };

  const handleDelete = async (recordingId: string) => {
    if (!confirm('Are you sure you want to delete this recording?')) return;

    try {
      await fetch(`/api/video/recordings/${recordingId}`, {
        method: 'DELETE',
      });
      setRecordings(recordings.filter((r) => r.id !== recordingId));
    } catch (error) {
      console.error('Failed to delete recording:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-gray-500">Loading recordings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Recording Library</h2>
          <p className="text-gray-600 mt-1">
            {recordings.length} recording{recordings.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Search */}
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search recordings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Recordings Grid */}
      {filteredRecordings.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <Play className="w-16 h-16 mx-auto mb-4" />
              <p className="text-lg font-medium">No recordings found</p>
              <p className="text-sm mt-2">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Start a video call and enable recording to create your first recording'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecordings.map((recording) => (
            <Card key={recording.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {/* Thumbnail */}
              <div className="relative aspect-video bg-gray-200 overflow-hidden">
                {recording.thumbnailUrl ? (
                  <img
                    src={recording.thumbnailUrl}
                    alt={recording.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-500 to-purple-600">
                    <Play className="w-12 h-12 text-white" />
                  </div>
                )}

                {/* Duration Badge */}
                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                  {formatDuration(recording.duration)}
                </div>

                {/* Play Overlay */}
                <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                  <Button
                    onClick={() => handlePlay(recording)}
                    size="lg"
                    className="rounded-full w-14 h-14"
                  >
                    <Play className="w-6 h-6" />
                  </Button>
                </div>
              </div>

              {/* Recording Details */}
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-2 line-clamp-2">{recording.title}</h3>

                {recording.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{recording.description}</p>
                )}

                {/* Metadata */}
                <div className="space-y-2 text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(recording.recordedAt)}</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{recording.viewCount} views</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatFileSize(recording.fileSize)}</span>
                    </div>
                  </div>

                  {recording.resolution && (
                    <div className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                      {recording.resolution}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handlePlay(recording)}
                    variant="default"
                    size="sm"
                    className="flex-1"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Play
                  </Button>

                  <Button
                    onClick={() => handleDownload(recording)}
                    variant="outline"
                    size="sm"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </Button>

                  <Button
                    onClick={() => handleDelete(recording.id)}
                    variant="outline"
                    size="sm"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Video Player Modal */}
      {selectedRecording && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg overflow-hidden max-w-5xl w-full">
            <div className="aspect-video bg-black">
              <video
                src={selectedRecording.fileUrl}
                controls
                autoPlay
                className="w-full h-full"
              />
            </div>

            <div className="p-6">
              <h3 className="text-2xl font-bold mb-2">{selectedRecording.title}</h3>
              {selectedRecording.description && (
                <p className="text-gray-600 mb-4">{selectedRecording.description}</p>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(selectedRecording.recordedAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{formatDuration(selectedRecording.duration)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <span>{selectedRecording.viewCount} views</span>
                  </div>
                </div>

                <Button onClick={() => setSelectedRecording(null)} variant="outline">
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

