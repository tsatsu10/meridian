import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellOff, Clock, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const DND_DURATIONS = [
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
  { value: '120', label: '2 hours' },
  { value: '240', label: '4 hours' },
  { value: 'today', label: 'Until tonight (9 PM)' },
  { value: 'tomorrow', label: 'Until tomorrow (9 AM)' },
];

interface DoNotDisturbSettingsProps {
  className?: string;
}

interface DndStatus {
  enabled: boolean;
  expiresAt: string | null;
}

export function DoNotDisturbSettings({ className }: DoNotDisturbSettingsProps) {
  const [duration, setDuration] = useState<string>('60');
  const queryClient = useQueryClient();

  // Fetch current DND status
  const { data: dndStatus, isLoading } = useQuery<{ success: boolean; data: DndStatus }>({
    queryKey: ['dndStatus'],
    queryFn: async () => {
      const response = await fetch('/api/users/status/me', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch DND status');
      const result = await response.json();
      
      // Extract DND status from user status
      return {
        success: true,
        data: {
          enabled: result.data?.status === 'focus_mode',
          expiresAt: result.data?.expiresAt || null,
        },
      };
    },
  });

  // Toggle DND mutation
  const toggleDndMutation = useMutation({
    mutationFn: async (data: { enabled: boolean; expiresIn?: number }) => {
      if (!data.enabled) {
        // Clear DND by setting back to available
        const response = await fetch('/api/users/status', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'available',
          }),
        });
        
        if (!response.ok) throw new Error('Failed to disable DND');
        return response.json();
      }

      // Enable DND
      const response = await fetch('/api/users/status', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'focus_mode',
          statusMessage: 'Do not disturb',
          emoji: '🔕',
          expiresIn: data.expiresIn,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to enable DND');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dndStatus'] });
      queryClient.invalidateQueries({ queryKey: ['userStatus'] });
    },
  });

  const handleToggle = (checked: boolean) => {
    let expiresIn: number | undefined;

    if (checked) {
      if (duration === 'today') {
        // Until 9 PM today
        const now = new Date();
        const tonight = new Date(now);
        tonight.setHours(21, 0, 0, 0);
        
        if (tonight < now) {
          // If it's already past 9 PM, set for tomorrow 9 PM
          tonight.setDate(tonight.getDate() + 1);
        }
        
        expiresIn = Math.floor((tonight.getTime() - now.getTime()) / (1000 * 60));
      } else if (duration === 'tomorrow') {
        // Until 9 AM tomorrow
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        expiresIn = Math.floor((tomorrow.getTime() - now.getTime()) / (1000 * 60));
      } else {
        expiresIn = parseInt(duration, 10);
      }
    }

    toggleDndMutation.mutate({
      enabled: checked,
      expiresIn,
    });
  };

  const isDndEnabled = dndStatus?.data?.enabled || false;
  const expiresAt = dndStatus?.data?.expiresAt;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellOff className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Do Not Disturb</CardTitle>
          </div>
          <Switch
            checked={isDndEnabled}
            onCheckedChange={handleToggle}
            disabled={isLoading || toggleDndMutation.isPending}
          />
        </div>
        <CardDescription>
          Pause notifications when you need to focus
        </CardDescription>
      </CardHeader>

      {isDndEnabled && (
        <CardContent className="space-y-4">
          {toggleDndMutation.isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Updating...</span>
            </div>
          )}

          {expiresAt && (
            <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-md px-3 py-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                Until {new Date(expiresAt).toLocaleString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="dnd-duration" className="text-xs text-muted-foreground">
              When re-enabling, set duration:
            </Label>
            <Select value={duration} onValueChange={setDuration} disabled={isDndEnabled}>
              <SelectTrigger id="dnd-duration" className="h-9">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {DND_DURATIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      )}

      {!isDndEnabled && (
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="dnd-duration-select" className="text-sm">
              Duration when enabled
            </Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger id="dnd-duration-select">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {DND_DURATIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

