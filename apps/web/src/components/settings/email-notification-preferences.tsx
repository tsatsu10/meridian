import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Mail, 
  MailOpen,
  Clock,
  Send,
  Trash2,
  TestTube,
  MessageSquare,
  AtSign,
  Hash,
  CheckSquare,
  AlertCircle,
  Moon,
  WifiOff,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useEmailNotifications } from '@/hooks/useEmailNotifications';
import { ShineBorder } from '@/components/magicui/shine-border';
import { MagicCard } from '@/components/magicui/magic-card';

interface EmailNotificationPreferencesProps {
  className?: string;
}

export function EmailNotificationPreferences({ className }: EmailNotificationPreferencesProps) {
  const {
    preferences,
    loading,
    lastDigest,
    pendingMessages,
    updatePreferences,
    sendDigestEmail,
    testEmailNotification,
    clearPendingMessages
  } = useEmailNotifications();

  const [testEmailSent, setTestEmailSent] = useState(false);

  const CardWrapper = ({ children }: { children: React.ReactNode }) => (
    <>
      {/* Light mode: Professional styling */}
      <Card className="block dark:hidden bg-white border border-gray-200 shadow-sm">
        {children}
      </Card>
      
      {/* Dark mode: Magic UI styling */}
      <div className="hidden dark:block">
        <ShineBorder
          className="relative overflow-hidden rounded-lg border-0 bg-slate-900/95 backdrop-blur-sm"
          color={["#A07CFE", "#FE8FB5", "#FFBE7B"]}
        >
          <MagicCard className="cursor-pointer border-0 bg-slate-900/90 backdrop-blur-sm shadow-2xl">
            <Card className="border-0 shadow-none bg-slate-900/50">
              {children}
            </Card>
          </MagicCard>
        </ShineBorder>
      </div>
    </>
  );

  if (!preferences) {
    const LoadingContent = () => (
      <CardContent className="p-6 text-center">
        <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin" />
        <p>Loading email preferences...</p>
      </CardContent>
    );

    return (
      <div className={className}>
        <CardWrapper>
          <LoadingContent />
        </CardWrapper>
      </div>
    );
  }

  const handleTestEmail = async () => {
    try {
      await testEmailNotification();
      setTestEmailSent(true);
      setTimeout(() => setTestEmailSent(false), 3000);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleSendDigest = async () => {
    try {
      await sendDigestEmail();
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const getFrequencyDescription = (frequency: string) => {
    const descriptions = {
      immediate: 'Send emails immediately when messages arrive',
      hourly: 'Send a digest email every hour with accumulated messages',
      daily: 'Send a daily digest email at your specified time',
      weekly: 'Send a weekly digest email on Mondays at your specified time'
    };
    return descriptions[frequency as keyof typeof descriptions] || '';
  };

  const getChannelIcon = (channel: string) => {
    const icons = {
      directMessages: MessageSquare,
      mentions: AtSign,
      channelMessages: Hash,
      taskUpdates: CheckSquare,
      systemNotifications: AlertCircle
    };
    const Icon = icons[channel as keyof typeof icons];
    return Icon ? <Icon className="w-4 h-4" /> : null;
  };

  const getChannelName = (channel: string) => {
    const names = {
      directMessages: 'Direct Messages',
      mentions: 'Mentions',
      channelMessages: 'Channel Messages',
      taskUpdates: 'Task Updates',
      systemNotifications: 'System Notifications'
    };
    return names[channel as keyof typeof names] || channel;
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Email Status */}
      <CardWrapper>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-3 h-3 rounded-full",
                preferences.enabled ? "bg-green-500" : "bg-gray-400"
              )} />
              <div>
                <p className="font-medium">
                  {preferences.enabled ? 'Email Notifications Enabled' : 'Email Notifications Disabled'}
                </p>
                <p className="text-sm text-muted-dual">
                  {preferences.enabled 
                    ? `Sending ${preferences.digestFrequency} ${preferences.digestFrequency !== 'immediate' ? 'digests' : 'emails'}`
                    : 'Enable to receive email notifications for missed messages'
                  }
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.enabled}
              onCheckedChange={(enabled) => updatePreferences({ enabled })}
            />
          </div>

          {preferences.enabled && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestEmail}
                disabled={loading}
                className="flex items-center gap-2"
              >
                {testEmailSent ? (
                  <>
                    <MailOpen className="w-4 h-4" />
                    Test Email Sent!
                  </>
                ) : (
                  <>
                    <TestTube className="w-4 h-4" />
                    Send Test Email
                  </>
                )}
              </Button>
              
              {pendingMessages.length > 0 && preferences.digestFrequency !== 'immediate' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendDigest}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send Digest Now
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </CardWrapper>

      {/* Pending Messages */}
      {preferences.enabled && pendingMessages.length > 0 && (
        <CardWrapper>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Pending Messages
              </div>
              <Badge variant="secondary">
                {pendingMessages.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-dual">
              Messages queued for the next email digest
            </p>
            
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {pendingMessages.slice(0, 10).map((message) => (
                <div key={message.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded">
                  {getChannelIcon(message.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {message.from}
                    </p>
                    <p className="text-xs text-muted-dual truncate">
                      {message.content}
                    </p>
                  </div>
                  <span className="text-xs text-muted-dual">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))}
              {pendingMessages.length > 10 && (
                <p className="text-xs text-muted-dual text-center">
                  ... and {pendingMessages.length - 10} more messages
                </p>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm text-muted-dual">
                Next digest: {getNextDigestTime(preferences)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearPendingMessages}
                className="flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Clear All
              </Button>
            </div>
          </CardContent>
        </CardWrapper>
      )}

      {/* Last Digest Info */}
      {preferences.enabled && lastDigest && (
        <CardWrapper>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MailOpen className="w-5 h-5" />
              Last Email Digest
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  Sent {lastDigest.sentAt?.toLocaleDateString()} at {lastDigest.sentAt?.toLocaleTimeString()}
                </p>
                <p className="text-sm text-muted-dual">
                  Included {getTotalMessages(lastDigest)} messages from {formatDateRange(lastDigest.period)}
                </p>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Delivered
              </Badge>
            </div>
          </CardContent>
        </CardWrapper>
      )}

      {/* Digest Settings */}
      {preferences.enabled && (
        <CardWrapper>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Digest Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Email Digests</Label>
                <p className="text-sm text-muted-dual">
                  Group messages into periodic digest emails
                </p>
              </div>
              <Switch
                checked={preferences.digestEnabled}
                onCheckedChange={(digestEnabled) => updatePreferences({ digestEnabled })}
              />
            </div>

            {preferences.digestEnabled && (
              <>
                <div>
                  <Label>Digest Frequency</Label>
                  <p className="text-sm text-muted-dual mb-2">
                    How often to send digest emails
                  </p>
                  <Select
                    value={preferences.digestFrequency}
                    onValueChange={(frequency: 'immediate' | 'hourly' | 'daily' | 'weekly') => 
                      updatePreferences({ digestFrequency: frequency })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-dual mt-1">
                    {getFrequencyDescription(preferences.digestFrequency)}
                  </p>
                </div>

                {preferences.digestFrequency !== 'immediate' && (
                  <div>
                    <Label>Digest Time</Label>
                    <p className="text-sm text-muted-dual mb-2">
                      What time to send digest emails
                    </p>
                    <Input
                      type="time"
                      value={preferences.digestTime}
                      onChange={(e) => updatePreferences({ digestTime: e.target.value })}
                      className="w-32"
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </CardWrapper>
      )}

      {/* Channel Preferences */}
      {preferences.enabled && (
        <CardWrapper>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="w-5 h-5" />
              Email Channel Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-dual">
              Choose which types of messages to include in email notifications
            </p>
            
            {Object.entries(preferences.channels).map(([channel, enabled]) => (
              <div key={channel} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getChannelIcon(channel)}
                  <div>
                    <Label>{getChannelName(channel)}</Label>
                    <p className="text-sm text-muted-dual">
                      {getChannelDescription(channel)}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) => updatePreferences({
                    channels: {
                      ...preferences.channels,
                      [channel]: checked
                    }
                  })}
                />
              </div>
            ))}
          </CardContent>
        </CardWrapper>
      )}

      {/* Advanced Settings */}
      {preferences.enabled && (
        <CardWrapper>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <WifiOff className="w-5 h-5" />
              Advanced Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Offline Only</Label>
                <p className="text-sm text-muted-dual">
                  Only send emails when you're not actively using the app
                </p>
              </div>
              <Switch
                checked={preferences.offlineOnly}
                onCheckedChange={(offlineOnly) => updatePreferences({ offlineOnly })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Respect Quiet Hours</Label>
                <p className="text-sm text-muted-dual">
                  Don't send emails during quiet hours
                </p>
              </div>
              <Switch
                checked={preferences.quietHours.enabled}
                onCheckedChange={(enabled) => updatePreferences({
                  quietHours: { ...preferences.quietHours, enabled }
                })}
              />
            </div>

            {preferences.quietHours.enabled && (
              <div className="grid grid-cols-2 gap-4 ml-6">
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
        </CardWrapper>
      )}
    </div>
  );
}

function getNextDigestTime(preferences: any): string {
  const now = new Date();
  const [hours, minutes] = preferences.digestTime.split(':').map(Number);
  
  switch (preferences.digestFrequency) {
    case 'immediate':
      return 'Immediate';
    case 'hourly':
      const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0);
      return nextHour.toLocaleTimeString();
    case 'daily':
      const nextDaily = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
      if (nextDaily <= now) {
        nextDaily.setDate(nextDaily.getDate() + 1);
      }
      return nextDaily.toLocaleString();
    case 'weekly':
      const nextWeekly = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
      const daysUntilMonday = (1 - now.getDay() + 7) % 7;
      nextWeekly.setDate(nextWeekly.getDate() + daysUntilMonday);
      if (nextWeekly <= now) {
        nextWeekly.setDate(nextWeekly.getDate() + 7);
      }
      return nextWeekly.toLocaleString();
    default:
      return 'Unknown';
  }
}

function getTotalMessages(digest: any): number {
  const messages = digest.messages;
  return Object.values(messages).reduce((total: number, msgs: any) => total + msgs.length, 0);
}

function formatDateRange(period: { start: Date; end: Date }): string {
  const start = period.start.toLocaleString();
  const end = period.end.toLocaleString();
  return `${start} - ${end}`;
}

function getChannelDescription(channel: string): string {
  const descriptions = {
    directMessages: 'Personal messages sent directly to you',
    mentions: 'Messages where you are specifically mentioned',
    channelMessages: 'Messages in channels you are subscribed to',
    taskUpdates: 'Updates on tasks you are assigned to or following',
    systemNotifications: 'System alerts and administrative messages'
  };
  return descriptions[channel as keyof typeof descriptions] || '';
}