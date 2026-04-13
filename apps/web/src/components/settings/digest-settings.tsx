import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { API_BASE_URL } from '@/constants/urls';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Calendar, Clock, Mail, Eye, Save, RefreshCw } from 'lucide-react';

interface DigestSettings {
  userEmail: string;
  dailyEnabled: boolean;
  dailyTime: string;
  weeklyEnabled: boolean;
  weeklyDay: number;
  digestSections: string[];
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const AVAILABLE_SECTIONS = [
  { id: 'tasks', label: 'Completed Tasks', description: 'Your finished tasks' },
  { id: 'mentions', label: 'Mentions', description: 'Times you were mentioned' },
  { id: 'comments', label: 'Comments', description: 'Comments on your work' },
  { id: 'kudos', label: 'Kudos', description: 'Recognition received' },
];

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return { value: `${hour}:00`, label: `${hour}:00` };
});

export function DigestSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<DigestSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch settings
  useEffect(() => {
    if (user?.email) {
      fetchSettings();
    }
  }, [user?.email]);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/notification/digest/settings`, {
        credentials: 'include',
      });
      const data = await res.json();
      
      if (data.success && data.data) {
        setSettings(data.data);
      }
    } catch (error) {
      toast.error('Failed to load digest settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = (updates: Partial<DigestSettings>) => {
    if (settings) {
      setSettings({ ...settings, ...updates });
      setHasChanges(true);
    }
  };

  const toggleSection = (sectionId: string) => {
    if (!settings) return;
    
    const sections = settings.digestSections || [];
    const newSections = sections.includes(sectionId)
      ? sections.filter(s => s !== sectionId)
      : [...sections, sectionId];
    
    updateSettings({ digestSections: newSections });
  };

  const saveSettings = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/notification/digest/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings),
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success('Digest settings saved!');
        setHasChanges(false);
      } else {
        toast.error(data.error || 'Failed to save settings');
      }
    } catch (error) {
      toast.error('Failed to save digest settings');
    } finally {
      setSaving(false);
    }
  };

  const generatePreview = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/notification/digest/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type: 'daily' }),
      });
      
      const data = await res.json();
      
      if (data.success && data.data) {
        toast.success('Preview digest generated! Check your email (if configured)');
      } else {
        toast.error(data.error || 'Failed to generate preview');
      }
    } catch (error) {
      toast.error('Failed to generate preview');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Digest Settings</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Digest Settings
              </CardTitle>
              <CardDescription>
                Get regular summaries of your activity delivered to your inbox
              </CardDescription>
            </div>
            {hasChanges && (
              <Badge variant="secondary">Unsaved changes</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Daily Digest */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Daily Digest
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive a summary of your daily activity
                </p>
              </div>
              <Switch
                checked={settings.dailyEnabled}
                onCheckedChange={(checked) => updateSettings({ dailyEnabled: checked })}
              />
            </div>

            {settings.dailyEnabled && (
              <div className="ml-6 space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Delivery Time
                </Label>
                <Select
                  value={settings.dailyTime}
                  onValueChange={(value) => updateSettings({ dailyTime: value })}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time.value} value={time.value}>
                        {time.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Digest will be sent at this time every day
                </p>
              </div>
            )}
          </div>

          <div className="border-t pt-6" />

          {/* Weekly Digest */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Weekly Digest
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive a weekly summary of your activity
                </p>
              </div>
              <Switch
                checked={settings.weeklyEnabled}
                onCheckedChange={(checked) => updateSettings({ weeklyEnabled: checked })}
              />
            </div>

            {settings.weeklyEnabled && (
              <div className="ml-6 space-y-2">
                <Label>Delivery Day</Label>
                <Select
                  value={String(settings.weeklyDay)}
                  onValueChange={(value) => updateSettings({ weeklyDay: parseInt(value) })}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day) => (
                      <SelectItem key={day.value} value={String(day.value)}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Digest will be sent on this day at 9:00 AM
                </p>
              </div>
            )}
          </div>

          <div className="border-t pt-6" />

          {/* Digest Sections */}
          <div className="space-y-4">
            <div className="space-y-0.5">
              <Label className="text-base font-semibold">Include in Digest</Label>
              <p className="text-sm text-muted-foreground">
                Choose what to include in your email digests
              </p>
            </div>

            <div className="grid gap-4 ml-6">
              {AVAILABLE_SECTIONS.map((section) => (
                <div key={section.id} className="flex items-start space-x-3">
                  <Checkbox
                    id={section.id}
                    checked={settings.digestSections?.includes(section.id)}
                    onCheckedChange={() => toggleSection(section.id)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor={section.id} className="font-medium cursor-pointer">
                      {section.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {section.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-6" />

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              onClick={saveSettings}
              disabled={!hasChanges || saving}
              className="flex items-center gap-2"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={generatePreview}
              disabled={generating}
              className="flex items-center gap-2"
            >
              {generating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Preview Digest
                </>
              )}
            </Button>
          </div>

          {/* Info Box */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">📧 Email Configuration</p>
            <p className="text-sm text-muted-foreground">
              {process.env.NODE_ENV === 'development' 
                ? 'Development mode: Digests will be logged to console instead of sent via email.'
                : 'Digests will be sent to your registered email address.'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

