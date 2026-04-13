// Appearance settings section with theme, layout, and display preferences
import React from 'react';
import { useSettings } from '../providers/SettingsProvider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { 
  Palette, 
  Monitor, 
  Sun, 
  Moon, 
  Type, 
  Layout, 
  Zap, 
  Eye,
  Save, 
  RotateCcw,
  Calendar,
  Clock,
  Contrast,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/cn';

const themeOptions = [
  {
    value: 'light',
    label: 'Light',
    description: 'Clean and bright interface',
    icon: Sun,
    preview: 'bg-white border-gray-200',
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Easy on the eyes in low light',
    icon: Moon,
    preview: 'bg-gray-900 border-gray-700',
  },
  {
    value: 'system',
    label: 'System',
    description: 'Matches your device preference',
    icon: Monitor,
    preview: 'bg-gradient-to-r from-white to-gray-900 border-gray-400',
  },
];

const fontSizeOptions = [
  { value: 'sm', label: 'Small', preview: 'text-sm' },
  { value: 'md', label: 'Medium', preview: 'text-base' },
  { value: 'lg', label: 'Large', preview: 'text-lg' },
];

const dateFormatOptions = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY', example: '12/31/2024' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY', example: '31/12/2024' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD', example: '2024-12-31' },
  { value: 'DD MMM YYYY', label: 'DD MMM YYYY', example: '31 Dec 2024' },
];

const timeFormatOptions = [
  { value: '12h', label: '12-hour', example: '2:30 PM' },
  { value: '24h', label: '24-hour', example: '14:30' },
];

