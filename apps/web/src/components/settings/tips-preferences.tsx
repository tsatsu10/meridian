import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTips } from '@/hooks/use-tips';
import { Lightbulb, RotateCcw, Sparkles, TrendingUp, Info } from 'lucide-react';
import { toast } from '@/lib/toast';
import type { TipCategory, TipType } from '@/types/tips';

const CATEGORY_INFO: Record<TipCategory, { label: string; description: string }> = {
  navigation: { label: 'Navigation', description: 'Tips about moving around the app' },
  tasks: { label: 'Tasks', description: 'Task management and organization tips' },
  communication: { label: 'Communication', description: 'Chat, messaging, and collaboration tips' },
  analytics: { label: 'Analytics', description: 'Reports, charts, and insights tips' },
  automation: { label: 'Automation', description: 'Workflows, rules, and automation tips' },
  shortcuts: { label: 'Keyboard Shortcuts', description: 'Productivity shortcuts and hotkeys' },
  collaboration: { label: 'Collaboration', description: 'Team features and collaboration tips' },
  workflows: { label: 'Workflows', description: 'Work processes and organization tips' },
  reports: { label: 'Reports', description: 'Reporting and time tracking tips' },
  settings: { label: 'Settings', description: 'App configuration and preferences tips' },
};

const TIP_TYPE_INFO: Record<TipType, string> = {
  loading: 'Show tips during loading screens',
  contextual: 'Show tips based on current context',
  notification: 'Show tips as notifications',
  onboarding: 'Show onboarding and tutorial tips',
  tooltip: 'Show quick inline tooltips',
  modal: 'Show full-screen tip modals',
};

export function TipsPreferences() {
  const { preferences, updatePreferences, resetPreferences, userProgress } = useTips();

  const handleToggleEnabled = () => {
    updatePreferences({ enabled: !preferences.enabled });
    toast.success(preferences.enabled ? 'Tips disabled' : 'Tips enabled');
  };

  const handleFrequencyChange = (frequency: 'high' | 'medium' | 'low' | 'off') => {
    updatePreferences({ frequency });
    toast.success(`Tip frequency set to ${frequency}`);
  };

  const handleToggleCategory = (category: TipCategory) => {
    const isEnabled = preferences.categories.includes(category);
    const newCategories = isEnabled
      ? preferences.categories.filter((c) => c !== category)
      : [...preferences.categories, category];

    updatePreferences({ categories: newCategories });
  };

  const handleToggleTipType = (type: TipType) => {
    const isEnabled = preferences.types.includes(type);
    const newTypes = isEnabled
      ? preferences.types.filter((t) => t !== type)
      : [...preferences.types, type];

    updatePreferences({ types: newTypes });
  };

  const handleReset = () => {
    resetPreferences();
    toast.success('Tips preferences reset to defaults');
  };

  const handleSelectAllCategories = () => {
    updatePreferences({
      categories: Object.keys(CATEGORY_INFO) as TipCategory[],
    });
    toast.success('All categories enabled');
  };

  const handleDeselectAllCategories = () => {
    updatePreferences({ categories: [] });
    toast.success('All categories disabled');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Tips & Hints</h2>
        <p className="text-muted-foreground">
          Customize how and when you see helpful tips throughout the app
        </p>
      </div>

      {/* Main Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            Enable Tips
          </CardTitle>
          <CardDescription>
            Show helpful tips and hints as you use Meridian. Inspired by Football Manager!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="tips-enabled">Show tips and hints</Label>
              <p className="text-sm text-muted-foreground">
                Display contextual tips, shortcuts, and helpful information
              </p>
            </div>
            <Switch
              id="tips-enabled"
              checked={preferences.enabled}
              onCheckedChange={handleToggleEnabled}
            />
          </div>

          {preferences.enabled && (
            <>
              <Separator />

              {/* Frequency */}
              <div className="space-y-2">
                <Label htmlFor="frequency">Tip Frequency</Label>
                <Select value={preferences.frequency} onValueChange={handleFrequencyChange}>
                  <SelectTrigger id="frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High - See tips frequently</SelectItem>
                    <SelectItem value="medium">Medium - Balanced approach</SelectItem>
                    <SelectItem value="low">Low - Only important tips</SelectItem>
                    <SelectItem value="off">Off - No tips</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Controls how often you see tips throughout the app
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Tip Types */}
      {preferences.enabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Tip Display Types
            </CardTitle>
            <CardDescription>Choose which types of tips you want to see</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(Object.entries(TIP_TYPE_INFO) as [TipType, string][]).map(([type, description]) => (
              <div key={type} className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor={`type-${type}`} className="capitalize">
                    {type} Tips
                  </Label>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <Switch
                  id={`type-${type}`}
                  checked={preferences.types.includes(type)}
                  onCheckedChange={() => handleToggleTipType(type)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Categories */}
      {preferences.enabled && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Tip Categories
                </CardTitle>
                <CardDescription>Select which categories of tips interest you</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSelectAllCategories}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={handleDeselectAllCategories}>
                  Clear All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(Object.entries(CATEGORY_INFO) as [TipCategory, typeof CATEGORY_INFO[TipCategory]][]).map(
                ([category, info]) => (
                  <div
                    key={category}
                    className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="space-y-1 flex-1">
                      <Label htmlFor={`cat-${category}`} className="cursor-pointer">
                        {info.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{info.description}</p>
                    </div>
                    <Switch
                      id={`cat-${category}`}
                      checked={preferences.categories.includes(category)}
                      onCheckedChange={() => handleToggleCategory(category)}
                    />
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Options */}
      {preferences.enabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Additional Options
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="onboarding">Show Onboarding</Label>
                <p className="text-sm text-muted-foreground">
                  Display onboarding tours for new features
                </p>
              </div>
              <Switch
                id="onboarding"
                checked={preferences.showOnboarding}
                onCheckedChange={(checked) =>
                  updatePreferences({ showOnboarding: checked })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="animations">Enable Animations</Label>
                <p className="text-sm text-muted-foreground">
                  Smooth animations when tips appear
                </p>
              </div>
              <Switch
                id="animations"
                checked={preferences.animationsEnabled}
                onCheckedChange={(checked) =>
                  updatePreferences({ animationsEnabled: checked })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-advance">Auto-advance Onboarding</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically move to next step in onboarding tours
                </p>
              </div>
              <Switch
                id="auto-advance"
                checked={preferences.autoAdvanceOnboarding}
                onCheckedChange={(checked) =>
                  updatePreferences({ autoAdvanceOnboarding: checked })
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Your Progress</CardTitle>
          <CardDescription>Track your tips journey</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Tips Seen</p>
              <p className="text-2xl font-bold">{userProgress.seenTips.length}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Bookmarked</p>
              <p className="text-2xl font-bold">{userProgress.bookmarkedTips.length}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Actions Taken</p>
              <p className="text-2xl font-bold">{userProgress.actionsFromTips}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Onboarding</p>
              <Badge variant={userProgress.completedOnboarding ? 'default' : 'secondary'}>
                {userProgress.completedOnboarding ? 'Complete' : 'In Progress'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reset */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            Reset Tips
          </CardTitle>
          <CardDescription>
            Reset all tip preferences and progress to start fresh
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleReset}>
            Reset All Preferences
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
