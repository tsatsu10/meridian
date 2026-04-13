import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Calendar as CalendarIcon,
  Settings,
  Clock,
  Bell,
  Eye,
  Users,
  ArrowLeft,
  Save,
  RotateCcw,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import LazyDashboardLayout from '@/components/performance/lazy-dashboard-layout';
import { useWorkspaceStore } from '@/store/workspace';
import { API_BASE_URL } from '@/constants/urls';
import { withErrorBoundary } from "@/components/dashboard/universal-error-boundary";

export const Route = createFileRoute('/dashboard/settings/calendar')({
  component: withErrorBoundary(CalendarSettings, "Calendar Settings"),
});

interface CalendarSettingsData {
  googleCalendarEnabled: boolean;
  googleCalendarSyncEnabled: boolean;
  googleCalendarSyncInterval: number;
  googleCalendarDefaultCalendar: string;
  defaultEventDuration: number;
  defaultEventReminder: number;
  allowAllDayEvents: boolean;
  defaultEventVisibility: 'public' | 'private' | 'workspace';
  requireEventApproval: boolean;
  workingHoursEnabled: boolean;
  workingHoursStart: string;
  workingHoursEnd: string;
  workingDays: string[];
  timezone: string;
  allowMeetingRooms: boolean;
  maxMeetingDuration: number;
  bufferTimeBetweenMeetings: number;
  allowRecurringEvents: boolean;
  maxRecurringInstances: number;
  calendarViewType: 'month' | 'week' | 'day' | 'agenda';
  showWeekends: boolean;
  startDayOfWeek: 'sunday' | 'monday';
  timeFormat: '12h' | '24h';
  dateFormat: string;
  sendEventReminders: boolean;
  sendEventUpdates: boolean;
  sendCancellationNotices: boolean;
  reminderMethods: string[];
  allowExternalCalendars: boolean;
  supportedCalendarTypes: string[];
  allowGuestAccess: boolean;
  allowEventExport: boolean;
  showBusyTime: boolean;
  allowConflictingEvents: boolean;
}

