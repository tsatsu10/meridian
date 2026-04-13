import React, { useState } from 'react';
import { API_BASE_URL, API_URL } from '@/constants/urls';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Calendar, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Settings,
  Link,
  Unlink
} from 'lucide-react';
import { useCalendarStatus } from '@/hooks/queries/calendar/useCalendarStatus';
import { useConnectGoogleCalendar } from '@/hooks/mutations/calendar/useConnectGoogleCalendar';
import { toast } from '@/lib/toast';

interface CalendarIntegrationProps {
  userId: string;
  onCalendarConnected?: () => void;
}

export function CalendarIntegration({ userId, onCalendarConnected }: CalendarIntegrationProps) {
  const [autoSync, setAutoSync] = useState(true);
  const { data: calendarStatus, isLoading, refetch } = useCalendarStatus(userId);
  const connectGoogleCalendar = useConnectGoogleCalendar();

  const handleConnectGoogle = async () => {
    try {
      await connectGoogleCalendar.mutateAsync({ userId });
      toast.success('Google Calendar connected successfully!');
      onCalendarConnected?.();
    } catch (error) {
      toast.error('Failed to connect Google Calendar');
      console.error('Calendar connection error:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/calendar/disconnect/${userId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        toast.success('Calendar disconnected successfully');
        refetch();
      } else {
        toast.error('Failed to disconnect calendar');
      }
    } catch (error) {
      toast.error('Failed to disconnect calendar');
      console.error('Calendar disconnect error:', error);
    }
  };

  const openGoogleCalendar = () => {
    window.open('https://calendar.google.com', '_blank');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendar Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {calendarStatus?.connected ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium">Connected to Google Calendar</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {calendarStatus.provider}
                </Badge>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-orange-500" />
                <span className="font-medium">Not connected</span>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  Disconnected
                </Badge>
              </>
            )}
          </div>
          
          {calendarStatus?.needsRefresh && (
            <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">
              Needs Refresh
            </Badge>
          )}
        </div>

        {/* Connection Actions */}
        {!calendarStatus?.connected ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect your Google Calendar to automatically sync video calls and receive reminders.
            </p>
            
            <Button 
              onClick={handleConnectGoogle}
              disabled={connectGoogleCalendar.isPending}
              className="w-full"
            >
              {connectGoogleCalendar.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Link className="h-4 w-4 mr-2" />
                  Connect Google Calendar
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Auto-sync calls</span>
              <Switch 
                checked={autoSync} 
                onCheckedChange={setAutoSync}
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={openGoogleCalendar}
                className="flex-1"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Calendar
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleDisconnect}
                className="flex-1"
              >
                <Unlink className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </div>
          </div>
        )}

        {/* Features List */}
        <div className="pt-4 border-t">
          <h4 className="font-medium mb-2">Features</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              Automatic event creation for scheduled calls
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              Email reminders 15 minutes before calls
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              Sync participant invitations
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              One-click join links in calendar events
            </li>
          </ul>
        </div>

        {/* Settings */}
        {calendarStatus?.connected && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Settings</h4>
                <p className="text-sm text-muted-foreground">
                  Configure your calendar integration preferences
                </p>
              </div>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 