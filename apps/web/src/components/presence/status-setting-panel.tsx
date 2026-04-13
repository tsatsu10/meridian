// @epic-4.2-presence: Status setting panel for enhanced presence system
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Circle,
  Clock,
  Moon,
  Coffee,
  Zap,
  DndIcon as DoNotDisturb,
  Settings,
  Edit,
  Eye,
  EyeOff,
  Calendar,
  Globe,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { CustomStatusModal } from './custom-status-modal';
import { UserStatusDisplay, UserStatus } from './user-status-display';

interface StatusSettingPanelProps {
  currentStatus: UserStatus;
  onStatusChange: (status: Partial<UserStatus>) => void;
  onCustomStatusUpdate: (customStatus: {
    message?: string;
    emoji?: string;
    expiresAt?: Date;
    isVisible?: boolean;
  }) => void;
  onCustomStatusClear: () => void;
  className?: string;
}

// Quick status options
const quickStatuses = [
  {
    status: 'online' as const,
    label: 'Available',
    icon: Circle,
    color: 'text-green-600',
    description: 'Ready to collaborate',
  },
  {
    status: 'away' as const,
    label: 'Away',
    icon: Clock,
    color: 'text-yellow-600',
    description: 'Stepped away briefly',
  },
  {
    status: 'busy' as const,
    label: 'Busy',
    icon: Zap,
    color: 'text-red-600',
    description: 'Focused and may not respond immediately',
  },
  {
    status: 'do_not_disturb' as const,
    label: 'Do not disturb',
    icon: DoNotDisturb,
    color: 'text-purple-600',
    description: 'Only notify for urgent matters',
  },
];

// DND duration options
const dndDurations = [
  { label: '30 minutes', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '2 hours', minutes: 120 },
  { label: '4 hours', minutes: 240 },
  { label: 'Until tomorrow', minutes: 1440 },
  { label: 'Until I turn it off', minutes: null },
];

