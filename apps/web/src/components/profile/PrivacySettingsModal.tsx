/**
 * Privacy Settings Modal
 * Allows users to control profile visibility and privacy preferences
 */
"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Eye, EyeOff, Mail, MessageSquare, Globe, Lock, User, Users, Building } from 'lucide-react';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

interface PrivacySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentSettings?: PrivacySettings;
  onSave?: (settings: PrivacySettings) => Promise<void>;
}

export interface PrivacySettings {
  // Profile Visibility
  isPublic: boolean;
  showEmail: boolean;
  showPhone: boolean;
  showLocation: boolean;
  showBio: boolean;
  
  // Communication
  allowDirectMessages: boolean;
  allowGroupInvites: boolean;
  allowMentions: boolean;
  
  // Presence & Status
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  showTypingIndicator: boolean;
  
  // Activity & Analytics
  showActivityStatus: boolean;
  allowProfileViews: boolean;
  showWorkspaceHistory: boolean;
  
  // Search & Discovery
  searchableInDirectory: boolean;
  showInTeamDirectory: boolean;
  allowConnectionRequests: boolean;
}

const defaultSettings: PrivacySettings = {
  isPublic: true,
  showEmail: false,
  showPhone: false,
  showLocation: true,
  showBio: true,
  allowDirectMessages: true,
  allowGroupInvites: true,
  allowMentions: true,
  showOnlineStatus: true,
  showLastSeen: true,
  showTypingIndicator: true,
  showActivityStatus: true,
  allowProfileViews: true,
  showWorkspaceHistory: true,
  searchableInDirectory: true,
  showInTeamDirectory: true,
  allowConnectionRequests: true,
};

