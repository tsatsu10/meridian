/**
 * Notification Settings Modal
 * Per-chat/per-user notification preferences
 */
"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, Volume2, VolumeX, Smartphone, Mail, MessageSquare, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId?: string | null;
  chatName?: string;
  currentSettings?: NotificationSettings;
  onSave?: (settings: NotificationSettings) => Promise<void>;
}

export interface NotificationSettings {
  // General
  enabled: boolean;
  muteUntil?: Date | null;
  
  // Notification Types
  allMessages: boolean;
  mentionsOnly: boolean;
  directMessagesOnly: boolean;
  
  // Delivery Methods
  push: boolean;
  email: boolean;
  inApp: boolean;
  
  // Sound & Alerts
  sound: boolean;
  soundType: 'default' | 'subtle' | 'loud' | 'custom';
  vibrate: boolean;
  desktopNotification: boolean;
  
  // Smart Notifications
  smartDigest: boolean; // Group notifications into digest
  quietHours: boolean;
  quietHoursStart?: string; // "22:00"
  quietHoursEnd?: string; // "08:00"
  
  // Message Preview
  showPreview: boolean;
  showSender: boolean;
}

const defaultSettings: NotificationSettings = {
  enabled: true,
  muteUntil: null,
  allMessages: true,
  mentionsOnly: false,
  directMessagesOnly: false,
  push: true,
  email: false,
  inApp: true,
  sound: true,
  soundType: 'default',
  vibrate: true,
  desktopNotification: true,
  smartDigest: false,
  quietHours: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  showPreview: true,
  showSender: true,
};