export const AppearanceSettings: React.FC = () => {
  const { state, updateField, saveSettings, isDirty, hasErrors } = useSettings();
  
  const appearance = state.settings.appearance;
  const loading = state.loading.appearance;
  const error = state.errors.appearance;

  const handleSave = async () => {
    await saveSettings('appearance');
  };

  const handleReset = () => {
    // Reset functionality would be handled by the provider
  };

  const ThemePreview: React.FC<{ theme: string; isSelected: boolean }> = ({ theme, isSelected }) => {
    const option = themeOptions.find(t => t.value === theme);
    if (!option) return null;

    return (
      <div className={cn(
        'relative p-4 rounded-lg border-2 transition-all duration-200',
        isSelected ? 'border-primary shadow-sm' : 'border-border hover:border-muted-foreground',
        option.preview
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <option.icon className="h-4 w-4" />
            <span className="font-medium">{option.label}</span>
          </div>
          {isSelected && (
            <div className="h-2 w-2 bg-primary rounded-full"></div>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
        
        {/* Mini preview */}
        <div className="mt-3 space-y-1">
          <div className="h-2 bg-muted rounded w-3/4"></div>
          <div className="h-2 bg-muted rounded w-1/2"></div>
          <div className="h-2 bg-muted rounded w-2/3"></div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Appearance Settings</h2>
        <p className="text-muted-foreground">
          Customize the look and feel of your workspace.
        </p>
      </div>

      {/* Theme Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Theme
          </CardTitle>
          <CardDescription>
            Choose your preferred color scheme.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={appearance.theme}
            onValueChange={(value) => updateField('appearance', 'theme', value)}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {themeOptions.map((option) => (
              <div key={option.value} className="relative">
                <RadioGroupItem
                  value={option.value}
                  id={`theme-${option.value}`}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={`theme-${option.value}`}
                  className="cursor-pointer block"
                >
                  <ThemePreview 
                    theme={option.value} 
                    isSelected={appearance.theme === option.value} 
                  />
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Display Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5" />
            Display & Layout
          </CardTitle>
          <CardDescription>
            Adjust how content is displayed and organized.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Font Size */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              Font Size
            </Label>
            <RadioGroup
              value={appearance.fontSize}
              onValueChange={(value) => updateField('appearance', 'fontSize', value)}
              className="flex gap-4"
            >
              {fontSizeOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={`font-${option.value}`} />
                  <Label 
                    htmlFor={`font-${option.value}`} 
                    className={cn('cursor-pointer', option.preview)}
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Separator />

          {/* Layout Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Layout className="h-4 w-4" />
                  Compact Mode
                </Label>
                <p className="text-sm text-muted-foreground">
                  Reduce spacing and padding for a denser layout
                </p>
              </div>
              <Switch
                checked={appearance.compactMode}
                onCheckedChange={(checked) => updateField('appearance', 'compactMode', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Avatars</Label>
                <p className="text-sm text-muted-foreground">
                  Display user avatars throughout the interface
                </p>
              </div>
              <Switch
                checked={appearance.showAvatars}
                onCheckedChange={(checked) => updateField('appearance', 'showAvatars', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Sidebar Collapsed</Label>
                <p className="text-sm text-muted-foreground">
                  Start with the sidebar collapsed by default
                </p>
              </div>
              <Switch
                checked={appearance.sidebarCollapsed}
                onCheckedChange={(checked) => updateField('appearance', 'sidebarCollapsed', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date & Time Formats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Date & Time Formats
          </CardTitle>
          <CardDescription>
            Choose how dates and times are displayed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateFormat" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date Format
              </Label>
              <Select
                value={appearance.dateFormat}
                onValueChange={(value) => updateField('appearance', 'dateFormat', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dateFormatOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center justify-between w-full">
                        <span>{option.label}</span>
                        <span className="text-muted-foreground ml-4">{option.example}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeFormat" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Time Format
              </Label>
              <Select
                value={appearance.timeFormat}
                onValueChange={(value) => updateField('appearance', 'timeFormat', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeFormatOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center justify-between w-full">
                        <span>{option.label}</span>
                        <span className="text-muted-foreground ml-4">{option.example}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accessibility & Animation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Accessibility & Animation
          </CardTitle>
          <CardDescription>
            Settings to improve accessibility and reduce motion.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Enable Animations
              </Label>
              <p className="text-sm text-muted-foreground">
                Show smooth transitions and micro-interactions
              </p>
            </div>
            <Switch
              checked={appearance.enableAnimations}
              onCheckedChange={(checked) => updateField('appearance', 'enableAnimations', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Contrast className="h-4 w-4" />
                High Contrast
              </Label>
              <p className="text-sm text-muted-foreground">
                Increase contrast for better visibility
              </p>
            </div>
            <Switch
              checked={appearance.highContrast}
              onCheckedChange={(checked) => updateField('appearance', 'highContrast', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Preview
          </CardTitle>
          <CardDescription>
            See how your settings will look in the interface.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={cn(
            'p-4 rounded-lg border bg-card',
            appearance.compactMode && 'p-2',
            appearance.highContrast && 'border-2 border-foreground'
          )}>
            <div className="flex items-center gap-3 mb-3">
              {appearance.showAvatars && (
                <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                  JD
                </div>
              )}
              <div>
                <h4 className={cn(
                  'font-medium',
                  appearance.fontSize === 'sm' && 'text-sm',
                  appearance.fontSize === 'lg' && 'text-lg'
                )}>
                  John Doe
                </h4>
                <p className={cn(
                  'text-muted-foreground',
                  appearance.fontSize === 'sm' && 'text-xs',
                  appearance.fontSize === 'lg' && 'text-base'
                )}>
                  {dateFormatOptions.find(d => d.value === appearance.dateFormat)?.example} {' '}
                  {timeFormatOptions.find(t => t.value === appearance.timeFormat)?.example}
                </p>
              </div>
            </div>
            <p className={cn(
              'text-muted-foreground',
              appearance.fontSize === 'sm' && 'text-sm',
              appearance.fontSize === 'lg' && 'text-base'
            )}>
              This is how your content will appear with the current settings.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-2">
          {isDirty('appearance') && (
            <Badge variant="secondary" className="gap-1">
              <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
              Unsaved changes
            </Badge>
          )}
          {error && (
            <Badge variant="destructive">
              Error: {error}
            </Badge>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={loading || !isDirty('appearance')}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={loading || !isDirty('appearance') || hasErrors('appearance')}
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AppearanceSettings;