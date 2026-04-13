// @epic-3.5-communication: Notification preferences customization
// @persona-sarah: PM wants to customize notification behavior
// @persona-jennifer: Exec wants priority-focused notifications
// @persona-david: Team lead wants team-specific notification settings

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  Bell,
  Volume2,
  RefreshCw,
  Eye,
  Filter,
  ArrowUpDown,
  Layers,
  Save,
  RotateCcw,
} from "lucide-react";

export interface NotificationPreferences {
  soundEnabled: boolean;
  soundVolume: number;
  autoRefresh: boolean;
  autoRefreshInterval: number;
  defaultView: "list" | "compact" | "grid";
  defaultFilter: "all" | "unread" | "read" | "important" | "pinned" | "archived";
  defaultSort: "date" | "priority" | "type";
  defaultGroupBy: "none" | "date" | "type" | "priority";
  showToastNotifications: boolean;
  markAsReadOnClick: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  soundEnabled: true,
  soundVolume: 50,
  autoRefresh: true,
  autoRefreshInterval: 30,
  defaultView: "list",
  defaultFilter: "all",
  defaultSort: "date",
  defaultGroupBy: "date",
  showToastNotifications: true,
  markAsReadOnClick: true,
};

interface NotificationPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPreferences: NotificationPreferences;
  onSave: (preferences: NotificationPreferences) => void;
}

export default function NotificationPreferencesDialog({
  open,
  onOpenChange,
  currentPreferences,
  onSave,
}: NotificationPreferencesDialogProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>(currentPreferences);

  useEffect(() => {
    setPreferences(currentPreferences);
  }, [currentPreferences]);

  const handleSave = () => {
    onSave(preferences);
    toast.success("Preferences saved successfully");
    onOpenChange(false);
  };

  const handleReset = () => {
    setPreferences(DEFAULT_PREFERENCES);
    toast.info("Preferences reset to defaults");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </DialogTitle>
          <DialogDescription>
            Customize how you receive and view notifications
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Sound Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Sound Settings</h3>
            </div>
            <div className="space-y-3 pl-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="sound-enabled" className="text-sm">
                  Enable notification sounds
                </Label>
                <Switch
                  id="sound-enabled"
                  checked={preferences.soundEnabled}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, soundEnabled: checked })
                  }
                />
              </div>
              {preferences.soundEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="sound-volume" className="text-sm">
                    Volume: {preferences.soundVolume}%
                  </Label>
                  <Slider
                    id="sound-volume"
                    min={0}
                    max={100}
                    step={10}
                    value={[preferences.soundVolume]}
                    onValueChange={(value) =>
                      setPreferences({ ...preferences, soundVolume: value[0] })
                    }
                    className="w-full"
                  />
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Auto-Refresh Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Auto-Refresh Settings</h3>
            </div>
            <div className="space-y-3 pl-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-refresh" className="text-sm">
                  Enable auto-refresh
                </Label>
                <Switch
                  id="auto-refresh"
                  checked={preferences.autoRefresh}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, autoRefresh: checked })
                  }
                />
              </div>
              {preferences.autoRefresh && (
                <div className="space-y-2">
                  <Label htmlFor="refresh-interval" className="text-sm">
                    Refresh interval: {preferences.autoRefreshInterval} seconds
                  </Label>
                  <Slider
                    id="refresh-interval"
                    min={10}
                    max={120}
                    step={10}
                    value={[preferences.autoRefreshInterval]}
                    onValueChange={(value) =>
                      setPreferences({ ...preferences, autoRefreshInterval: value[0] })
                    }
                    className="w-full"
                  />
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Display Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Display Settings</h3>
            </div>
            <div className="space-y-3 pl-6">
              <div className="space-y-2">
                <Label htmlFor="default-view" className="text-sm flex items-center gap-2">
                  <Eye className="h-3 w-3" />
                  Default view mode
                </Label>
                <Select
                  value={preferences.defaultView}
                  onValueChange={(value: any) =>
                    setPreferences({ ...preferences, defaultView: value })
                  }
                >
                  <SelectTrigger id="default-view">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="list">List</SelectItem>
                    <SelectItem value="compact">Compact</SelectItem>
                    <SelectItem value="grid">Grid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default-filter" className="text-sm flex items-center gap-2">
                  <Filter className="h-3 w-3" />
                  Default filter
                </Label>
                <Select
                  value={preferences.defaultFilter}
                  onValueChange={(value: any) =>
                    setPreferences({ ...preferences, defaultFilter: value })
                  }
                >
                  <SelectTrigger id="default-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="unread">Unread</SelectItem>
                    <SelectItem value="read">Read</SelectItem>
                    <SelectItem value="important">Important</SelectItem>
                    <SelectItem value="pinned">Pinned</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default-sort" className="text-sm flex items-center gap-2">
                  <ArrowUpDown className="h-3 w-3" />
                  Default sort
                </Label>
                <Select
                  value={preferences.defaultSort}
                  onValueChange={(value: any) =>
                    setPreferences({ ...preferences, defaultSort: value })
                  }
                >
                  <SelectTrigger id="default-sort">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="type">Type</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default-groupby" className="text-sm flex items-center gap-2">
                  <Layers className="h-3 w-3" />
                  Default grouping
                </Label>
                <Select
                  value={preferences.defaultGroupBy}
                  onValueChange={(value: any) =>
                    setPreferences({ ...preferences, defaultGroupBy: value })
                  }
                >
                  <SelectTrigger id="default-groupby">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="type">Type</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Behavior Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Behavior Settings</h3>
            </div>
            <div className="space-y-3 pl-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="toast-notifications" className="text-sm">
                  Show toast notifications for new items
                </Label>
                <Switch
                  id="toast-notifications"
                  checked={preferences.showToastNotifications}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, showToastNotifications: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="mark-read-click" className="text-sm">
                  Mark as read when clicked
                </Label>
                <Switch
                  id="mark-read-click"
                  checked={preferences.markAsReadOnClick}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, markAsReadOnClick: checked })
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to Defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Save Preferences
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { DEFAULT_PREFERENCES };
export type { NotificationPreferences };