function CalendarSettings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Fix: Use workspace directly instead of broken currentWorkspace getter
  const workspace = useWorkspaceStore((state) => state.workspace);
  const currentWorkspace = workspace;
  
  const [hasChanges, setHasChanges] = useState(false);
  const [formData, setFormData] = useState<Partial<CalendarSettingsData>>({});

  // Fetch calendar settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['calendar-settings', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) throw new Error('No workspace selected');
      
      const response = await fetch(`${API_BASE_URL}/settings/calendar/${currentWorkspace.id}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch calendar settings');
      }
      
      const result = await response.json();
      return result.data as CalendarSettingsData;
    },
    enabled: !!currentWorkspace,
  });

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<CalendarSettingsData>) => {
      if (!currentWorkspace) throw new Error('No workspace selected');
      
      const response = await fetch(`${API_BASE_URL}/settings/calendar/${currentWorkspace.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update settings');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-settings', currentWorkspace?.id] });
      toast.success('Calendar settings updated successfully');
      setHasChanges(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update settings: ${error.message}`);
    },
  });

  const handleChange = (field: keyof CalendarSettingsData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSettingsMutation.mutate(formData);
  };

  const handleReset = () => {
    if (settings) {
      setFormData(settings);
      setHasChanges(false);
      toast.info('Changes reset');
    }
  };

  if (isLoading) {
    return (
      <LazyDashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading calendar settings...</p>
          </div>
        </div>
      </LazyDashboardLayout>
    );
  }

  return (
    <LazyDashboardLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate({ to: '/dashboard/settings' })} variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Settings
            </Button>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <CalendarIcon className="h-8 w-8" /> Calendar Settings
              </h1>
              <p className="text-muted-foreground">Configure calendar sync, events, and scheduling preferences</p>
            </div>
          </div>
          {hasChanges && (
            <div className="flex gap-2">
              <Button onClick={handleReset} variant="outline" size="sm">
                <RotateCcw className="h-4 w-4 mr-2" /> Reset
              </Button>
              <Button onClick={handleSave} size="sm" disabled={updateSettingsMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </div>

        {/* Google Calendar Integration Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Google Calendar Integration
            </CardTitle>
            <CardDescription>Connect and sync with Google Calendar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Google Calendar</Label>
                <p className="text-sm text-muted-foreground">Connect your Google Calendar account</p>
              </div>
              <Switch
                checked={formData.googleCalendarEnabled ?? false}
                onCheckedChange={(checked) => handleChange('googleCalendarEnabled', checked)}
              />
            </div>

            {formData.googleCalendarEnabled && (
              <>
                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Automatic Sync</Label>
                    <p className="text-sm text-muted-foreground">Automatically sync events with Google Calendar</p>
                  </div>
                  <Switch
                    checked={formData.googleCalendarSyncEnabled ?? false}
                    onCheckedChange={(checked) => handleChange('googleCalendarSyncEnabled', checked)}
                  />
                </div>

                {formData.googleCalendarSyncEnabled && (
                  <div className="space-y-2 pl-6">
                    <Label htmlFor="googleCalendarSyncInterval">Sync Interval (minutes)</Label>
                    <Input
                      id="googleCalendarSyncInterval"
                      type="number"
                      min="5"
                      max="1440"
                      value={formData.googleCalendarSyncInterval || 15}
                      onChange={(e) => handleChange('googleCalendarSyncInterval', parseInt(e.target.value))}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="googleCalendarDefaultCalendar">Default Calendar</Label>
                  <Input
                    id="googleCalendarDefaultCalendar"
                    value={formData.googleCalendarDefaultCalendar || ''}
                    onChange={(e) => handleChange('googleCalendarDefaultCalendar', e.target.value)}
                    placeholder="primary"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Event Defaults Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Event Defaults
            </CardTitle>
            <CardDescription>Default settings for new events</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="defaultEventDuration">Default Duration (minutes)</Label>
                <Input
                  id="defaultEventDuration"
                  type="number"
                  min="15"
                  max="1440"
                  value={formData.defaultEventDuration || 60}
                  onChange={(e) => handleChange('defaultEventDuration', parseInt(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultEventReminder">Default Reminder (minutes before)</Label>
                <Input
                  id="defaultEventReminder"
                  type="number"
                  min="0"
                  max="1440"
                  value={formData.defaultEventReminder || 15}
                  onChange={(e) => handleChange('defaultEventReminder', parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="defaultEventVisibility">Default Visibility</Label>
                <Select
                  value={formData.defaultEventVisibility || 'workspace'}
                  onValueChange={(value) => handleChange('defaultEventVisibility', value)}
                >
                  <SelectTrigger id="defaultEventVisibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="workspace">Workspace Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <Label>Allow All-Day Events</Label>
              <Switch
                checked={formData.allowAllDayEvents ?? true}
                onCheckedChange={(checked) => handleChange('allowAllDayEvents', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Require Event Approval</Label>
                <p className="text-sm text-muted-foreground">New events need approval before being added</p>
              </div>
              <Switch
                checked={formData.requireEventApproval ?? false}
                onCheckedChange={(checked) => handleChange('requireEventApproval', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Working Hours Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Working Hours
            </CardTitle>
            <CardDescription>Set your workspace's working schedule</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Working Hours</Label>
                <p className="text-sm text-muted-foreground">Show working hours on calendar</p>
              </div>
              <Switch
                checked={formData.workingHoursEnabled ?? true}
                onCheckedChange={(checked) => handleChange('workingHoursEnabled', checked)}
              />
            </div>

            {formData.workingHoursEnabled && (
              <>
                <Separator />

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="workingHoursStart">Start Time</Label>
                    <Input
                      id="workingHoursStart"
                      type="time"
                      value={formData.workingHoursStart || '09:00'}
                      onChange={(e) => handleChange('workingHoursStart', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="workingHoursEnd">End Time</Label>
                    <Input
                      id="workingHoursEnd"
                      type="time"
                      value={formData.workingHoursEnd || '17:00'}
                      onChange={(e) => handleChange('workingHoursEnd', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Working Days</Label>
                  <div className="flex flex-wrap gap-2">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                      <Badge
                        key={day}
                        variant={formData.workingDays?.includes(day) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => {
                          const current = formData.workingDays || [];
                          const updated = current.includes(day)
                            ? current.filter(d => d !== day)
                            : [...current, day];
                          handleChange('workingDays', updated);
                        }}
                      >
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={formData.timezone || 'UTC'}
                    onChange={(e) => handleChange('timezone', e.target.value)}
                    placeholder="UTC"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Meeting Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Meeting Settings
            </CardTitle>
            <CardDescription>Configure meeting and room booking settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Allow Meeting Rooms</Label>
              <Switch
                checked={formData.allowMeetingRooms ?? true}
                onCheckedChange={(checked) => handleChange('allowMeetingRooms', checked)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maxMeetingDuration">Max Meeting Duration (minutes)</Label>
                <Input
                  id="maxMeetingDuration"
                  type="number"
                  min="15"
                  max="1440"
                  value={formData.maxMeetingDuration || 480}
                  onChange={(e) => handleChange('maxMeetingDuration', parseInt(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bufferTimeBetweenMeetings">Buffer Time Between Meetings (minutes)</Label>
                <Input
                  id="bufferTimeBetweenMeetings"
                  type="number"
                  min="0"
                  max="120"
                  value={formData.bufferTimeBetweenMeetings || 0}
                  onChange={(e) => handleChange('bufferTimeBetweenMeetings', parseInt(e.target.value))}
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <Label>Allow Recurring Events</Label>
              <Switch
                checked={formData.allowRecurringEvents ?? true}
                onCheckedChange={(checked) => handleChange('allowRecurringEvents', checked)}
              />
            </div>

            {formData.allowRecurringEvents && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="maxRecurringInstances">Max Recurring Instances</Label>
                <Input
                  id="maxRecurringInstances"
                  type="number"
                  min="1"
                  max="365"
                  value={formData.maxRecurringInstances || 365}
                  onChange={(e) => handleChange('maxRecurringInstances', parseInt(e.target.value))}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Display Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Display Settings
            </CardTitle>
            <CardDescription>Customize calendar display preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="calendarViewType">Default View</Label>
                <Select
                  value={formData.calendarViewType || 'month'}
                  onValueChange={(value) => handleChange('calendarViewType', value)}
                >
                  <SelectTrigger id="calendarViewType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="agenda">Agenda</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDayOfWeek">Start Day of Week</Label>
                <Select
                  value={formData.startDayOfWeek || 'monday'}
                  onValueChange={(value) => handleChange('startDayOfWeek', value)}
                >
                  <SelectTrigger id="startDayOfWeek">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sunday">Sunday</SelectItem>
                    <SelectItem value="monday">Monday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="timeFormat">Time Format</Label>
                <Select
                  value={formData.timeFormat || '12h'}
                  onValueChange={(value) => handleChange('timeFormat', value)}
                >
                  <SelectTrigger id="timeFormat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12h">12-hour</SelectItem>
                    <SelectItem value="24h">24-hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateFormat">Date Format</Label>
                <Input
                  id="dateFormat"
                  value={formData.dateFormat || 'MM/DD/YYYY'}
                  onChange={(e) => handleChange('dateFormat', e.target.value)}
                  placeholder="MM/DD/YYYY"
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <Label>Show Weekends</Label>
              <Switch
                checked={formData.showWeekends ?? true}
                onCheckedChange={(checked) => handleChange('showWeekends', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Event Notifications
            </CardTitle>
            <CardDescription>Control event notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Send Event Reminders</Label>
              <Switch
                checked={formData.sendEventReminders ?? true}
                onCheckedChange={(checked) => handleChange('sendEventReminders', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Send Event Updates</Label>
              <Switch
                checked={formData.sendEventUpdates ?? true}
                onCheckedChange={(checked) => handleChange('sendEventUpdates', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Send Cancellation Notices</Label>
              <Switch
                checked={formData.sendCancellationNotices ?? true}
                onCheckedChange={(checked) => handleChange('sendCancellationNotices', checked)}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Reminder Methods</Label>
              <div className="flex flex-wrap gap-2">
                {['email', 'push', 'inApp'].map((method) => (
                  <Badge
                    key={method}
                    variant={formData.reminderMethods?.includes(method) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      const current = formData.reminderMethods || [];
                      const updated = current.includes(method)
                        ? current.filter(m => m !== method)
                        : [...current, method];
                      handleChange('reminderMethods', updated);
                    }}
                  >
                    {method === 'inApp' ? 'In-App' : method.charAt(0).toUpperCase() + method.slice(1)}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Permissions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Privacy & Permissions</CardTitle>
            <CardDescription>Control calendar privacy and access settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Allow External Calendars</Label>
              <Switch
                checked={formData.allowExternalCalendars ?? true}
                onCheckedChange={(checked) => handleChange('allowExternalCalendars', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Allow Guest Access</Label>
              <Switch
                checked={formData.allowGuestAccess ?? true}
                onCheckedChange={(checked) => handleChange('allowGuestAccess', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Allow Event Export</Label>
              <Switch
                checked={formData.allowEventExport ?? true}
                onCheckedChange={(checked) => handleChange('allowEventExport', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Show Busy Time</Label>
              <Switch
                checked={formData.showBusyTime ?? true}
                onCheckedChange={(checked) => handleChange('showBusyTime', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Allow Conflicting Events</Label>
                <p className="text-sm text-muted-foreground">Users can schedule overlapping events</p>
              </div>
              <Switch
                checked={formData.allowConflictingEvents ?? false}
                onCheckedChange={(checked) => handleChange('allowConflictingEvents', checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </LazyDashboardLayout>
  );
}
