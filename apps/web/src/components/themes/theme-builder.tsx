// @epic-4.1-custom-theme-builder: Comprehensive theme builder with real-time preview
import { useState, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';
import { 
  Palette, 
  Eye, 
  Download, 
  Upload, 
  Save, 
  RotateCcw, 
  Sparkles,
  Copy,
  Check,
  Globe,
  Lock
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ThemeColors {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  input: string;
  ring: string;
  destructive: string;
  destructiveForeground: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  info: string;
  infoForeground: string;
}

interface ThemeBuilderProps {
  workspaceId: string;
  onSave?: (theme: any) => void;
  onCancel?: () => void;
  initialTheme?: any;
}

const defaultColors: ThemeColors = {
  primary: '#3B82F6',
  primaryForeground: '#FFFFFF',
  secondary: '#6366F1',
  secondaryForeground: '#FFFFFF',
  accent: '#8B5CF6',
  accentForeground: '#FFFFFF',
  background: '#FFFFFF',
  foreground: '#0F172A',
  card: '#FFFFFF',
  cardForeground: '#0F172A',
  popover: '#FFFFFF',
  popoverForeground: '#0F172A',
  muted: '#F1F5F9',
  mutedForeground: '#64748B',
  border: '#E2E8F0',
  input: '#E2E8F0',
  ring: '#3B82F6',
  destructive: '#EF4444',
  destructiveForeground: '#FFFFFF',
  success: '#10B981',
  successForeground: '#FFFFFF',
  warning: '#F59E0B',
  warningForeground: '#FFFFFF',
  info: '#3B82F6',
  infoForeground: '#FFFFFF',
};

export function ThemeBuilder({ workspaceId, onSave, onCancel, initialTheme }: ThemeBuilderProps) {
  const [themeName, setThemeName] = useState(initialTheme?.name || '');
  const [themeDescription, setThemeDescription] = useState(initialTheme?.description || '');
  const [colors, setColors] = useState<ThemeColors>(initialTheme?.colors || defaultColors);
  const [isPublic, setIsPublic] = useState(initialTheme?.isPublic || false);
  const [activeColorPicker, setActiveColorPicker] = useState<keyof ThemeColors | null>(null);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importData, setImportData] = useState('');

  // Color picker component
  const ColorInput = ({ 
    label, 
    colorKey, 
    value 
  }: { 
    label: string; 
    colorKey: keyof ThemeColors; 
    value: string;
  }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex gap-2">
        <Popover 
          open={activeColorPicker === colorKey}
          onOpenChange={(open) => setActiveColorPicker(open ? colorKey : null)}
        >
          <PopoverTrigger asChild>
            <button
              className="w-12 h-10 rounded-md border-2 border-border shadow-sm transition-transform hover:scale-105"
              style={{ backgroundColor: value }}
              aria-label={`Pick color for ${label}`}
            />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <HexColorPicker
              color={value}
              onChange={(newColor) => {
                setColors(prev => ({ ...prev, [colorKey]: newColor }));
              }}
            />
            <Input
              value={value}
              onChange={(e) => {
                const newColor = e.target.value;
                if (/^#[0-9A-F]{6}$/i.test(newColor)) {
                  setColors(prev => ({ ...prev, [colorKey]: newColor }));
                }
              }}
              className="mt-2 font-mono text-sm"
              placeholder="#000000"
            />
          </PopoverContent>
        </Popover>
        <Input
          value={value}
          onChange={(e) => {
            const newColor = e.target.value;
            if (/^#[0-9A-F]{6}$/i.test(newColor)) {
              setColors(prev => ({ ...prev, [colorKey]: newColor }));
            }
          }}
          className="flex-1 font-mono"
          placeholder="#000000"
        />
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopiedColor(colorKey);
            setTimeout(() => setCopiedColor(null), 2000);
          }}
        >
          {copiedColor === colorKey ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );

  // Generate complementary colors using color theory
  const generatePalette = () => {
    const baseHue = parseInt(colors.primary.slice(1), 16) % 360;
    
    // Generate analogous and complementary colors
    const newColors = { ...colors };
    
    // Analogous colors (±30 degrees)
    newColors.secondary = hslToHex((baseHue + 30) % 360, 65, 55);
    newColors.accent = hslToHex((baseHue - 30 + 360) % 360, 70, 60);
    
    // Complementary color (180 degrees)
    newColors.destructive = hslToHex((baseHue + 180) % 360, 70, 55);
    
    // Triadic colors
    newColors.success = hslToHex((baseHue + 120) % 360, 60, 50);
    newColors.warning = hslToHex((baseHue + 240) % 360, 75, 55);
    
    setColors(newColors);
    toast.success('Color palette generated!');
  };

  // Helper function to convert HSL to Hex
  const hslToHex = (h: number, s: number, l: number): string => {
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    
    const toHex = (n: number) => {
      const hex = Math.round((n + m) * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  };

  // Export theme
  const handleExport = () => {
    const themeData = {
      name: themeName,
      description: themeDescription,
      colors,
      isPublic,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
    
    const blob = new Blob([JSON.stringify(themeData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${themeName.toLowerCase().replace(/\s+/g, '-')}-theme.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Theme exported successfully!');
    setShowExportDialog(false);
  };

  // Import theme
  const handleImport = () => {
    try {
      const themeData = JSON.parse(importData);
      
      if (themeData.name) setThemeName(themeData.name);
      if (themeData.description) setThemeDescription(themeData.description);
      if (themeData.colors) setColors(themeData.colors);
      if (typeof themeData.isPublic === 'boolean') setIsPublic(themeData.isPublic);
      
      toast.success('Theme imported successfully!');
      setShowImportDialog(false);
      setImportData('');
    } catch (error) {
      toast.error('Invalid theme data. Please check the JSON format.');
    }
  };

  // Reset to defaults
  const handleReset = () => {
    setColors(defaultColors);
    toast.success('Colors reset to defaults');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Theme Builder</h2>
          <p className="text-muted-foreground">
            Create a custom theme for your workspace
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" onClick={() => setShowExportDialog(true)}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Theme Info */}
      <Card>
        <CardHeader>
          <CardTitle>Theme Information</CardTitle>
          <CardDescription>Basic details about your custom theme</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme-name">Theme Name</Label>
            <Input
              id="theme-name"
              value={themeName}
              onChange={(e) => setThemeName(e.target.value)}
              placeholder="My Custom Theme"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="theme-description">Description (Optional)</Label>
            <Textarea
              id="theme-description"
              value={themeDescription}
              onChange={(e) => setThemeDescription(e.target.value)}
              placeholder="A beautiful theme for my workspace"
              rows={3}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="public-theme">Public Theme</Label>
              <p className="text-sm text-muted-foreground">
                Make this theme available in the marketplace
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="public-theme"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
              {isPublic ? (
                <Badge variant="default" className="gap-1">
                  <Globe className="h-3 w-3" />
                  Public
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <Lock className="h-3 w-3" />
                  Private
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Color Palette */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Color Palette</CardTitle>
              <CardDescription>Customize your theme colors</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={generatePalette}>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="primary" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="primary">Primary</TabsTrigger>
              <TabsTrigger value="ui">UI Elements</TabsTrigger>
              <TabsTrigger value="status">Status</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>
            
            <TabsContent value="primary" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ColorInput label="Primary" colorKey="primary" value={colors.primary} />
                <ColorInput label="Primary Foreground" colorKey="primaryForeground" value={colors.primaryForeground} />
                <ColorInput label="Secondary" colorKey="secondary" value={colors.secondary} />
                <ColorInput label="Secondary Foreground" colorKey="secondaryForeground" value={colors.secondaryForeground} />
                <ColorInput label="Accent" colorKey="accent" value={colors.accent} />
                <ColorInput label="Accent Foreground" colorKey="accentForeground" value={colors.accentForeground} />
              </div>
            </TabsContent>
            
            <TabsContent value="ui" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ColorInput label="Background" colorKey="background" value={colors.background} />
                <ColorInput label="Foreground" colorKey="foreground" value={colors.foreground} />
                <ColorInput label="Card" colorKey="card" value={colors.card} />
                <ColorInput label="Card Foreground" colorKey="cardForeground" value={colors.cardForeground} />
                <ColorInput label="Muted" colorKey="muted" value={colors.muted} />
                <ColorInput label="Muted Foreground" colorKey="mutedForeground" value={colors.mutedForeground} />
                <ColorInput label="Border" colorKey="border" value={colors.border} />
                <ColorInput label="Input" colorKey="input" value={colors.input} />
              </div>
            </TabsContent>
            
            <TabsContent value="status" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ColorInput label="Success" colorKey="success" value={colors.success} />
                <ColorInput label="Success Foreground" colorKey="successForeground" value={colors.successForeground} />
                <ColorInput label="Warning" colorKey="warning" value={colors.warning} />
                <ColorInput label="Warning Foreground" colorKey="warningForeground" value={colors.warningForeground} />
                <ColorInput label="Destructive" colorKey="destructive" value={colors.destructive} />
                <ColorInput label="Destructive Foreground" colorKey="destructiveForeground" value={colors.destructiveForeground} />
                <ColorInput label="Info" colorKey="info" value={colors.info} />
                <ColorInput label="Info Foreground" colorKey="infoForeground" value={colors.infoForeground} />
              </div>
            </TabsContent>
            
            <TabsContent value="advanced" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ColorInput label="Popover" colorKey="popover" value={colors.popover} />
                <ColorInput label="Popover Foreground" colorKey="popoverForeground" value={colors.popoverForeground} />
                <ColorInput label="Ring" colorKey="ring" value={colors.ring} />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Live Preview
          </CardTitle>
          <CardDescription>See how your theme looks in action</CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            className="p-6 rounded-lg border-2 space-y-4"
            style={{
              backgroundColor: colors.background,
              color: colors.foreground,
              borderColor: colors.border,
            }}
          >
            <div className="flex gap-2 flex-wrap">
              <button 
                className="px-4 py-2 rounded-md font-medium transition-colors"
                style={{ 
                  backgroundColor: colors.primary, 
                  color: colors.primaryForeground 
                }}
              >
                Primary Button
              </button>
              <button 
                className="px-4 py-2 rounded-md font-medium transition-colors border-2"
                style={{ 
                  borderColor: colors.border,
                  color: colors.foreground 
                }}
              >
                Secondary Button
              </button>
              <button 
                className="px-4 py-2 rounded-md font-medium transition-colors"
                style={{ 
                  backgroundColor: colors.destructive, 
                  color: colors.destructiveForeground 
                }}
              >
                Destructive
              </button>
            </div>
            
            <div 
              className="p-4 rounded-md"
              style={{ 
                backgroundColor: colors.card,
                color: colors.cardForeground,
                border: `1px solid ${colors.border}`
              }}
            >
              <h3 className="font-semibold mb-2">Card Component</h3>
              <p style={{ color: colors.mutedForeground }}>
                This is how cards will appear with your custom theme colors.
              </p>
            </div>
            
            <div className="flex gap-2">
              <span 
                className="px-2 py-1 rounded text-sm font-medium"
                style={{ 
                  backgroundColor: colors.success, 
                  color: colors.successForeground 
                }}
              >
                Success
              </span>
              <span 
                className="px-2 py-1 rounded text-sm font-medium"
                style={{ 
                  backgroundColor: colors.warning, 
                  color: colors.warningForeground 
                }}
              >
                Warning
              </span>
              <span 
                className="px-2 py-1 rounded text-sm font-medium"
                style={{ 
                  backgroundColor: colors.info, 
                  color: colors.infoForeground 
                }}
              >
                Info
              </span>
            </div>
            
            <input
              type="text"
              placeholder="Input field preview"
              className="px-3 py-2 rounded-md w-full"
              style={{
                backgroundColor: colors.background,
                color: colors.foreground,
                border: `1px solid ${colors.input}`,
              }}
              readOnly
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button 
          onClick={() => {
            if (!themeName) {
              toast.error('Please enter a theme name');
              return;
            }
            onSave?.({ 
              name: themeName, 
              description: themeDescription, 
              colors, 
              isPublic 
            });
          }}
        >
          <Save className="h-4 w-4 mr-2" />
          Save Theme
        </Button>
      </div>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Theme</DialogTitle>
            <DialogDescription>
              Download your theme as a JSON file to share or backup
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            Your theme will be exported as a JSON file that can be imported later or shared with others.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Theme</DialogTitle>
            <DialogDescription>
              Paste the JSON content of an exported theme
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
            placeholder='{"name": "My Theme", "colors": {...}}'
            rows={10}
            className="font-mono text-sm"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowImportDialog(false);
              setImportData('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleImport}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
