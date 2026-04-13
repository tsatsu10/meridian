// Phase 6 Enhancement: Advanced Theme Customization System
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Palette, 
  Sun, 
  Moon, 
  Monitor, 
  Eye, 
  Download, 
  Upload, 
  Save,
  RotateCcw,
  Paintbrush,
  Layers,
  Type,
  Layout,
  Sparkles,
  Share2
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { useThemeContext } from '@/components/providers/theme-provider';
import { CustomTheme } from '@/components/providers/theme-provider/hooks/use-theme';

interface AdvancedThemeCustomizerProps {
  className?: string;
}

const createDefaultTheme = (): CustomTheme => ({
  id: `custom-${Date.now()}`,
  name: 'My Custom Theme',
  colors: {
    primary: '#3b82f6',
    secondary: '#f1f5f9',
    accent: '#f59e0b',
    background: '#ffffff',
    foreground: '#0f172a',
    muted: '#f1f5f9',
    mutedForeground: '#64748b',
    popover: '#ffffff',
    popoverForeground: '#0f172a',
    card: '#ffffff',
    cardForeground: '#0f172a',
    border: '#e2e8f0',
    input: '#e2e8f0',
    ring: '#3b82f6',
    destructive: '#ef4444',
    destructiveForeground: '#ffffff',
  },
  typography: {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 1.5,
    fontWeight: '400',
    letterSpacing: 0,
  },
  spacing: {
    scale: 1,
    borderRadius: 6,
  },
  effects: {
    shadows: true,
    blur: false,
    animations: true,
    glassmorphism: false,
  },
  accessibility: {
    highContrast: false,
    reducedMotion: false,
    largeFocusIndicators: false,
  },
});

