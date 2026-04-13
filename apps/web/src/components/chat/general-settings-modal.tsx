// @epic-3.1-messaging: General Chat Settings Modal
// @persona-sarah: PM needs to manage chat preferences and notifications
// @persona-david: Team lead needs to configure messaging settings

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Settings,
  Bell,
  MessageSquare,
  Palette,
  Volume2,
  X,
  Save,
  Check,
  RotateCcw,
  Play,
  Search,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { toast } from 'sonner'

interface GeneralSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function GeneralSettingsModal({
  isOpen,
  onClose,
}: GeneralSettingsModalProps) {
  const [activeTab, setActiveTab] = useState('notifications')
  
  // 🔴 PHASE 1: Critical state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  
  // 🟡 PHASE 3: Search state
  const [searchQuery, setSearchQuery] = useState('')
  
  // Notification settings
  const [desktopNotifications, setDesktopNotifications] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [notificationSound, setNotificationSound] = useState('default')
  const [mentionNotifications, setMentionNotifications] = useState(true)
  const [directMessageNotifications, setDirectMessageNotifications] = useState(true)
  const [channelNotifications, setChannelNotifications] = useState(false)
  
  // Appearance settings
  const [messagePreview, setMessagePreview] = useState(true)
  const [showAvatars, setShowAvatars] = useState(true)
  const [compactMode, setCompactMode] = useState(false)
  const [emojiStyle, setEmojiStyle] = useState('native')
  
  // Messaging settings
  const [enterToSend, setEnterToSend] = useState(true)
  const [typingIndicators, setTypingIndicators] = useState(true)
  const [readReceipts, setReadReceipts] = useState(true)
  const [autoDownload, setAutoDownload] = useState(false)

  // 🔴 PHASE 1: Load saved settings on mount
  useEffect(() => {
    if (!isOpen) return;
    
    try {
      const saved = localStorage.getItem('chatSettings');
      if (saved) {
        const settings = JSON.parse(saved);
        
        // Load notification settings
        setDesktopNotifications(settings.notifications?.desktop ?? true);
        setSoundEnabled(settings.notifications?.sound ?? true);
        setNotificationSound(settings.notifications?.soundType ?? 'default');
        setMentionNotifications(settings.notifications?.mentions ?? true);
        setDirectMessageNotifications(settings.notifications?.directMessages ?? true);
        setChannelNotifications(settings.notifications?.channels ?? false);
        
        // Load appearance settings
        setMessagePreview(settings.appearance?.messagePreview ?? true);
        setShowAvatars(settings.appearance?.showAvatars ?? true);
        setCompactMode(settings.appearance?.compactMode ?? false);
        setEmojiStyle(settings.appearance?.emojiStyle ?? 'native');
        
        // Load messaging settings
        setEnterToSend(settings.messaging?.enterToSend ?? true);
        setTypingIndicators(settings.messaging?.typingIndicators ?? true);
        setReadReceipts(settings.messaging?.readReceipts ?? true);
        setAutoDownload(settings.messaging?.autoDownload ?? false);
      }
      
      setHasUnsavedChanges(false);
      setInitialLoadDone(true);
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load saved settings');
      setInitialLoadDone(true);
    }
  }, [isOpen]);

  // 🔴 PHASE 1: Track unsaved changes
  useEffect(() => {
    if (!initialLoadDone) return; // Don't mark as changed during initial load
    setHasUnsavedChanges(true);
  }, [
    desktopNotifications,
    soundEnabled,
    notificationSound,
    mentionNotifications,
    directMessageNotifications,
    channelNotifications,
    messagePreview,
    showAvatars,
    compactMode,
    emojiStyle,
    enterToSend,
    typingIndicators,
    readReceipts,
    autoDownload,
    initialLoadDone,
  ]);

  // 🔴 PHASE 1: Handle close with unsaved changes warning
  const handleClose = () => {
    if (hasUnsavedChanges) {
      setShowDiscardDialog(true);
    } else {
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardDialog(false);
    setHasUnsavedChanges(false);
    setInitialLoadDone(false);
    onClose();
  };

  // 🔴 PHASE 1 & 3: Improved save with error handling
  const handleSave = async () => {
    setIsLoading(true);
    try {
      const settings = {
        notifications: {
          desktop: desktopNotifications,
          sound: soundEnabled,
          soundType: notificationSound,
          mentions: mentionNotifications,
          directMessages: directMessageNotifications,
          channels: channelNotifications,
        },
        appearance: {
          messagePreview,
          showAvatars,
          compactMode,
          emojiStyle,
        },
        messaging: {
          enterToSend,
          typingIndicators,
          readReceipts,
          autoDownload,
        },
      };

      localStorage.setItem('chatSettings', JSON.stringify(settings));
      toast.success('Settings saved successfully');
      setHasUnsavedChanges(false);
      setInitialLoadDone(false);
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 🔴 PHASE 1: Reset to defaults
  const handleReset = () => {
    if (confirm('Reset all settings to defaults? This cannot be undone.')) {
      setDesktopNotifications(true);
      setSoundEnabled(true);
      setNotificationSound('default');
      setMentionNotifications(true);
      setDirectMessageNotifications(true);
      setChannelNotifications(false);
      
      setMessagePreview(true);
      setShowAvatars(true);
      setCompactMode(false);
      setEmojiStyle('native');
      
      setEnterToSend(true);
      setTypingIndicators(true);
      setReadReceipts(true);
      setAutoDownload(false);
      
      localStorage.removeItem('chatSettings');
      toast.success('Settings reset to defaults');
      setHasUnsavedChanges(true);
    }
  };

  // 🟠 PHASE 2: Handle desktop notification permissions
  const handleDesktopNotificationToggle = async (checked: boolean) => {
    if (checked && typeof Notification !== 'undefined') {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission === 'denied') {
          toast.error('Notification permissions denied. Enable in browser settings.');
          return;
        }
      } else if (Notification.permission === 'denied') {
        toast.error('Notifications are blocked. Enable in browser settings.');
        return;
      }
    }
    setDesktopNotifications(checked);
  };

  // 🟠 PHASE 2: Sound preview
  const playSound = (soundType: string) => {
    try {
      // Use a beep sound as placeholder
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Different frequencies for different sounds
      const frequencies: Record<string, number> = {
        default: 800,
        chime: 1000,
        bell: 1200,
        ding: 600
      };
      
      oscillator.frequency.value = frequencies[soundType] || 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      
      toast.success(`Playing ${soundType} sound`);
    } catch (error) {
      console.error('Could not play sound:', error);
      toast.error('Could not play sound preview');
    }
  };

  // 🟡 PHASE 3: Setting presets
  const presets = {
    focused: {
      desktop: true,
      sound: false,
      mentions: true,
      directMessages: true,
      channels: false,
    },
    balanced: {
      desktop: true,
      sound: true,
      mentions: true,
      directMessages: true,
      channels: false,
    },
    all: {
      desktop: true,
      sound: true,
      mentions: true,
      directMessages: true,
      channels: true,
    },
  };

  const applyPreset = (preset: keyof typeof presets) => {
    const config = presets[preset];
    setDesktopNotifications(config.desktop);
    setSoundEnabled(config.sound);
    setMentionNotifications(config.mentions);
    setDirectMessageNotifications(config.directMessages);
    setChannelNotifications(config.channels);
    toast.success(`Applied ${preset} preset`);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Chat Settings
              {hasUnsavedChanges && (
                <Badge variant="secondary" className="text-xs">
                  Unsaved changes
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Manage your chat preferences and notification settings
            </DialogDescription>
          </DialogHeader>

          {/* 🟡 PHASE 3: Search bar */}
          <div className="px-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* 🟡 PHASE 3: Preset buttons */}
          <div className="flex gap-2 px-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset('focused')}
              className="flex-1"
            >
              <AlertCircle className="w-3 h-3 mr-1" />
              Focused
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset('balanced')}
              className="flex-1"
            >
              <Bell className="w-3 h-3 mr-1" />
              Balanced
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset('all')}
              className="flex-1"
            >
              <Volume2 className="w-3 h-3 mr-1" />
              All
            </Button>
          </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="w-4 h-4" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="messaging" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Messaging
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 mt-4">
            {/* Notifications Tab */}
            <TabsContent value="notifications" className="h-full m-0">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="desktop-notifications">Desktop Notifications</Label>
                      <div className="text-sm text-muted-foreground">
                        Show desktop notifications for new messages
                        {typeof Notification !== 'undefined' && Notification.permission === 'denied' && (
                          <span className="text-red-500 ml-1">(Blocked in browser)</span>
                        )}
                      </div>
                    </div>
                    <Switch
                      id="desktop-notifications"
                      checked={desktopNotifications}
                      onCheckedChange={handleDesktopNotificationToggle}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="sound">Sound</Label>
                      <div className="text-sm text-muted-foreground">
                        Play a sound when you receive a message
                      </div>
                    </div>
                    <Switch
                      id="sound"
                      checked={soundEnabled}
                      onCheckedChange={setSoundEnabled}
                    />
                  </div>

                  {soundEnabled && (
                    <div className="space-y-2 ml-4">
                      <Label htmlFor="notification-sound">Notification Sound</Label>
                      <div className="flex items-center gap-2">
                        <Select value={notificationSound} onValueChange={setNotificationSound}>
                          <SelectTrigger id="notification-sound">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Default</SelectItem>
                            <SelectItem value="chime">Chime</SelectItem>
                            <SelectItem value="bell">Bell</SelectItem>
                            <SelectItem value="ding">Ding</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => playSound(notificationSound)}
                          title="Preview sound"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Notify me about...</h4>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="mention-notifications">@Mentions</Label>
                        <div className="text-sm text-muted-foreground">
                          When someone mentions you in a message
                        </div>
                      </div>
                      <Switch
                        id="mention-notifications"
                        checked={mentionNotifications}
                        onCheckedChange={setMentionNotifications}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="dm-notifications">Direct Messages</Label>
                        <div className="text-sm text-muted-foreground">
                          All direct messages you receive
                        </div>
                      </div>
                      <Switch
                        id="dm-notifications"
                        checked={directMessageNotifications}
                        onCheckedChange={setDirectMessageNotifications}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="channel-notifications">All Channel Messages</Label>
                        <div className="text-sm text-muted-foreground">
                          Every message posted in channels you're in
                        </div>
                      </div>
                      <Switch
                        id="channel-notifications"
                        checked={channelNotifications}
                        onCheckedChange={setChannelNotifications}
                      />
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="h-full m-0">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="message-preview">Message Preview</Label>
                      <div className="text-sm text-muted-foreground">
                        Show message preview in notifications
                      </div>
                    </div>
                    <Switch
                      id="message-preview"
                      checked={messagePreview}
                      onCheckedChange={setMessagePreview}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="show-avatars">Show Avatars</Label>
                      <div className="text-sm text-muted-foreground">
                        Display user avatars next to messages
                      </div>
                    </div>
                    <Switch
                      id="show-avatars"
                      checked={showAvatars}
                      onCheckedChange={setShowAvatars}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="compact-mode">Compact Mode</Label>
                      <div className="text-sm text-muted-foreground">
                        Show more messages on screen with reduced spacing
                      </div>
                    </div>
                    <Switch
                      id="compact-mode"
                      checked={compactMode}
                      onCheckedChange={setCompactMode}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="emoji-style">Emoji Style</Label>
                    <Select value={emojiStyle} onValueChange={setEmojiStyle}>
                      <SelectTrigger id="emoji-style">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="native">Native System Emojis</SelectItem>
                        <SelectItem value="twitter">Twitter Emojis</SelectItem>
                        <SelectItem value="apple">Apple Emojis</SelectItem>
                        <SelectItem value="google">Google Emojis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Messaging Tab */}
            <TabsContent value="messaging" className="h-full m-0">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="enter-to-send">Enter to Send</Label>
                      <div className="text-sm text-muted-foreground">
                        Press Enter to send messages (Shift+Enter for new line)
                      </div>
                    </div>
                    <Switch
                      id="enter-to-send"
                      checked={enterToSend}
                      onCheckedChange={setEnterToSend}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="typing-indicators">Typing Indicators</Label>
                      <div className="text-sm text-muted-foreground">
                        Show when others are typing
                      </div>
                    </div>
                    <Switch
                      id="typing-indicators"
                      checked={typingIndicators}
                      onCheckedChange={setTypingIndicators}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="read-receipts">Read Receipts</Label>
                      <div className="text-sm text-muted-foreground">
                        Let others know when you've read their messages
                      </div>
                    </div>
                    <Switch
                      id="read-receipts"
                      checked={readReceipts}
                      onCheckedChange={setReadReceipts}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="auto-download">Auto-download Files</Label>
                      <div className="text-sm text-muted-foreground">
                        Automatically download images and files
                      </div>
                    </div>
                    <Switch
                      id="auto-download"
                      checked={autoDownload}
                      onCheckedChange={setAutoDownload}
                    />
                  </div>

                  <Separator />

                  <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                    <div className="flex gap-2">
                      <div className="flex-shrink-0">
                        <Check className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-blue-900 dark:text-blue-100 mb-1">
                          Keyboard Shortcuts
                        </h4>
                        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                          <li>• <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border rounded text-xs">Ctrl+K</kbd> - Search messages</li>
                          <li>• <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border rounded text-xs">Ctrl+B</kbd> - Toggle sidebar</li>
                          <li>• <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border rounded text-xs">Ctrl+I</kbd> - Toggle profile</li>
                          <li>• <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border rounded text-xs">Esc</kbd> - Close panels</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="ghost"
            onClick={handleReset}
            disabled={isLoading}
            className="text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isLoading || !hasUnsavedChanges}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isLoading ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* 🔴 PHASE 1: Discard changes confirmation dialog */}
    <Dialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unsaved Changes</DialogTitle>
          <DialogDescription>
            You have unsaved changes. Are you sure you want to discard them?
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setShowDiscardDialog(false)}>
            Keep Editing
          </Button>
          <Button variant="destructive" onClick={handleConfirmDiscard}>
            Discard Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </>
  )
}

