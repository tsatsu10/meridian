// Notification Preferences Modal
import React from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Bell,
  Volume2,
  Monitor,
  MessageSquare,
  AtSign,
  CheckSquare,
  Zap,
  AlertTriangle,
  FileText,
} from 'lucide-react'
import { useRealTimeNotifications, NotificationPreferences } from '@/hooks/use-real-time-notifications'

interface NotificationPreferencesModalProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationPreferencesModal({ isOpen, onClose }: NotificationPreferencesModalProps) {
  const { preferences, updatePreferences, createDemoNotifications } = useRealTimeNotifications()

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean) => {
    updatePreferences({ [key]: value })
  }

  const testNotifications = () => {
    createDemoNotifications()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Preferences
          </DialogTitle>
          <DialogDescription>
            Customize how and when you receive notifications
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="w-4 h-4" />
                General Settings
              </CardTitle>
              <CardDescription>
                Control how notifications are delivered
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-4 h-4 text-gray-500" />
                  <div>
                    <Label htmlFor="sound">Sound Notifications</Label>
                    <p className="text-sm text-gray-500">Play a sound when you receive notifications</p>
                  </div>
                </div>
                <Switch
                  id="sound"
                  checked={preferences.soundEnabled}
                  onCheckedChange={(checked) => handlePreferenceChange('soundEnabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Monitor className="w-4 h-4 text-gray-500" />
                  <div>
                    <Label htmlFor="desktop">Desktop Notifications</Label>
                    <p className="text-sm text-gray-500">Show notifications in your browser or desktop</p>
                  </div>
                </div>
                <Switch
                  id="desktop"
                  checked={preferences.desktopEnabled}
                  onCheckedChange={(checked) => handlePreferenceChange('desktopEnabled', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Types */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notification Types</CardTitle>
              <CardDescription>
                Choose which types of notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AtSign className="w-4 h-4 text-blue-500" />
                  <div>
                    <Label htmlFor="mentions">Mentions</Label>
                    <p className="text-sm text-gray-500">When someone mentions you in a message</p>
                  </div>
                </div>
                <Switch
                  id="mentions"
                  checked={preferences.mentions}
                  onCheckedChange={(checked) => handlePreferenceChange('mentions', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4 text-green-500" />
                  <div>
                    <Label htmlFor="directMessages">Direct Messages</Label>
                    <p className="text-sm text-gray-500">When you receive a direct message</p>
                  </div>
                </div>
                <Switch
                  id="directMessages"
                  checked={preferences.directMessages}
                  onCheckedChange={(checked) => handlePreferenceChange('directMessages', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckSquare className="w-4 h-4 text-purple-500" />
                  <div>
                    <Label htmlFor="taskUpdates">Task Updates</Label>
                    <p className="text-sm text-gray-500">When tasks are created, updated, or assigned to you</p>
                  </div>
                </div>
                <Switch
                  id="taskUpdates"
                  checked={preferences.taskUpdates}
                  onCheckedChange={(checked) => handlePreferenceChange('taskUpdates', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <div>
                    <Label htmlFor="workflowTriggers">Workflow Automation</Label>
                    <p className="text-sm text-gray-500">When AI creates tasks or suggests actions from your messages</p>
                  </div>
                </div>
                <Switch
                  id="workflowTriggers"
                  checked={preferences.workflowTriggers}
                  onCheckedChange={(checked) => handlePreferenceChange('workflowTriggers', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  <div>
                    <Label htmlFor="fileSharing">File Sharing</Label>
                    <p className="text-sm text-gray-500">When files are shared with you or in your channels</p>
                  </div>
                </div>
                <Switch
                  id="fileSharing"
                  checked={preferences.fileSharing}
                  onCheckedChange={(checked) => handlePreferenceChange('fileSharing', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <div>
                    <Label htmlFor="systemAlerts">System Alerts</Label>
                    <p className="text-sm text-gray-500">Important system messages and maintenance notifications</p>
                  </div>
                </div>
                <Switch
                  id="systemAlerts"
                  checked={preferences.systemAlerts}
                  onCheckedChange={(checked) => handlePreferenceChange('systemAlerts', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Test Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Test Notifications</CardTitle>
              <CardDescription>
                Test your notification settings with sample notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={testNotifications}
                className="w-full"
                variant="outline"
              >
                <Bell className="w-4 h-4 mr-2" />
                Send Test Notifications
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}