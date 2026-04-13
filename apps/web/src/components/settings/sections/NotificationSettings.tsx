// Notification settings section with comprehensive notification preferences
import React, { useState } from 'react';
import { useSettings } from '../providers/SettingsProvider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bell, 
  Mail, 
  Smartphone, 
  Monitor,
  Volume2,
  VolumeX,
  Vibrate,
  MessageSquare,
  Hash,
  FolderKanban,
  Calendar,
  Users,
  Save, 
  RotateCcw,
  TestTube,
  Info,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/cn';

const notificationTypes = [
  {
    key: 'mentions',
    label: 'Mentions',
    description: 'When someone mentions you in a message',
    icon: Hash,
    color: 'text-blue-500',
  },
  {
    key: 'directMessages',
    label: 'Direct Messages',
    description: 'Private messages sent to you',
    icon: MessageSquare,
    color: 'text-green-500',
  },
  {
    key: 'taskAssignments',
    label: 'Task Assignments',
    description: 'When you are assigned to a task',
    icon: FolderKanban,
    color: 'text-purple-500',
  },
  {
    key: 'projectUpdates',
    label: 'Project Updates',
    description: 'Updates on projects you follow',
    icon: Calendar,
    color: 'text-orange-500',
  },
  {
    key: 'weeklyDigest',
    label: 'Weekly Digest',
    description: 'Summary of your week\'s activity',
    icon: Mail,
    color: 'text-indigo-500',
  },
  {
    key: 'marketingEmails',
    label: 'Marketing Emails',
    description: 'Product updates and announcements',
    icon: Bell,
    color: 'text-red-500',
  },
];

const soundOptions = [
  { value: 'default', label: 'Default notification sound' },
  { value: 'chime', label: 'Chime' },
  { value: 'bell', label: 'Bell' },
  { value: 'pop', label: 'Pop' },
  { value: 'whistle', label: 'Whistle' },
  { value: 'none', label: 'No sound' },
];