export function StatusSettingPanel({
  currentStatus,
  onStatusChange,
  onCustomStatusUpdate,
  onCustomStatusClear,
  className,
}: StatusSettingPanelProps) {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showDndOptions, setShowDndOptions] = useState(false);

  const handleQuickStatusChange = (newStatus: UserStatus['status']) => {
    if (newStatus === 'do_not_disturb') {
      setShowDndOptions(true);
      return;
    }

    onStatusChange({
      status: newStatus,
      // Clear custom status when switching to standard status
      customStatusMessage: undefined,
      customStatusEmoji: undefined,
      statusExpiresAt: undefined,
      doNotDisturbUntil: undefined,
    });
  };

  const handleDndSet = (minutes: number | null) => {
    const doNotDisturbUntil = minutes 
      ? new Date(Date.now() + minutes * 60 * 1000)
      : undefined;

    onStatusChange({
      status: 'do_not_disturb',
      doNotDisturbUntil,
      customStatusMessage: undefined,
      customStatusEmoji: undefined,
      statusExpiresAt: undefined,
    });
    
    setShowDndOptions(false);
  };

  const handleVisibilityToggle = (isVisible: boolean) => {
    onStatusChange({
      isStatusVisible: isVisible,
    });
  };

  const hasCustomStatus = currentStatus.customStatusMessage || currentStatus.customStatusEmoji;
  const isDndActive = currentStatus.status === 'do_not_disturb';
  const dndTimeRemaining = currentStatus.doNotDisturbUntil 
    ? new Date(currentStatus.doNotDisturbUntil).getTime() - Date.now()
    : 0;

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Your Status
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Current Status Display */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Current status</Label>
          <UserStatusDisplay
            status={currentStatus}
            showLastSeen={false}
            showCurrentPage={false}
            showCustomMessage={true}
            compact={false}
          />
        </div>

        <Separator />

        {/* Quick Status Options */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Quick status</Label>
          <div className="grid grid-cols-2 gap-2">
            {quickStatuses.map((statusOption) => {
              const StatusIcon = statusOption.icon;
              const isActive = currentStatus.status === statusOption.status && !hasCustomStatus;
              
              return (
                <Button
                  key={statusOption.status}
                  variant={isActive ? "default" : "outline"}
                  className={cn(
                    "flex flex-col items-center gap-2 h-auto p-3",
                    !isActive && "hover:bg-muted/50"
                  )}
                  onClick={() => handleQuickStatusChange(statusOption.status)}
                >
                  <StatusIcon className={cn("w-4 h-4", statusOption.color)} />
                  <div className="text-center">
                    <div className="text-xs font-medium">{statusOption.label}</div>
                    <div className="text-xs text-muted-foreground hidden sm:block">
                      {statusOption.description}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>

        {/* DND Duration Options */}
        {showDndOptions && (
          <div className="space-y-3 p-3 bg-purple-50 rounded-lg border">
            <Label className="text-sm font-medium">Do not disturb for:</Label>
            <div className="space-y-2">
              {dndDurations.map((duration) => (
                <Button
                  key={duration.label}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-auto p-2"
                  onClick={() => handleDndSet(duration.minutes)}
                >
                  <div className="text-left">
                    <div className="text-sm">{duration.label}</div>
                  </div>
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowDndOptions(false)}
            >
              Cancel
            </Button>
          </div>
        )}

        {/* DND Status Info */}
        {isDndActive && currentStatus.doNotDisturbUntil && dndTimeRemaining > 0 && (
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <DoNotDisturb className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">
                Do not disturb is on
              </span>
            </div>
            <p className="text-xs text-purple-600">
              You'll automatically return to available {formatDistanceToNow(new Date(currentStatus.doNotDisturbUntil), { addSuffix: true })}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={() => onStatusChange({ status: 'online', doNotDisturbUntil: undefined })}
            >
              Turn off now
            </Button>
          </div>
        )}

        <Separator />

        {/* Custom Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Custom status</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustomModal(true)}
            >
              <Edit className="w-3 h-3 mr-1" />
              {hasCustomStatus ? 'Edit' : 'Set'}
            </Button>
          </div>
          
          {hasCustomStatus && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                {currentStatus.customStatusEmoji && (
                  <span className="text-lg">{currentStatus.customStatusEmoji}</span>
                )}
                <span className="text-sm font-medium text-blue-800">
                  {currentStatus.customStatusMessage || 'Custom status'}
                </span>
              </div>
              {currentStatus.statusExpiresAt && (
                <p className="text-xs text-blue-600">
                  Expires {formatDistanceToNow(new Date(currentStatus.statusExpiresAt), { addSuffix: true })}
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={onCustomStatusClear}
              >
                Clear custom status
              </Button>
            </div>
          )}
        </div>

        <Separator />

        {/* Status Visibility */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium flex items-center gap-2">
              {currentStatus.isStatusVisible ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
              Status visibility
            </Label>
            <Switch
              checked={currentStatus.isStatusVisible ?? true}
              onCheckedChange={handleVisibilityToggle}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {currentStatus.isStatusVisible 
              ? "Your status is visible to team members"
              : "Your status is hidden from team members"
            }
          </p>
        </div>

        {/* Additional Info */}
        <div className="pt-2 space-y-2 text-xs text-muted-foreground">
          {currentStatus.timezone && (
            <div className="flex items-center gap-2">
              <Globe className="w-3 h-3" />
              <span>Timezone: {currentStatus.timezone}</span>
            </div>
          )}
          {currentStatus.lastActivityType && (
            <div className="flex items-center gap-2">
              <Circle className="w-3 h-3" />
              <span>Last activity: {currentStatus.lastActivityType}</span>
            </div>
          )}
        </div>
      </CardContent>

      {/* Custom Status Modal */}
      <CustomStatusModal
        isOpen={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        currentStatus={{
          message: currentStatus.customStatusMessage,
          emoji: currentStatus.customStatusEmoji,
          expiresAt: currentStatus.statusExpiresAt,
          isVisible: currentStatus.isStatusVisible,
        }}
        onSave={onCustomStatusUpdate}
        onClear={onCustomStatusClear}
      />
    </Card>
  );
}

export default StatusSettingPanel;