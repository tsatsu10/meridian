import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, 
  BellOff, 
  Volume2, 
  VolumeX,
  Smartphone,
  Eye,
  EyeOff,
  Clock,
  Hash,
  Filter,
  TestTube,
  Settings,
  MessageSquare,
  AtSign,
  Users,
  CheckSquare,
  AlertCircle,
  Moon,
  Sun,
  Plus,
  X,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { toast } from '@/lib/toast';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface NotificationPreferencesProps {
  className?: string;
}

export function NotificationPreferences({ className }: NotificationPreferencesProps) {
  const {
    support,
    preferences,
    loading,
    requestPermission,
    updatePreferences,
    testNotification
  } = usePushNotifications();

  const [newKeyword, setNewKeyword] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!preferences) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin" />
          <p>Loading notification preferences...</p>
        </CardContent>
      </Card>
    );
  }

  const handlePermissionRequest = async () => {
    try {
      await requestPermission();
    } catch (error) {
      toast.error('Failed to enable notifications');
    }
  };

  const handleChannelToggle = (channel: string, enabled: boolean) => {
    updatePreferences({
      channels: {
        ...preferences.channels,
        [channel]: {
          ...preferences.channels[channel as keyof typeof preferences.channels],
          enabled
        }
      }
    });
  };

  const handleChannelPriorityChange = (channel: string, priority: 'high' | 'normal' | 'low') => {
    updatePreferences({
      channels: {
        ...preferences.channels,
        [channel]: {
          ...preferences.channels[channel as keyof typeof preferences.channels],
          priority
        }
      }
    });
  };

  const addKeyword = () => {
    if (newKeyword && !preferences.keywords.includes(newKeyword)) {
      updatePreferences({
        keywords: [...preferences.keywords, newKeyword]
      });
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    updatePreferences({
      keywords: preferences.keywords.filter(k => k !== keyword)
    });
  };

  const muteTemporarily = (hours: number) => {
    const muteUntil = Date.now() + (hours * 60 * 60 * 1000);
    updatePreferences({ muteTemporary: muteUntil });
  };

  const unmute = () => {
    updatePreferences({ muteTemporary: null });
  };

  const isTemporarilyMuted = preferences.muteTemporary && preferences.muteTemporary > Date.now();
  const muteTimeRemaining = isTemporarilyMuted 
    ? Math.ceil((preferences.muteTemporary! - Date.now()) / (1000 * 60 * 60))
    : 0;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Permission Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-3 h-3 rounded-full",
                support.permission === 'granted' ? "bg-green-500" : 
                support.permission === 'denied' ? "bg-red-500" : "bg-orange-500"
              )} />
              <div>
                <p className="font-medium">
                  {support.permission === 'granted' ? 'Notifications Enabled' :
                   support.permission === 'denied' ? 'Notifications Blocked' :
                   'Notifications Not Enabled'}
                </p>
                <p className="text-sm text-gray-500">
                  {support.permission === 'granted' ? 'You will receive browser notifications' :
                   support.permission === 'denied' ? 'Enable in browser settings to receive notifications' :
                   'Click enable to receive browser notifications'}
                </p>
              </div>
            </div>
            {support.permission !== 'granted' && (
              <Button 
                onClick={handlePermissionRequest} 
                disabled={!support.supported || loading}
              >
                {loading ? 'Requesting...' : 'Enable Notifications'}
              </Button>
            )}
          </div>

          {support.permission === 'granted' && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={testNotification}
                className="flex items-center gap-2"
              >
                <TestTube className="w-4 h-4" />
                Test Notification
              </Button>
              
              {isTemporarilyMuted ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={unmute}
                  className="flex items-center gap-2"
                >
                  <Bell className="w-4 h-4" />
                  Unmute ({muteTimeRemaining}h remaining)
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => muteTemporarily(1)}
                    className="text-xs"
                  >
                    Mute 1h
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => muteTemporarily(8)}
                    className="text-xs"
                  >
                    Mute 8h
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Preferences */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="filtering">Filtering</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                General Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4" />
                  <div>
                    <Label>Enable Notifications</Label>
                    <p className="text-sm text-gray-500">
                      Master switch for all notifications
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.enabled}
                  onCheckedChange={(enabled) => updatePreferences({ enabled })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-4 h-4" />
                  <div>
                    <Label>Sound Notifications</Label>
                    <p className="text-sm text-gray-500">
                      Play sound when notifications arrive
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.soundEnabled}
                  onCheckedChange={(soundEnabled) => updatePreferences({ soundEnabled })}
                  disabled={!preferences.enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-4 h-4" />
                  <div>
                    <Label>Vibration</Label>
                    <p className="text-sm text-gray-500">
                      Vibrate on mobile devices
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.vibrationEnabled}
                  onCheckedChange={(vibrationEnabled) => updatePreferences({ vibrationEnabled })}
                  disabled={!preferences.enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Eye className="w-4 h-4" />
                  <div>
                    <Label>Show Preview</Label>
                    <p className="text-sm text-gray-500">
                      Show message content in notifications
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.showPreview}
                  onCheckedChange={(showPreview) => updatePreferences({ showPreview })}
                  disabled={!preferences.enabled}
                />
              </div>
            </CardContent>
          </Card>

          {/* Quiet Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="w-5 h-5" />
                Quiet Hours
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Quiet Hours</Label>
                  <p className="text-sm text-gray-500">
                    Silence notifications during specified hours
                  </p>
                </div>
                <Switch
                  checked={preferences.quietHours.enabled}
                  onCheckedChange={(enabled) => updatePreferences({
                    quietHours: { ...preferences.quietHours, enabled }
                  })}
                  disabled={!preferences.enabled}
                />
              </div>

              {preferences.quietHours.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={preferences.quietHours.start}
                      onChange={(e) => updatePreferences({
                        quietHours: { ...preferences.quietHours, start: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={preferences.quietHours.end}
                      onChange={(e) => updatePreferences({
                        quietHours: { ...preferences.quietHours, end: e.target.value }
                      })}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Channel Settings */}
        <TabsContent value="channels" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="w-5 h-5" />
                Channel Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(preferences.channels).map(([channel, settings]) => (
                <div key={channel} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {channel === 'directMessages' && <MessageSquare className="w-4 h-4" />}
                    {channel === 'mentions' && <AtSign className="w-4 h-4" />}
                    {channel === 'channelMessages' && <Hash className="w-4 h-4" />}
                    {channel === 'taskUpdates' && <CheckSquare className="w-4 h-4" />}
                    {channel === 'systemNotifications' && <AlertCircle className="w-4 h-4" />}
                    <div>
                      <Label className="capitalize">
                        {channel.replace(/([A-Z])/g, ' $1').trim()}
                      </Label>
                      <p className="text-sm text-gray-500">
                        {getChannelDescription(channel)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Select
                      value={settings.priority}
                      onValueChange={(priority: 'high' | 'normal' | 'low') => 
                        handleChannelPriorityChange(channel, priority)
                      }
                      disabled={!settings.enabled || !preferences.enabled}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                    <Switch
                      checked={settings.enabled}
                      onCheckedChange={(enabled) => handleChannelToggle(channel, enabled)}
                      disabled={!preferences.enabled}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Filtering */}
        <TabsContent value="filtering" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Smart Filtering
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Smart Filtering</Label>
                  <p className="text-sm text-gray-500">
                    Automatically filter duplicate and spam notifications
                  </p>
                </div>
                <Switch
                  checked={preferences.smartFiltering.enabled}
                  onCheckedChange={(enabled) => updatePreferences({
                    smartFiltering: { ...preferences.smartFiltering, enabled }
                  })}
                  disabled={!preferences.enabled}
                />
              </div>

              {preferences.smartFiltering.enabled && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Focus Aware</Label>
                      <p className="text-sm text-gray-500">
                        Don't notify when app is in focus
                      </p>
                    </div>
                    <Switch
                      checked={preferences.smartFiltering.focusAware}
                      onCheckedChange={(focusAware) => updatePreferences({
                        smartFiltering: { ...preferences.smartFiltering, focusAware }
                      })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Rate Limiting</Label>
                      <p className="text-sm text-gray-500">
                        Limit notification frequency from same source
                      </p>
                    </div>
                    <Switch
                      checked={preferences.smartFiltering.rateLimiting}
                      onCheckedChange={(rateLimiting) => updatePreferences({
                        smartFiltering: { ...preferences.smartFiltering, rateLimiting }
                      })}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Keywords */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="w-5 h-5" />
                Keyword Filtering
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-500">
                Only notify for messages containing these keywords (leave empty to notify for all messages)
              </p>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Add keyword..."
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                />
                <Button onClick={addKeyword} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {preferences.keywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {preferences.keywords.map((keyword) => (
                    <Badge key={keyword} variant="secondary" className="flex items-center gap-1">
                      {keyword}
                      <button
                        onClick={() => removeKeyword(keyword)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced */}
        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Advanced Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Group Notifications</Label>
                  <p className="text-sm text-gray-500">
                    Group similar notifications together
                  </p>
                </div>
                <Switch
                  checked={preferences.groupNotifications}
                  onCheckedChange={(groupNotifications) => updatePreferences({ groupNotifications })}
                  disabled={!preferences.enabled}
                />
              </div>

              <div>
                <Label>Duplicate Window (minutes)</Label>
                <p className="text-sm text-gray-500 mb-2">
                  Time window to consider notifications as duplicates
                </p>
                <Select
                  value={Math.floor(preferences.smartFiltering.duplicateWindow / 60000).toString()}
                  onValueChange={(value) => updatePreferences({
                    smartFiltering: {
                      ...preferences.smartFiltering,
                      duplicateWindow: parseInt(value) * 60000
                    }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 minute</SelectItem>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="10">10 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function getChannelDescription(channel: string): string {
  const descriptions = {
    directMessages: 'Personal messages from other users',
    mentions: 'When someone mentions you in a message',
    channelMessages: 'Messages in channels you\'re subscribed to',
    taskUpdates: 'Updates on tasks you\'re involved with',
    systemNotifications: 'System alerts and announcements'
  };
  return descriptions[channel as keyof typeof descriptions] || '';
}