export const NotificationSettings: React.FC = () => {
  const { state, updateField, saveSettings, isDirty, hasErrors } = useSettings();
  const [testingNotification, setTestingNotification] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  
  const notifications = state.settings.notifications;
  const loading = state.loading.notifications;
  const error = state.errors.notifications;

  // Check notification permission on mount
  React.useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  const handleSave = async () => {
    await saveSettings('notifications');
  };

  const handleReset = () => {
    // Reset functionality would be handled by the provider
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      return permission;
    }
    return 'denied';
  };

  const testNotification = async (type: string) => {
    setTestingNotification(type);
    
    try {
      if ('Notification' in window) {
        let permission = Notification.permission;
        
        if (permission === 'default') {
          permission = await requestNotificationPermission();
        }
        
        if (permission === 'granted') {
          new Notification('Test Notification', {
            body: `This is a test ${type} notification`,
            icon: '/meridian-logomark.png',
            badge: '/meridian-logomark.png',
          });
        }
      }
    } catch (error) {
      console.error('Failed to send test notification:', error);
    } finally {
      setTimeout(() => setTestingNotification(null), 2000);
    }
  };

  const updateNotificationField = (category: 'email' | 'push' | 'inApp', field: string, value: boolean) => {
    updateField('notifications', category, {
      ...notifications[category],
      [field]: value,
    });
  };

  const NotificationRow: React.FC<{
    type: typeof notificationTypes[0];
    emailEnabled: boolean;
    pushEnabled: boolean;
    inAppEnabled: boolean;
    onEmailChange: (enabled: boolean) => void;
    onPushChange: (enabled: boolean) => void;
    onInAppChange: (enabled: boolean) => void;
  }> = ({ type, emailEnabled, pushEnabled, inAppEnabled, onEmailChange, onPushChange, onInAppChange }) => {
    const Icon = type.icon;
    
    return (
      <div className="flex items-center justify-between py-3">
        <div className="flex items-center gap-3 flex-1">
          <div className={cn('p-2 rounded-lg bg-muted', type.color)}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <Label className="font-medium">{type.label}</Label>
            <p className="text-sm text-muted-foreground">{type.description}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch
              checked={emailEnabled}
              onCheckedChange={onEmailChange}
              size="sm"
            />
            <Label className="text-sm text-muted-foreground">Email</Label>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              checked={pushEnabled}
              onCheckedChange={onPushChange}
              size="sm"
            />
            <Label className="text-sm text-muted-foreground">Push</Label>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              checked={inAppEnabled}
              onCheckedChange={onInAppChange}
              size="sm"
            />
            <Label className="text-sm text-muted-foreground">In-App</Label>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Notification Settings</h2>
        <p className="text-muted-foreground">
          Control how and when you receive notifications.
        </p>
      </div>

      {/* Permission Status */}
      {permissionStatus !== 'granted' && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Browser notifications are {permissionStatus === 'denied' ? 'blocked' : 'not enabled'}. 
              {permissionStatus === 'denied' ? ' Please enable them in your browser settings.' : ''}
            </span>
            {permissionStatus !== 'denied' && (
              <Button
                variant="outline"
                size="sm"
                onClick={requestNotificationPermission}
              >
                Enable Notifications
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="preferences" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="channels" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Channels
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            Advanced
          </TabsTrigger>
        </TabsList>

        {/* Notification Preferences */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Types</CardTitle>
              <CardDescription>
                Choose which types of notifications you want to receive and through which channels.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {/* Header Row */}
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <div className="flex-1">
                    <Label className="font-medium">Notification Type</Label>
                  </div>
                  <div className="flex items-center gap-6">
                    <Label className="text-sm text-muted-foreground w-12 text-center">Email</Label>
                    <Label className="text-sm text-muted-foreground w-12 text-center">Push</Label>
                    <Label className="text-sm text-muted-foreground w-12 text-center">In-App</Label>
                  </div>
                </div>

                {/* Notification Rows */}
                {notificationTypes.map((type) => (
                  <NotificationRow
                    key={type.key}
                    type={type}
                    emailEnabled={notifications.email[type.key as keyof typeof notifications.email] as boolean}
                    pushEnabled={notifications.push[type.key as keyof typeof notifications.push] as boolean}
                    inAppEnabled={notifications.inApp[type.key as keyof typeof notifications.inApp] as boolean}
                    onEmailChange={(enabled) => 
                      updateNotificationField('email', type.key, enabled)
                    }
                    onPushChange={(enabled) => 
                      updateNotificationField('push', type.key, enabled)
                    }
                    onInAppChange={(enabled) => 
                      updateNotificationField('inApp', type.key, enabled)
                    }
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Channels */}
        <TabsContent value="channels" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Email Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email
                </CardTitle>
                <CardDescription>
                  Email notification settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Enable Email Notifications</Label>
                  <Switch
                    checked={notifications.email.enabled}
                    onCheckedChange={(checked) => 
                      updateNotificationField('email', 'enabled', checked)
                    }
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Email Summary</Label>
                  <p className="text-xs text-muted-foreground">
                    {notifications.email.enabled 
                      ? `You'll receive emails for ${Object.entries(notifications.email).filter(([key, value]) => key !== 'enabled' && value).length} notification types.`
                      : 'Email notifications are disabled.'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Push Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Push
                </CardTitle>
                <CardDescription>
                  Mobile and desktop push notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Enable Push Notifications</Label>
                  <Switch
                    checked={notifications.push.enabled}
                    onCheckedChange={(checked) => 
                      updateNotificationField('push', 'enabled', checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4" />
                    Sound
                  </Label>
                  <Switch
                    checked={notifications.push.soundEnabled}
                    onCheckedChange={(checked) => 
                      updateNotificationField('push', 'soundEnabled', checked)
                    }
                    disabled={!notifications.push.enabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Vibrate className="h-4 w-4" />
                    Vibration
                  </Label>
                  <Switch
                    checked={notifications.push.vibrationEnabled}
                    onCheckedChange={(checked) => 
                      updateNotificationField('push', 'vibrationEnabled', checked)
                    }
                    disabled={!notifications.push.enabled}
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testNotification('push')}
                  disabled={!notifications.push.enabled || testingNotification === 'push'}
                  className="w-full"
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {testingNotification === 'push' ? 'Testing...' : 'Test Push Notification'}
                </Button>
              </CardContent>
            </Card>

            {/* In-App Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  In-App
                </CardTitle>
                <CardDescription>
                  Notifications within the application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Enable In-App Notifications</Label>
                  <Switch
                    checked={notifications.inApp.enabled}
                    onCheckedChange={(checked) => 
                      updateNotificationField('inApp', 'enabled', checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Sound Effects</Label>
                  <Switch
                    checked={notifications.inApp.soundEffects}
                    onCheckedChange={(checked) => 
                      updateNotificationField('inApp', 'soundEffects', checked)
                    }
                    disabled={!notifications.inApp.enabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Desktop Notifications</Label>
                  <Switch
                    checked={notifications.inApp.desktop}
                    onCheckedChange={(checked) => 
                      updateNotificationField('inApp', 'desktop', checked)
                    }
                    disabled={!notifications.inApp.enabled}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Advanced Settings */}
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>
                Fine-tune your notification experience.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Notification Sound</Label>
                  <Select defaultValue="default">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {soundOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label className="text-base font-medium">Quiet Hours</Label>
                  <p className="text-sm text-muted-foreground">
                    Notifications will be silenced during these hours (local time).
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Select defaultValue="22:00">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => (
                            <SelectItem key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                              {`${i.toString().padStart(2, '0')}:00`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Select defaultValue="08:00">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => (
                            <SelectItem key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                              {`${i.toString().padStart(2, '0')}:00`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label className="text-base font-medium">Notification Bundling</Label>
                  <p className="text-sm text-muted-foreground">
                    Group similar notifications to reduce interruptions.
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <Label>Bundle similar notifications</Label>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>Delay notifications by 30 seconds</Label>
                    <Switch />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-2">
          {isDirty('notifications') && (
            <Badge variant="secondary" className="gap-1">
              <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
              Unsaved changes
            </Badge>
          )}
          {error && (
            <Badge variant="destructive">
              Error: {error}
            </Badge>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={loading || !isDirty('notifications')}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={loading || !isDirty('notifications') || hasErrors('notifications')}
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;