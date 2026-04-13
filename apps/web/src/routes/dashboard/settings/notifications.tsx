// @epic-3.5-communication: Notification settings for granular control
// @persona-sarah: PM needs granular notification control
// @persona-david: Team lead needs team activity notifications
// @persona-mike: Dev needs focused notifications for task assignments

"use client";

import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettingsStore } from "@/store/settings";
import { 
  Bell, 
  Mail, 
  Smartphone, 
  MessageSquare, 
  CheckCircle,
  Target,
  Globe,
  Monitor,
  Save,
  RotateCcw,
  TestTube,
  Loader2,
  Volume2,
  Settings,
  Calendar,
  Users
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import LazyDashboardLayout from "@/components/performance/lazy-dashboard-layout";
import { withErrorBoundary } from "@/components/dashboard/universal-error-boundary";

export const Route = createFileRoute("/dashboard/settings/notifications")({
  component: withErrorBoundary(NotificationSettings, "Notification Settings"),
});

function NotificationSettings() {
  const { settings, updateSettings, isLoading, addRecentlyViewed, hasUnsavedChanges, saveSettings } = useSettingsStore();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);

  // Track this page as recently viewed
  useEffect(() => {
    addRecentlyViewed("notifications");
    // Check browser notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, [addRecentlyViewed]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await saveSettings();
      toast.success("Notification settings saved successfully!");
    } catch (error) {
      toast.error("Failed to save notification settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSettings = async () => {
    try {
      // Reset to default notification settings
      await updateSettings("notifications", {
        email: {
          taskAssigned: true,
          taskCompleted: true,
          taskOverdue: true,
          projectUpdates: true,
          teamInvitations: true,
          weeklyDigest: true,
          mentions: true,
          comments: true,
        },
        push: {
          taskAssigned: true,
          taskCompleted: false,
          taskOverdue: true,
          mentions: true,
          comments: true,
          directMessages: true,
          projectUpdates: false,
        },
        inApp: {
          taskAssigned: true,
          taskCompleted: true,
          taskOverdue: true,
          mentions: true,
          comments: true,
          directMessages: true,
          projectUpdates: true,
          teamActivity: true,
        },
        soundEnabled: false,
      });
      toast.success("Settings reset to defaults");
    } catch (error) {
      toast.error("Failed to reset settings");
    }
  };

  const testNotification = async () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Meridian Test Notification', {
        body: 'This is a test notification from Meridian! 🚀',
        icon: '/meridian-logomark.png',
        badge: '/meridian-logomark.png',
        tag: 'test-notification'
      });
      toast.success("Browser notification sent! 🔔");
    } else {
      toast.success("Test notification sent! 🔔");
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission === 'granted') {
          toast.success("Browser notifications enabled!");
          new Notification('Meridian Notifications Enabled', {
            body: 'You will now receive browser notifications from Meridian.',
            icon: '/meridian-logomark.png',
            badge: '/meridian-logomark.png'
          });
        } else if (permission === 'denied') {
          toast.error("Browser notifications denied. You can enable them in your browser settings.");
        }
      } catch (error) {
        toast.error("Failed to request notification permission");
      }
    } else {
      toast.error("Browser notifications are not supported");
    }
  };

  const handleToggleSetting = async (category: 'email' | 'push' | 'inApp', setting: string, value: boolean) => {
    try {
      await updateSettings("notifications", {
        ...settings.notifications,
        [category]: {
          ...settings.notifications[category],
          [setting]: value
        }
      });
      
      // Immediate feedback
      setTimeout(() => {
        toast.success(`${value ? 'Enabled' : 'Disabled'} ${setting} notifications`, {
          duration: 1500,
        });
      }, 0);
    } catch (error) {
      toast.error("Failed to update setting");
    }
  };

  const toggleAllInCategory = async (category: 'email' | 'push' | 'inApp', enabled: boolean) => {
    try {
      const categorySettings = settings.notifications[category];
      const updatedSettings = Object.keys(categorySettings).reduce((acc, key) => {
        acc[key] = enabled;
        return acc;
      }, {} as Record<string, boolean>);

      await updateSettings("notifications", {
        ...settings.notifications,
        [category]: updatedSettings
      });
      
      setTimeout(() => {
        toast.success(`${enabled ? 'Enabled' : 'Disabled'} all ${category} notifications`);
      }, 0);
    } catch (error) {
      toast.error("Failed to update settings");
    }
  };

  // Notification categories organized by channel type
  const emailNotifications = [
    { key: "taskAssigned", label: "Task assignments", description: "When a task is assigned to you", icon: CheckCircle },
    { key: "taskCompleted", label: "Task completions", description: "When tasks you're watching are completed", icon: CheckCircle },
    { key: "taskOverdue", label: "Overdue tasks", description: "When your tasks become overdue", icon: CheckCircle },
    { key: "mentions", label: "Mentions", description: "When someone mentions you", icon: MessageSquare },
    { key: "comments", label: "Comments", description: "New comments on your tasks", icon: MessageSquare },
    { key: "projectUpdates", label: "Project updates", description: "Changes to your projects", icon: Target },
    { key: "teamInvitations", label: "Team invitations", description: "Invitations to join teams", icon: Users },
    { key: "weeklyDigest", label: "Weekly digest", description: "Weekly summary of your activity", icon: Calendar },
  ];

  const pushNotifications = [
    { key: "taskAssigned", label: "Task assignments", description: "When a task is assigned to you", icon: CheckCircle },
    { key: "taskCompleted", label: "Task completions", description: "When tasks are completed", icon: CheckCircle },
    { key: "taskOverdue", label: "Overdue tasks", description: "When your tasks become overdue", icon: CheckCircle },
    { key: "mentions", label: "Mentions", description: "When someone mentions you", icon: MessageSquare },
    { key: "comments", label: "Comments", description: "New comments on your tasks", icon: MessageSquare },
    { key: "directMessages", label: "Direct messages", description: "Direct messages from team members", icon: MessageSquare },
    { key: "projectUpdates", label: "Project updates", description: "Changes to your projects", icon: Target },
  ];

  const inAppNotifications = [
    { key: "taskAssigned", label: "Task assignments", description: "When a task is assigned to you", icon: CheckCircle },
    { key: "taskCompleted", label: "Task completions", description: "When tasks are completed", icon: CheckCircle },
    { key: "taskOverdue", label: "Overdue tasks", description: "When your tasks become overdue", icon: CheckCircle },
    { key: "mentions", label: "Mentions", description: "When someone mentions you", icon: MessageSquare },
    { key: "comments", label: "Comments", description: "New comments on your tasks", icon: MessageSquare },
    { key: "directMessages", label: "Direct messages", description: "Direct messages from team members", icon: MessageSquare },
    { key: "projectUpdates", label: "Project updates", description: "Changes to your projects", icon: Target },
    { key: "teamActivity", label: "Team activity", description: "Updates from your team members", icon: Users },
  ];

  if (isLoading) {
    return (
      <LazyDashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading notification settings...</p>
          </div>
        </div>
      </LazyDashboardLayout>
    );
  }

  return (
    <LazyDashboardLayout>
      <div className="container max-w-5xl py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Bell className="h-8 w-8" />
              Notification Settings
            </h1>
            <p className="text-muted-foreground">
              Manage how and when you receive notifications
            </p>
          </div>
          
          {hasUnsavedChanges && (
            <div className="flex gap-2">
              <Button
                onClick={handleResetSettings}
                variant="outline"
                size="sm"
                disabled={isSaving}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button
                onClick={handleSaveSettings}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          )}
        </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="push">Push</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-4">
              {/* Browser Notifications Setup */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Browser Notifications
                  </CardTitle>
                  <CardDescription>
                    Enable browser notifications to receive real-time updates
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Browser Permission</div>
                      <div className="text-sm text-muted-foreground">
                        {notificationPermission === 'granted' && 'Browser notifications are enabled'}
                        {notificationPermission === 'denied' && 'Browser notifications are blocked'}
                        {notificationPermission === 'default' && 'Browser notifications not configured'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={notificationPermission === 'granted' ? 'default' : 'secondary'}>
                        {notificationPermission}
                      </Badge>
                      {notificationPermission !== 'granted' && (
                        <Button onClick={requestNotificationPermission} size="sm">
                          Enable Notifications
                        </Button>
                      )}
                      {notificationPermission === 'granted' && (
                        <Button onClick={testNotification} variant="outline" size="sm">
                          <TestTube className="h-4 w-4 mr-2" />
                          Test
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* In-App Notifications */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-5 w-5" />
                      In-App Notifications
                    </div>
                    <Button 
                      onClick={() => toggleAllInCategory('inApp', !Object.values(settings.notifications.inApp).every(Boolean))}
                      variant="outline" 
                      size="sm"
                    >
                      {Object.values(settings.notifications.inApp).every(Boolean) ? 'Disable All' : 'Enable All'}
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Notifications shown within the application
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {inAppNotifications.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.key} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-3 flex-1">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <div className="space-y-0.5 flex-1">
                              <div className="font-medium">{item.label}</div>
                              <p className="text-sm text-muted-foreground">{item.description}</p>
                            </div>
                          </div>
                          <Switch
                            checked={settings.notifications.inApp[item.key as keyof typeof settings.notifications.inApp] ?? false}
                            onCheckedChange={(checked) => handleToggleSetting('inApp', item.key, checked)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Email Tab */}
            <TabsContent value="email" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Email Notifications
                    </div>
                    <Button 
                      onClick={() => toggleAllInCategory('email', !Object.values(settings.notifications.email).every(Boolean))}
                      variant="outline" 
                      size="sm"
                    >
                      {Object.values(settings.notifications.email).every(Boolean) ? 'Disable All' : 'Enable All'}
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Receive notifications via email
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {emailNotifications.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.key} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-3 flex-1">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <div className="space-y-0.5 flex-1">
                              <div className="font-medium">{item.label}</div>
                              <p className="text-sm text-muted-foreground">{item.description}</p>
                            </div>
                          </div>
                          <Switch
                            checked={settings.notifications.email[item.key as keyof typeof settings.notifications.email] ?? false}
                            onCheckedChange={(checked) => handleToggleSetting('email', item.key, checked)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Push Tab */}
            <TabsContent value="push" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-5 w-5" />
                      Push Notifications
                    </div>
                    <Button 
                      onClick={() => toggleAllInCategory('push', !Object.values(settings.notifications.push).every(Boolean))}
                      variant="outline" 
                      size="sm"
                    >
                      {Object.values(settings.notifications.push).every(Boolean) ? 'Disable All' : 'Enable All'}
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Real-time notifications to your devices
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {pushNotifications.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.key} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-3 flex-1">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <div className="space-y-0.5 flex-1">
                              <div className="font-medium">{item.label}</div>
                              <p className="text-sm text-muted-foreground">{item.description}</p>
                            </div>
                          </div>
                          <Switch
                            checked={settings.notifications.push[item.key as keyof typeof settings.notifications.push] ?? false}
                            onCheckedChange={(checked) => handleToggleSetting('push', item.key, checked)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences" className="space-y-4">
              {/* Sound Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Volume2 className="h-5 w-5" />
                    Sound Settings
                  </CardTitle>
                  <CardDescription>
                    Configure notification sound preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">Enable notification sounds</span>
                      <p className="text-sm text-muted-foreground">Play sounds when notifications are received</p>
                    </div>
                    <Switch
                      checked={settings.notifications.soundEnabled}
                      onCheckedChange={async (checked) => {
                        try {
                          await updateSettings("notifications", {
                            ...settings.notifications,
                            soundEnabled: checked
                          });
                          toast.success(`Notification sounds ${checked ? 'enabled' : 'disabled'}`);
                        } catch (error) {
                          toast.error("Failed to update sound settings");
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
      </div>
    </LazyDashboardLayout>
  );
} 