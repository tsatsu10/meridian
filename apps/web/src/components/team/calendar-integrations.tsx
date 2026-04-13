// @epic-3.4-teams: External calendar sync integrations
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { 
  Calendar, 
  Download, 
  Upload, 
  Settings, 
  ExternalLink,
  Check,
  X,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/cn";

interface CalendarIntegrationsProps {
  teamId?: string;
  onSync?: (provider: string) => void;
  onExport?: (format: string) => void;
}

interface CalendarProvider {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  lastSync?: Date;
  status: 'connected' | 'error' | 'syncing' | 'disconnected';
}

const calendarProviders: CalendarProvider[] = [
  {
    id: 'google',
    name: 'Google Calendar',
    icon: '📅',
    connected: false,
    status: 'disconnected'
  },
  {
    id: 'outlook',
    name: 'Microsoft Outlook',
    icon: '📧',
    connected: true,
    lastSync: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    status: 'connected'
  },
  {
    id: 'apple',
    name: 'Apple Calendar',
    icon: '🍎',
    connected: false,
    status: 'disconnected'
  },
  {
    id: 'caldav',
    name: 'CalDAV',
    icon: '🔗',
    connected: false,
    status: 'disconnected'
  }
];

const exportFormats = [
  { id: 'ical', name: 'iCal (.ics)', description: 'Standard calendar format' },
  { id: 'csv', name: 'CSV (.csv)', description: 'Spreadsheet format' },
  { id: 'json', name: 'JSON (.json)', description: 'Data interchange format' },
  { id: 'pdf', name: 'PDF (.pdf)', description: 'Printable format' },
];

export default function CalendarIntegrations({
  teamId,
  onSync,
  onExport
}: CalendarIntegrationsProps) {
  const [providers, setProviders] = useState<CalendarProvider[]>(calendarProviders);
  const [isOpen, setIsOpen] = useState(false);
  const [syncSettings, setSyncSettings] = useState({
    autoSync: true,
    syncInterval: 15, // minutes
    bidirectional: false,
    conflictResolution: 'manual'
  });
  const [caldavUrl, setCaldavUrl] = useState('');
  const [caldavCredentials, setCaldavCredentials] = useState({ username: '', password: '' });

  const handleConnect = async (providerId: string) => {
    setProviders(prev => prev.map(p => 
      p.id === providerId 
        ? { ...p, status: 'syncing' }
        : p
    ));

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (providerId === 'google') {
        // In real implementation, this would open OAuth flow
        window.open('https://accounts.google.com/oauth/authorize?...', '_blank');
      } else if (providerId === 'caldav') {
        // Validate CalDAV credentials
        if (!caldavUrl || !caldavCredentials.username) {
          throw new Error('CalDAV URL and username required');
        }
      }

      setProviders(prev => prev.map(p => 
        p.id === providerId 
          ? { ...p, connected: true, status: 'connected', lastSync: new Date() }
          : p
      ));
      
      onSync?.(providerId);
      alert(`Successfully connected to ${providers.find(p => p.id === providerId)?.name}`);
    } catch (error) {
      setProviders(prev => prev.map(p => 
        p.id === providerId 
          ? { ...p, status: 'error' }
          : p
      ));
      alert(`Failed to connect: ${error.message}`);
    }
  };

  const handleDisconnect = (providerId: string) => {
    setProviders(prev => prev.map(p => 
      p.id === providerId 
        ? { ...p, connected: false, status: 'disconnected', lastSync: undefined }
        : p
    ));
  };

  const handleSync = async (providerId: string) => {
    setProviders(prev => prev.map(p => 
      p.id === providerId 
        ? { ...p, status: 'syncing' }
        : p
    ));

    try {
      // Simulate sync
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setProviders(prev => prev.map(p => 
        p.id === providerId 
          ? { ...p, status: 'connected', lastSync: new Date() }
          : p
      ));
      
      onSync?.(providerId);
      alert('Calendar synced successfully!');
    } catch (error) {
      setProviders(prev => prev.map(p => 
        p.id === providerId 
          ? { ...p, status: 'error' }
          : p
      ));
      alert('Sync failed. Please try again.');
    }
  };

  const handleExport = (format: string) => {
    onExport?.(format);
    
    // Simulate file download
    const filename = `team-calendar-${teamId || 'export'}.${format}`;
    alert(`Downloading ${filename}...`);
    
    // In real implementation, this would trigger actual file download
    // const blob = new Blob([data], { type: mimeTypes[format] });
    // const url = URL.createObjectURL(blob);
    // const a = document.createElement('a');
    // a.href = url;
    // a.download = filename;
    // a.click();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <Check className="h-4 w-4 text-green-500" />;
      case 'error': return <X className="h-4 w-4 text-red-500" />;
      case 'syncing': return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'syncing': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ExternalLink className="h-4 w-4 mr-1" />
          Sync & Export
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Calendar Integrations</span>
          </DialogTitle>
          <DialogDescription>
            Connect external calendars and export team calendar data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Calendar Providers */}
          <div className="space-y-4">
            <h3 className="font-medium">External Calendar Providers</h3>
            
            <div className="space-y-3">
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{provider.icon}</span>
                    <div>
                      <div className="font-medium">{provider.name}</div>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Badge className={getStatusColor(provider.status)}>
                          {provider.status}
                        </Badge>
                        {provider.lastSync && (
                          <span>
                            Last sync: {provider.lastSync.toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(provider.status)}
                    
                    {provider.connected ? (
                      <div className="flex space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSync(provider.id)}
                          disabled={provider.status === 'syncing'}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Sync
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnect(provider.id)}
                        >
                          Disconnect
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleConnect(provider.id)}
                        disabled={provider.status === 'syncing'}
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* CalDAV Configuration */}
            <div className="p-4 border rounded-lg bg-muted/30">
              <h4 className="font-medium mb-3">CalDAV Configuration</h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="caldav-url">Server URL</Label>
                  <Input
                    id="caldav-url"
                    value={caldavUrl}
                    onChange={(e) => setCaldavUrl(e.target.value)}
                    placeholder="https://caldav.example.com/calendars/user/"
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="caldav-username">Username</Label>
                    <Input
                      id="caldav-username"
                      value={caldavCredentials.username}
                      onChange={(e) => setCaldavCredentials(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="username"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="caldav-password">Password</Label>
                    <Input
                      id="caldav-password"
                      type="password"
                      value={caldavCredentials.password}
                      onChange={(e) => setCaldavCredentials(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="password"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sync Settings */}
          <div className="space-y-4">
            <h3 className="font-medium">Sync Settings</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-sync</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync calendars at regular intervals
                  </p>
                </div>
                <Switch
                  checked={syncSettings.autoSync}
                  onCheckedChange={(checked) => setSyncSettings(prev => ({ ...prev, autoSync: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Bidirectional sync</Label>
                  <p className="text-sm text-muted-foreground">
                    Sync changes both ways between calendars
                  </p>
                </div>
                <Switch
                  checked={syncSettings.bidirectional}
                  onCheckedChange={(checked) => setSyncSettings(prev => ({ ...prev, bidirectional: checked }))}
                />
              </div>
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-4">
            <h3 className="font-medium">Export Calendar</h3>
            
            <div className="grid grid-cols-2 gap-3">
              {exportFormats.map((format) => (
                <Button
                  key={format.id}
                  variant="outline"
                  onClick={() => handleExport(format.id)}
                  className="justify-start h-auto p-3"
                >
                  <div className="text-left">
                    <div className="font-medium">{format.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {format.description}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
            <Button onClick={() => alert('Settings saved!')}>
              Save Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}