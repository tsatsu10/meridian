import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  Download, 
  Users, 
  Clock, 
  Wifi, 
  Volume2, 
  Video, 
  Monitor,
  Circle,
  Activity,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useMeetingAnalytics } from '@/hooks/useMeetingAnalytics';

interface MeetingAnalyticsProps {
  roomId: string;
  isVisible: boolean;
  onClose: () => void;
}

export function MeetingAnalytics({ roomId, isVisible, onClose }: MeetingAnalyticsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'quality' | 'events'>('overview');
  const analytics = useMeetingAnalytics(roomId);
  const summary = analytics.getAnalyticsSummary();

  if (!isVisible) return null;

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getQualityColor = (quality: number) => {
    if (quality >= 80) return 'text-green-500';
    if (quality >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getQualityLabel = (quality: number) => {
    if (quality >= 80) return 'Excellent';
    if (quality >= 60) return 'Good';
    if (quality >= 40) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Meeting Analytics
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={analytics.exportAnalytics}>
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex space-x-1 border-b">
            <button
              onClick={() => setActiveTab('overview')}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors",
                activeTab === 'overview' 
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" 
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('quality')}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors",
                activeTab === 'quality' 
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" 
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              Quality
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors",
                activeTab === 'events' 
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" 
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              Events
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Call Duration */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Duration</p>
                      <p className="text-2xl font-bold">{formatDuration(summary.callDuration)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Participants */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Participants</p>
                      <p className="text-2xl font-bold">{summary.participantCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Screen Share Time */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Screen Share</p>
                      <p className="text-2xl font-bold">{summary.screenSharePercentage.toFixed(1)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recording Time */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Circle className="w-5 h-5 text-red-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Recording</p>
                      <p className="text-2xl font-bold">{summary.recordingPercentage.toFixed(1)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Quality Tab */}
          {activeTab === 'quality' && (
            <div className="space-y-6">
              {/* Connection Quality */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Audio Quality */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Volume2 className="w-4 h-4" />
                      Audio Quality
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={cn("text-lg font-bold", getQualityColor(summary.avgAudioQuality))}>
                          {summary.avgAudioQuality}%
                        </span>
                        <Badge variant="secondary">{getQualityLabel(summary.avgAudioQuality)}</Badge>
                      </div>
                      <Progress value={summary.avgAudioQuality} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                {/* Video Quality */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Video className="w-4 h-4" />
                      Video Quality
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={cn("text-lg font-bold", getQualityColor(summary.avgVideoQuality))}>
                          {summary.avgVideoQuality}%
                        </span>
                        <Badge variant="secondary">{getQualityLabel(summary.avgVideoQuality)}</Badge>
                      </div>
                      <Progress value={summary.avgVideoQuality} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                {/* Connection Stability */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Wifi className="w-4 h-4" />
                      Stability
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={cn("text-lg font-bold", getQualityColor(summary.avgStability))}>
                          {summary.avgStability}%
                        </span>
                        <Badge variant="secondary">{getQualityLabel(summary.avgStability)}</Badge>
                      </div>
                      <Progress value={summary.avgStability} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Bandwidth Usage */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Bandwidth Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Audio</p>
                      <div className="flex items-center gap-2">
                        <Progress value={(summary.bandwidth.audio / 128) * 100} className="flex-1 h-2" />
                        <span className="text-sm font-medium">{summary.bandwidth.audio} kbps</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Video</p>
                      <div className="flex items-center gap-2">
                        <Progress value={(summary.bandwidth.video / 2500) * 100} className="flex-1 h-2" />
                        <span className="text-sm font-medium">{summary.bandwidth.video} kbps</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Error Summary */}
              {summary.errorCount > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="w-5 h-5" />
                      Errors ({summary.errorCount})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analytics.metrics.errors.slice(-5).map((error, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 bg-red-500 rounded-full" />
                          <span className="text-gray-600 dark:text-gray-400">{error}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Events Tab */}
          {activeTab === 'events' && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {analytics.events.map((event, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <div className="flex-1">
                    <p className="text-sm font-medium capitalize">{event.type.replace('_', ' ')}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  {event.data && (
                    <Badge variant="secondary" className="text-xs">
                      {JSON.stringify(event.data).slice(0, 20)}...
                    </Badge>
                  )}
                </div>
              ))}
              {analytics.events.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-8 h-8 mx-auto mb-2" />
                  <p>No events recorded yet</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 