export function PrivacySettingsModal({ 
  isOpen, 
  onClose, 
  userId,
  currentSettings,
  onSave 
}: PrivacySettingsModalProps) {
  const [settings, setSettings] = useState<PrivacySettings>(
    currentSettings || defaultSettings
  );
  const [isSaving, setIsSaving] = useState(false);

  const updateSetting = (key: keyof PrivacySettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(settings);
      } else {
        // TODO: Call API to save privacy settings
        // await updatePrivacySettings(userId, settings);
      }
      toast.success('Privacy settings updated successfully!');
      onClose();
    } catch (error) {
      console.error('Failed to save privacy settings:', error);
      toast.error('Failed to update privacy settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    const confirmed = window.confirm(
      'Reset all privacy settings to default values?'
    );
    if (confirmed) {
      setSettings(defaultSettings);
      toast.info('Privacy settings reset to defaults');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        aria-labelledby="privacy-settings-title"
        aria-describedby="privacy-settings-description"
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
            <DialogTitle id="privacy-settings-title">Privacy Settings</DialogTitle>
          </div>
          <DialogDescription id="privacy-settings-description">
            Control who can see your information and how others can interact with you
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Profile Visibility */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Profile Visibility
              </CardTitle>
              <CardDescription>
                Control what information is visible to others
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isPublic" className="text-base">
                    Public Profile
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Make your profile visible to all workspace members
                  </p>
                </div>
                <Switch
                  id="isPublic"
                  checked={settings.isPublic}
                  onCheckedChange={(checked) => updateSetting('isPublic', checked)}
                  aria-label="Toggle public profile visibility"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="showEmail" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Show Email Address
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Display your email on your public profile
                  </p>
                </div>
                <Switch
                  id="showEmail"
                  checked={settings.showEmail}
                  onCheckedChange={(checked) => updateSetting('showEmail', checked)}
                  disabled={!settings.isPublic}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="showPhone">Show Phone Number</Label>
                  <p className="text-sm text-muted-foreground">
                    Display your phone number on your profile
                  </p>
                </div>
                <Switch
                  id="showPhone"
                  checked={settings.showPhone}
                  onCheckedChange={(checked) => updateSetting('showPhone', checked)}
                  disabled={!settings.isPublic}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="showLocation">Show Location</Label>
                  <p className="text-sm text-muted-foreground">
                    Display your location information
                  </p>
                </div>
                <Switch
                  id="showLocation"
                  checked={settings.showLocation}
                  onCheckedChange={(checked) => updateSetting('showLocation', checked)}
                  disabled={!settings.isPublic}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="showBio">Show Bio</Label>
                  <p className="text-sm text-muted-foreground">
                    Display your bio on your profile
                  </p>
                </div>
                <Switch
                  id="showBio"
                  checked={settings.showBio}
                  onCheckedChange={(checked) => updateSetting('showBio', checked)}
                  disabled={!settings.isPublic}
                />
              </div>
            </CardContent>
          </Card>

          {/* Communication Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Communication Preferences
              </CardTitle>
              <CardDescription>
                Manage how others can communicate with you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="allowDirectMessages">Allow Direct Messages</Label>
                  <p className="text-sm text-muted-foreground">
                    Let others send you direct messages
                  </p>
                </div>
                <Switch
                  id="allowDirectMessages"
                  checked={settings.allowDirectMessages}
                  onCheckedChange={(checked) => updateSetting('allowDirectMessages', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="allowGroupInvites">Allow Group Invites</Label>
                  <p className="text-sm text-muted-foreground">
                    Let others invite you to group conversations
                  </p>
                </div>
                <Switch
                  id="allowGroupInvites"
                  checked={settings.allowGroupInvites}
                  onCheckedChange={(checked) => updateSetting('allowGroupInvites', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="allowMentions">Allow Mentions</Label>
                  <p className="text-sm text-muted-foreground">
                    Let others mention you in conversations
                  </p>
                </div>
                <Switch
                  id="allowMentions"
                  checked={settings.allowMentions}
                  onCheckedChange={(checked) => updateSetting('allowMentions', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Presence & Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Presence & Status
              </CardTitle>
              <CardDescription>
                Control your online presence visibility
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="showOnlineStatus">Show Online Status</Label>
                  <p className="text-sm text-muted-foreground">
                    Let others see when you're online
                  </p>
                </div>
                <Switch
                  id="showOnlineStatus"
                  checked={settings.showOnlineStatus}
                  onCheckedChange={(checked) => updateSetting('showOnlineStatus', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="showLastSeen">Show Last Seen</Label>
                  <p className="text-sm text-muted-foreground">
                    Display when you were last active
                  </p>
                </div>
                <Switch
                  id="showLastSeen"
                  checked={settings.showLastSeen}
                  onCheckedChange={(checked) => updateSetting('showLastSeen', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="showTypingIndicator">Show Typing Indicator</Label>
                  <p className="text-sm text-muted-foreground">
                    Let others see when you're typing
                  </p>
                </div>
                <Switch
                  id="showTypingIndicator"
                  checked={settings.showTypingIndicator}
                  onCheckedChange={(checked) => updateSetting('showTypingIndicator', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="showActivityStatus">Show Activity Status</Label>
                  <p className="text-sm text-muted-foreground">
                    Display your current activity (e.g., "Working on Project X")
                  </p>
                </div>
                <Switch
                  id="showActivityStatus"
                  checked={settings.showActivityStatus}
                  onCheckedChange={(checked) => updateSetting('showActivityStatus', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Discovery & Directory */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Search & Discovery
              </CardTitle>
              <CardDescription>
                Control how others can find and connect with you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="searchableInDirectory">Searchable in Directory</Label>
                  <p className="text-sm text-muted-foreground">
                    Appear in workspace member search results
                  </p>
                </div>
                <Switch
                  id="searchableInDirectory"
                  checked={settings.searchableInDirectory}
                  onCheckedChange={(checked) => updateSetting('searchableInDirectory', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="showInTeamDirectory">Show in Team Directory</Label>
                  <p className="text-sm text-muted-foreground">
                    Display your profile in team member listings
                  </p>
                </div>
                <Switch
                  id="showInTeamDirectory"
                  checked={settings.showInTeamDirectory}
                  onCheckedChange={(checked) => updateSetting('showInTeamDirectory', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="allowConnectionRequests">Allow Connection Requests</Label>
                  <p className="text-sm text-muted-foreground">
                    Let others send you connection requests
                  </p>
                </div>
                <Switch
                  id="allowConnectionRequests"
                  checked={settings.allowConnectionRequests}
                  onCheckedChange={(checked) => updateSetting('allowConnectionRequests', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="allowProfileViews">Allow Profile Views</Label>
                  <p className="text-sm text-muted-foreground">
                    Let others view your full profile details
                  </p>
                </div>
                <Switch
                  id="allowProfileViews"
                  checked={settings.allowProfileViews}
                  onCheckedChange={(checked) => updateSetting('allowProfileViews', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="showWorkspaceHistory">Show Workspace History</Label>
                  <p className="text-sm text-muted-foreground">
                    Display your project and task history
                  </p>
                </div>
                <Switch
                  id="showWorkspaceHistory"
                  checked={settings.showWorkspaceHistory}
                  onCheckedChange={(checked) => updateSetting('showWorkspaceHistory', checked)}
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
 * Hook to manage privacy settings
 */
export function usePrivacySettings(userId: string) {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<PrivacySettings>(defaultSettings);

  const openSettings = () => setIsOpen(true);
  const closeSettings = () => setIsOpen(false);

  const saveSettings = async (newSettings: PrivacySettings) => {
    // TODO: Implement API call
    // await updatePrivacySettings(userId, newSettings);
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