const fontFamilies = [
  { value: 'Inter', label: 'Inter (Default)' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Source Sans Pro', label: 'Source Sans Pro' },
  { value: 'Nunito', label: 'Nunito' },
  { value: 'Raleway', label: 'Raleway' },
  { value: 'system-ui', label: 'System Default' }
];

const presetThemes: Partial<CustomTheme>[] = [
  {
    name: 'Ocean Blue',
    colors: {
      primary: '#0ea5e9',
      secondary: '#64748b',
      accent: '#06b6d4',
      background: '#f8fafc',
      foreground: '#0f172a',
      muted: '#f1f5f9',
      border: '#cbd5e1',
      destructive: '#ef4444',
      warning: '#f59e0b',
      success: '#059669'
    }
  },
  {
    name: 'Forest Green',
    colors: {
      primary: '#059669',
      secondary: '#6b7280',
      accent: '#34d399',
      background: '#f9fafb',
      foreground: '#111827',
      muted: '#f3f4f6',
      border: '#d1d5db',
      destructive: '#dc2626',
      warning: '#d97706',
      success: '#10b981'
    }
  },
  {
    name: 'Purple Dreams',
    colors: {
      primary: '#8b5cf6',
      secondary: '#6b7280',
      accent: '#a78bfa',
      background: '#fafafa',
      foreground: '#18181b',
      muted: '#f4f4f5',
      border: '#e4e4e7',
      destructive: '#ef4444',
      warning: '#eab308',
      success: '#22c55e'
    }
  },
  {
    name: 'Sunset Orange',
    colors: {
      primary: '#ea580c',
      secondary: '#78716c',
      accent: '#fb923c',
      background: '#fffbeb',
      foreground: '#1c1917',
      muted: '#fef3c7',
      border: '#fed7aa',
      destructive: '#dc2626',
      warning: '#d97706',
      success: '#16a34a'
    }
  }
];

export function AdvancedThemeCustomizer({ className }: AdvancedThemeCustomizerProps) {
  const { 
    theme: activeTheme, 
    customTheme, 
    setTheme: setActiveTheme, 
    setCustomTheme, 
    clearCustomTheme, 
    exportTheme, 
    importTheme 
  } = useThemeContext();
  
  const [theme, setTheme] = useState<CustomTheme>(customTheme || createDefaultTheme());
  const [previewMode, setPreviewMode] = useState(false);

  // Load current custom theme when component mounts
  useEffect(() => {
    if (customTheme) {
      setTheme(customTheme);
    }
  }, [customTheme]);

  // Apply preview changes in real-time when preview mode is enabled
  useEffect(() => {
    if (previewMode) {
      setCustomTheme(theme);
    }
  }, [theme, previewMode, setCustomTheme]);

  const updateTheme = (updates: Partial<CustomTheme>) => {
    const updatedTheme = {
      ...theme,
      ...updates,
    };
    setTheme(updatedTheme);
  };

  const updateColors = (colorUpdates: Partial<CustomTheme['colors']>) => {
    updateTheme({
      colors: { ...theme.colors, ...colorUpdates }
    });
  };

  const updateTypography = (typographyUpdates: Partial<CustomTheme['typography']>) => {
    updateTheme({
      typography: { ...theme.typography, ...typographyUpdates }
    });
  };

  const updateSpacing = (spacingUpdates: Partial<CustomTheme['spacing']>) => {
    updateTheme({
      spacing: { ...theme.spacing, ...spacingUpdates }
    });
  };

  const updateEffects = (effectsUpdates: Partial<CustomTheme['effects']>) => {
    updateTheme({
      effects: { ...theme.effects, ...effectsUpdates }
    });
  };

  const updateAccessibility = (accessibilityUpdates: Partial<CustomTheme['accessibility']>) => {
    updateTheme({
      accessibility: { ...theme.accessibility, ...accessibilityUpdates }
    });
  };

  const applyPresetTheme = (preset: Partial<CustomTheme>) => {
    updateTheme({
      ...preset,
      id: `preset-${Date.now()}`,
      name: preset.name || 'Preset Theme',
      typography: theme.typography,
      spacing: theme.spacing,
      effects: theme.effects,
      accessibility: theme.accessibility
    });
  };

  const resetToDefault = () => {
    const defaultTheme = createDefaultTheme();
    setTheme(defaultTheme);
    if (previewMode) {
      setCustomTheme(defaultTheme);
    }
    toast.success('Theme reset to default');
  };

  const handleExportTheme = () => {
    const dataStr = JSON.stringify(theme, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${theme.name.toLowerCase().replace(/\s+/g, '-')}-theme.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Theme exported successfully');
  };

  const handleImportTheme = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        if (importTheme(result)) {
          toast.success('Theme imported successfully');
          // Refresh local state with imported theme
          if (customTheme) {
            setTheme(customTheme);
          }
        } else {
          toast.error('Invalid theme file format');
        }
      } catch (error) {
        toast.error('Failed to import theme');
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  };

  const saveTheme = () => {
    setCustomTheme(theme);
    setActiveTheme('custom');
    toast.success(`Theme "${theme.name}" saved and applied`);
  };

  const clearTheme = () => {
    clearCustomTheme();
    setTheme(createDefaultTheme());
    setPreviewMode(false);
    toast.success('Custom theme cleared');
  };

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Palette className="w-6 h-6" />
              Advanced Theme Customizer
            </h2>
            <p className="text-muted-foreground">
              Create and customize themes with granular control over every aspect
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="preview-mode"
                checked={previewMode}
                onCheckedChange={setPreviewMode}
              />
              <Label htmlFor="preview-mode">Live Preview</Label>
            </div>
            <Button variant="outline" onClick={resetToDefault}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button onClick={saveTheme}>
              <Save className="w-4 h-4 mr-2" />
              Save Theme
            </Button>
          </div>
        </div>

        {/* Theme Info */}
        <Card>
          <CardHeader>
            <CardTitle>Theme Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="theme-name">Theme Name</Label>
                <Input
                  id="theme-name"
                  value={theme.name}
                  onChange={(e) => updateTheme({ name: e.target.value })}
                  placeholder="Enter theme name..."
                />
              </div>
              <div>
                <Label htmlFor="theme-description">Description</Label>
                <Input
                  id="theme-description"
                  value={theme.description || ''}
                  onChange={(e) => updateTheme({ description: e.target.value })}
                  placeholder="Theme description..."
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportTheme}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" asChild>
                <label>
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportTheme}
                    className="hidden"
                  />
                </label>
              </Button>
              <Button variant="outline">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="colors" className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="colors">Colors</TabsTrigger>
            <TabsTrigger value="typography">Typography</TabsTrigger>
            <TabsTrigger value="spacing">Spacing</TabsTrigger>
            <TabsTrigger value="effects">Effects</TabsTrigger>
            <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
          </TabsList>

          {/* Colors Tab */}
          <TabsContent value="colors" className="space-y-6">
            {/* Preset Themes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Preset Themes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {presetThemes.map((preset, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-center gap-2"
                      onClick={() => applyPresetTheme(preset)}
                    >
                      <div className="flex gap-1">
                        {Object.values(preset.colors || {}).slice(0, 4).map((color, i) => (
                          <div
                            key={i}
                            className="w-4 h-4 rounded-full border"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <span className="text-sm">{preset.name}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Color Customization */}
            <Card>
              <CardHeader>
                <CardTitle>Color Palette</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {Object.entries(theme.colors).map(([key, value]) => (
                    <div key={key} className="space-y-2">
                      <Label className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="color"
                          value={value}
                          onChange={(e) => updateColors({ [key]: e.target.value })}
                          className="w-12 h-10 p-1 border rounded"
                        />
                        <Input
                          value={value}
                          onChange={(e) => updateColors({ [key]: e.target.value })}
                          className="flex-1 font-mono text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Typography Tab */}
          <TabsContent value="typography" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="w-5 h-5" />
                  Typography Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Font Family</Label>
                    <Select
                      value={theme.typography.fontFamily}
                      onValueChange={(value) => updateTypography({ fontFamily: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fontFamilies.map((font) => (
                          <SelectItem key={font.value} value={font.value}>
                            {font.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Font Size</Label>
                    <Select
                      value={theme.typography.fontSize}
                      onValueChange={(value: any) => updateTypography({ fontSize: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="xs">Extra Small</SelectItem>
                        <SelectItem value="sm">Small</SelectItem>
                        <SelectItem value="base">Base</SelectItem>
                        <SelectItem value="lg">Large</SelectItem>
                        <SelectItem value="xl">Extra Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Font Weight</Label>
                    <Select
                      value={theme.typography.fontWeight}
                      onValueChange={(value: any) => updateTypography({ fontWeight: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="semibold">Semi Bold</SelectItem>
                        <SelectItem value="bold">Bold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Line Height: {theme.typography.lineHeight}</Label>
                    <Slider
                      value={[theme.typography.lineHeight]}
                      onValueChange={([value]) => updateTypography({ lineHeight: value })}
                      min={1}
                      max={2}
                      step={0.1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Letter Spacing: {theme.typography.letterSpacing}px</Label>
                    <Slider
                      value={[theme.typography.letterSpacing]}
                      onValueChange={([value]) => updateTypography({ letterSpacing: value })}
                      min={-2}
                      max={4}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Typography Preview */}
                <div className="mt-6 p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Typography Preview</h4>
                  <div
                    style={{
                      fontFamily: theme.typography.fontFamily,
                      fontSize: `var(--font-size-${theme.typography.fontSize})`,
                      fontWeight: theme.typography.fontWeight,
                      lineHeight: theme.typography.lineHeight,
                      letterSpacing: `${theme.typography.letterSpacing}px`
                    }}
                  >
                    <p className="text-2xl font-bold mb-2">Heading Example</p>
                    <p className="mb-2">
                      This is a paragraph of text that demonstrates the current typography settings. 
                      You can see how the font family, size, weight, line height, and letter spacing 
                      affect the overall appearance and readability of the text.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Small text example for UI elements and captions.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Spacing Tab */}
          <TabsContent value="spacing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layout className="w-5 h-5" />
                  Spacing & Layout
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Spacing Scale: {theme.spacing.scale}x</Label>
                    <Slider
                      value={[theme.spacing.scale]}
                      onValueChange={([value]) => updateSpacing({ scale: value })}
                      min={0.8}
                      max={1.2}
                      step={0.1}
                      className="w-full"
                    />
                    <p className="text-sm text-muted-foreground">
                      Affects padding, margins, and overall component spacing
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Border Radius: {Math.round(theme.spacing.borderRadius * 100)}%</Label>
                    <Slider
                      value={[theme.spacing.borderRadius]}
                      onValueChange={([value]) => updateSpacing({ borderRadius: value })}
                      min={0}
                      max={1}
                      step={0.1}
                      className="w-full"
                    />
                    <p className="text-sm text-muted-foreground">
                      Controls how rounded corners appear (0 = sharp, 1 = very rounded)
                    </p>
                  </div>
                </div>

                {/* Spacing Preview */}
                <div className="mt-6 space-y-4">
                  <h4 className="font-semibold">Spacing Preview</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div 
                      className="p-4 bg-muted border"
                      style={{ 
                        borderRadius: `${theme.spacing.borderRadius * 16}px`,
                        padding: `${16 * theme.spacing.scale}px`
                      }}
                    >
                      <p className="font-medium">Card Example</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        This card demonstrates the current spacing and border radius settings.
                      </p>
                    </div>
                    <div 
                      className="p-2 bg-primary text-primary-foreground"
                      style={{ 
                        borderRadius: `${theme.spacing.borderRadius * 8}px`,
                        padding: `${8 * theme.spacing.scale}px ${16 * theme.spacing.scale}px`
                      }}
                    >
                      Button Example
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Effects Tab */}
          <TabsContent value="effects" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  Visual Effects
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Drop Shadows</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable subtle shadows for depth
                      </p>
                    </div>
                    <Switch
                      checked={theme.effects.shadows}
                      onCheckedChange={(checked) => updateEffects({ shadows: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Blur Effects</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable backdrop blur for modals
                      </p>
                    </div>
                    <Switch
                      checked={theme.effects.blur}
                      onCheckedChange={(checked) => updateEffects({ blur: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Animations</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable smooth transitions
                      </p>
                    </div>
                    <Switch
                      checked={theme.effects.animations}
                      onCheckedChange={(checked) => updateEffects({ animations: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Gradients</Label>
                      <p className="text-sm text-muted-foreground">
                        Use gradient backgrounds
                      </p>
                    </div>
                    <Switch
                      checked={theme.effects.gradients}
                      onCheckedChange={(checked) => updateEffects({ gradients: checked })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Accessibility Tab */}
          <TabsContent value="accessibility" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Accessibility Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>High Contrast</Label>
                      <p className="text-sm text-muted-foreground">
                        Increase contrast for better visibility
                      </p>
                    </div>
                    <Switch
                      checked={theme.accessibility.highContrast}
                      onCheckedChange={(checked) => updateAccessibility({ highContrast: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Reduced Motion</Label>
                      <p className="text-sm text-muted-foreground">
                        Minimize animations for motion sensitivity
                      </p>
                    </div>
                    <Switch
                      checked={theme.accessibility.reducedMotion}
                      onCheckedChange={(checked) => updateAccessibility({ reducedMotion: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Focus Indicators</Label>
                      <p className="text-sm text-muted-foreground">
                        Show clear focus outlines for keyboard navigation
                      </p>
                    </div>
                    <Switch
                      checked={theme.accessibility.focusVisible}
                      onCheckedChange={(checked) => updateAccessibility({ focusVisible: checked })}
                    />
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Accessibility Tips</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Ensure color contrast meets WCAG AA standards (4.5:1 for normal text)</li>
                    <li>• Test your theme with screen readers</li>
                    <li>• Consider users with color blindness when choosing colors</li>
                    <li>• Provide alternative ways to convey information beyond color</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}