export function NotificationSettingsModal({ 
  isOpen, 
  onClose, 
  chatId,
  chatName,
  currentSettings,
  onSave 
}: NotificationSettingsModalProps) {
  const [settings, setSettings] = useState<NotificationSettings>(
    currentSettings || defaultSettings
  );
  const [isSaving, setIsSaving] = useState(false);

  const updateSetting = <K extends keyof NotificationSettings>(
    key: K, 
    value: NotificationSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(settings);
      } else {
        // TODO: Call API to save notification settings
        // await updateNotificationSettings(chatId, settings);
      }
      toast.success(
        chatName 
          ? `Notification settings updated for ${chatName}` 
          : 'Notification settings updated successfully!'
      );
      onClose();
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      toast.error('Failed to update notification settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMuteFor = (hours: number) => {
    const muteUntil = new Date();
    muteUntil.setHours(muteUntil.getHours() + hours);
    updateSetting('muteUntil', muteUntil);
    updateSetting('enabled', false);
    toast.success(`Notifications muted for ${hours} hours`);
  };

  const handleUnmute = () => {
    updateSetting('muteUntil', null);
    updateSetting('enabled', true);
    toast.success('Notifications unmuted');
  };

  const handleReset = () => {
    const confirmed = window.confirm(
      'Reset notification settings to default values?'
    );
    if (confirmed) {
      setSettings(defaultSettings);
      toast.info('Notification settings reset to defaults');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        aria-labelledby="notification-settings-title"
        aria-describedby="notification-settings-description"
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" aria-hidden="true" />
            <DialogTitle id="notification-settings-title">Notification Settings</DialogTitle>
          </div>
          <DialogDescription id="notification-settings-description">
            {chatName 
              ? `Customize notifications for ${chatName}` 
              : 'Manage your notification preferences'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Quick Mute Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BellOff className="h-4 w-4" />
                Quick Mute
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleMuteFor(1)}
                  disabled={!settings.enabled}
                >
                  Mute 1 hour
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleMuteFor(8)}
                  disabled={!settings.enabled}
                >
                  Mute 8 hours
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleMuteFor(24)}
                  disabled={!settings.enabled}
                >
                  Mute 24 hours
                </Button>
                {!settings.enabled && settings.muteUntil && (
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={handleUnmute}
                  >
                    Unmute
                  </Button>
                )}
              </div>
              {settings.muteUntil && (
                <p className="text-sm text-muted-foreground mt-2">
                  Muted until {settings.muteUntil.toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Notification Types */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Notification Types
              </CardTitle>
              <CardDescription>
                Choose which messages trigger notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup 
                value={
                  settings.allMessages ? 'all' :
                  settings.mentionsOnly ? 'mentions' :
                  settings.directMessagesOnly ? 'direct' : 'all'
                }
                onValueChange={(value) => {
                  updateSetting('allMessages', value === 'all');
                  updateSetting('mentionsOnly', value === 'mentions');
                  updateSetting('directMessagesOnly', value === 'direct');
                }}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="font-normal cursor-pointer">
                    All messages
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="mentions" id="mentions" />
                  <Label htmlFor="mentions" className="font-normal cursor-pointer">
                    Only mentions (@you)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="direct" id="direct" />
                  <Label htmlFor="direct" className="font-normal cursor-pointer">
                    Only direct messages
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Delivery Methods */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Delivery Methods
              </CardTitle>
              <CardDescription>
                Choose how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="push" className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Push Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications on your device
                  </p>
                </div>
                <Switch
                  id="push"
                  checked={settings.push}
                  onCheckedChange={(checked) => updateSetting('push', checked)}
                  disabled={!settings.enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Get notifications via email
                  </p>
                </div>
                <Switch
                  id="email"
                  checked={settings.email}
                  onCheckedChange={(checked) => updateSetting('email', checked)}
                  disabled={!settings.enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="inApp">In-App Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Show notifications within the application
                  </p>
                </div>
                <Switch
                  id="inApp"
                  checked={settings.inApp}
                  onCheckedChange={(checked) => updateSetting('inApp', checked)}
                  disabled={!settings.enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="desktopNotification">Desktop Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Show system notifications on desktop
                  </p>
                </div>
                <Switch
                  id="desktopNotification"
                  checked={settings.desktopNotification}
                  onCheckedChange={(checked) => updateSetting('desktopNotification', checked)}
                  disabled={!settings.enabled}
                />
              </div>
            </CardContent>
          </Card>

          {/* Sound & Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                Sound & Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="sound">Notification Sound</Label>
                  <p className="text-sm text-muted-foreground">
                    Play sound for new notifications
                  </p>
                </div>
                <Switch
                  id="sound"
                  checked={settings.sound}
                  onCheckedChange={(checked) => updateSetting('sound', checked)}
                  disabled={!settings.enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="vibrate">Vibration</Label>
                  <p className="text-sm text-muted-foreground">
                    Vibrate on new notifications (mobile)
                  </p>
                </div>
                <Switch
                  id="vibrate"
                  checked={settings.vibrate}
                  onCheckedChange={(checked) => updateSetting('vibrate', checked)}
                  disabled={!settings.enabled || !settings.push}
                />
              </div>
            </CardContent>
          </Card>

          {/* Smart Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Smart Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="quietHours">Quiet Hours</Label>
                  <p className="text-sm text-muted-foreground">
                    Silence notifications during specified hours
                  </p>
                </div>
                <Switch
                  id="quietHours"
                  checked={settings.quietHours}
                  onCheckedChange={(checked) => updateSetting('quietHours', checked)}
                />
              </div>

              {settings.quietHours && (
                <div className="grid grid-cols-2 gap-4 pl-6">
                  <div className="space-y-2">
                    <Label htmlFor="quietStart" className="text-sm">Start Time</Label>
                    <input
                      id="quietStart"
                      type="time"
                      value={settings.quietHoursStart}
                      onChange={(e) => updateSetting('quietHoursStart', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quietEnd" className="text-sm">End Time</Label>
                    <input
                      id="quietEnd"
                      type="time"
                      value={settings.quietHoursEnd}
                      onChange={(e) => updateSetting('quietHoursEnd', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="smartDigest">Smart Digest</Label>
                  <p className="text-sm text-muted-foreground">
                    Group multiple notifications into a single digest
                  </p>
                </div>
                <Switch
                  id="smartDigest"
                  checked={settings.smartDigest}
                  onCheckedChange={(checked) => updateSetting('smartDigest', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="showPreview">Show Message Preview</Label>
                  <p className="text-sm text-muted-foreground">
                    Display message content in notifications
                  </p>
                </div>
                <Switch
                  id="showPreview"
                  checked={settings.showPreview}
                  onCheckedChange={(checked) => updateSetting('showPreview', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="showSender">Show Sender Name</Label>
                  <p className="text-sm text-muted-foreground">
                    Display who sent the message
                  </p>
                </div>
                <Switch
                  id="showSender"
                  checked={settings.showSender}
                  onCheckedChange={(checked) => updateSetting('showSender', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleReset} disabled={isSaving}>
            Reset to Defaults
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to manage notification settings
 */
export function useNotificationSettings(chatId?: string | null) {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);

  const openSettings = () => setIsOpen(true);
  const closeSettings = () => setIsOpen(false);

  const saveSettings = async (newSettings: NotificationSettings) => {
    // TODO: Implement API call
    // await updateNotificationSettings(chatId, newSettings);
    setSettings(newSettings);
  };

  return {
    isOpen,
    settings,
    openSettings,
    closeSettings,
    saveSettings,
  };
}

