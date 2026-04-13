import { useState, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Palette, 
  Monitor, 
  Sun, 
  Moon, 
  Accessibility,
  RefreshCw,
  Eye,
  ArrowLeft,
  Clock,
  MapPin,
  Sunrise,
  Sunset,
  Image as ImageIcon,
  Upload,
  X,
  Maximize,
  Minimize,
  Type,
  Sparkles,
} from 'lucide-react';
import { useThemeSync } from "@/hooks/use-theme-sync";
import { useSettingsStore } from "@/store/settings";
import { useAuthStore } from "@/store/consolidated/auth";
import { toast } from 'sonner';
import { API_BASE_URL } from '@/constants/urls';
import { UnsplashPhotoPicker } from '@/components/unsplash/unsplash-photo-picker';
import type { UnsplashPhoto } from '@/types/unsplash';

// Import Accessibility Components
import { VoiceControl } from "@/components/accessibility/voice-control";
import { ColorBlindMode } from "@/components/accessibility/color-blind-mode";
import { ReducedMotionMode } from "@/components/accessibility/reduced-motion-mode";
import { withErrorBoundary } from "@/components/dashboard/universal-error-boundary";

export const Route = createFileRoute('/dashboard/settings/appearance')({
  component: withErrorBoundary(AppearanceSettings, "Appearance Settings"),
});

function AppearanceSettings() {
  const { theme, setTheme } = useThemeSync();
  const { settings, updateSettings } = useSettingsStore();
  const { user } = useAuthStore();
  
  // @epic-4.2-scheduled-theme: Scheduled theme switching
  const [scheduledThemeEnabled, setScheduledThemeEnabled] = useState(false);
  const [lightThemeTime, setLightThemeTime] = useState('06:00');
  const [darkThemeTime, setDarkThemeTime] = useState('18:00');
  
  // @epic-4.2-location-theme: Location-based theme switching
  const [locationBasedEnabled, setLocationBasedEnabled] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [sunTimes, setSunTimes] = useState<{ sunrise: string; sunset: string } | null>(null);
  
  // @epic-4.3-background-customization: Background image customization
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundPosition, setBackgroundPosition] = useState<'center' | 'top' | 'bottom' | 'left' | 'right'>('center');
  const [backgroundBlur, setBackgroundBlur] = useState(0);
  const [backgroundOpacity, setBackgroundOpacity] = useState(100);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  
  // Unsplash photo picker
  const [unsplashPickerOpen, setUnsplashPickerOpen] = useState(false);
  const [selectedUnsplashPhoto, setSelectedUnsplashPhoto] = useState<UnsplashPhoto | null>(null);
  
  // @epic-4.4-font-customization: Font customization
  const [fontFamily, setFontFamily] = useState('Inter');
  const [fontSize, setFontSize] = useState(14);
  const [fontWeight, setFontWeight] = useState(400);
  const [lineHeight, setLineHeight] = useState(1.5);
  const [letterSpacing, setLetterSpacing] = useState(0);
  
  // @epic-4.5-accessibility: Accessibility enhancements
  const [largeText, setLargeText] = useState(false);
  const [enhancedFocus, setEnhancedFocus] = useState(false);
  const [screenReaderMode, setScreenReaderMode] = useState(false);
  const [keyboardNavigation, setKeyboardNavigation] = useState(false);

  // Load accessibility preferences on mount
  useEffect(() => {
    const loadAccessibilitySettings = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/user-preferences/appearance/${user?.email}`);
        if (response.ok) {
          const data = await response.json();
          if (data.settings) {
            const parsed = typeof data.settings === 'string' ? JSON.parse(data.settings) : data.settings;
            
            if (parsed.largeText !== undefined) {
              setLargeText(parsed.largeText);
              document.documentElement.classList.toggle('large-text', parsed.largeText);
            }
            if (parsed.enhancedFocus !== undefined) {
              setEnhancedFocus(parsed.enhancedFocus);
              document.documentElement.classList.toggle('enhanced-focus', parsed.enhancedFocus);
            }
            if (parsed.screenReaderMode !== undefined) {
              setScreenReaderMode(parsed.screenReaderMode);
              document.documentElement.classList.toggle('screen-reader-mode', parsed.screenReaderMode);
            }
            if (parsed.keyboardNavigation !== undefined) {
              setKeyboardNavigation(parsed.keyboardNavigation);
              document.documentElement.classList.toggle('keyboard-nav', parsed.keyboardNavigation);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load accessibility settings:', error);
      }
    };

    if (user?.email) {
      loadAccessibilitySettings();
    }
  }, [user?.email]);

  const handleSettingUpdate = async (section: string, key: string, value: any) => {
    try {
      await updateSettings(section as any, { [key]: value });
      toast.success('Setting updated successfully');
    } catch (error) {
      toast.error('Failed to update setting');
    }
  };

  const handleResetToDefaults = () => {
    setTheme('system');
    updateSettings('appearance', {
      highContrast: false,
      reducedMotion: false,
    });
    setScheduledThemeEnabled(false);
    setLocationBasedEnabled(false);
    toast.success('Reset to default settings');
  };

  // Calculate sunrise/sunset times
  const calculateSunTimes = (lat: number, lon: number) => {
    const date = new Date();
    // Simplified calculation - in production, use a proper sun calculation library
    const sunrise = new Date(date);
    sunrise.setHours(6, 0, 0);
    const sunset = new Date(date);
    sunset.setHours(18, 0, 0);
    
    setSunTimes({
      sunrise: sunrise.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      sunset: sunset.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    });
  };

  // Get user location
  const getLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ latitude, longitude });
          calculateSunTimes(latitude, longitude);
          toast.success('Location detected successfully');
        },
        (error) => {
          toast.error('Could not detect location. Please enable location services.');
          setLocationBasedEnabled(false);
        }
      );
    } else {
      toast.error('Geolocation is not supported by your browser');
      setLocationBasedEnabled(false);
    }
  };

  // Apply scheduled theme
  useEffect(() => {
    if (!scheduledThemeEnabled) return;

    const checkScheduledTheme = () => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      if (currentTime === lightThemeTime) {
        setTheme('light');
        toast.success('Switched to light theme (scheduled)');
      } else if (currentTime === darkThemeTime) {
        setTheme('dark');
        toast.success('Switched to dark theme (scheduled)');
      }
    };

    const interval = setInterval(checkScheduledTheme, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [scheduledThemeEnabled, lightThemeTime, darkThemeTime, setTheme]);

  // Apply location-based theme
  useEffect(() => {
    if (!locationBasedEnabled || !currentLocation || !sunTimes) return;

    const checkLocationTheme = () => {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      
      const [sunriseHour, sunriseMin] = sunTimes.sunrise.split(':').map(Number);
      const [sunsetHour, sunsetMin] = sunTimes.sunset.split(':').map(Number);
      const sunriseTime = sunriseHour * 60 + sunriseMin;
      const sunsetTime = sunsetHour * 60 + sunsetMin;
      
      if (currentTime >= sunriseTime && currentTime < sunsetTime) {
        if (theme !== 'light') {
          setTheme('light');
          toast.success('Switched to light theme (sunrise)');
        }
      } else {
        if (theme !== 'dark') {
          setTheme('dark');
          toast.success('Switched to dark theme (sunset)');
        }
      }
    };

    checkLocationTheme();
    const interval = setInterval(checkLocationTheme, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [locationBasedEnabled, currentLocation, sunTimes, theme, setTheme]);

  // Background image handlers
  const handleBackgroundUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      toast.error('Only JPEG, PNG, WebP, and GIF images are allowed');
      return;
    }

    setUploadingBackground(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/user-preferences/background/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      setBackgroundImage(data.imageUrl);
      await saveBackgroundPreferences(data.imageUrl, backgroundPosition, backgroundBlur, backgroundOpacity);
      toast.success('Background image uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload background image');
    } finally {
      setUploadingBackground(false);
    }
  };

  const saveBackgroundPreferences = async (
    image?: string | null,
    position?: string,
    blur?: number,
    opacity?: number
  ) => {
    if (!user?.email) return;

    try {
      const response = await fetch(`${API_BASE_URL}/user-preferences/background/${user.email}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          backgroundImage: image !== undefined ? image : backgroundImage,
          backgroundPosition: position || backgroundPosition,
          backgroundBlur: blur !== undefined ? blur : backgroundBlur,
          backgroundOpacity: opacity !== undefined ? opacity : backgroundOpacity,
        }),
      });

      if (!response.ok) throw new Error('Failed to save preferences');
    } catch (error) {
      toast.error('Failed to save background preferences');
    }
  };

  const handleUnsplashPhotoSelect = async (photo: UnsplashPhoto) => {
    try {
      setSelectedUnsplashPhoto(photo);
      setBackgroundImage(photo.urls.regular);
      
      // Track download (required by Unsplash TOS)
      await fetch(`${API_BASE_URL}/unsplash/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ downloadLocation: photo.links.download_location }),
      });
      
      // Save preferences with Unsplash photo URL
      await saveBackgroundPreferences(photo.urls.regular, backgroundPosition, backgroundBlur, backgroundOpacity);
      
      toast.success(
        `Background set to photo by ${photo.user.name}`,
        {
          description: 'Photo from Unsplash',
        }
      );
    } catch (error) {
      console.error('Failed to set Unsplash background:', error);
      toast.error('Failed to set background image');
    }
  };

  const handleRemoveBackground = async () => {
    setBackgroundImage(null);
    setSelectedUnsplashPhoto(null);
    await saveBackgroundPreferences(null, backgroundPosition, backgroundBlur, backgroundOpacity);
    toast.success('Background image removed');
  };

  // Font customization handlers
  const saveFontPreferences = async (
    family?: string,
    size?: number,
    weight?: number,
    height?: number,
    spacing?: number
  ) => {
    if (!user?.email) return;

    try {
      const response = await fetch(`${API_BASE_URL}/user-preferences/fonts/${user.email}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fontFamily: family || fontFamily,
          fontSize: size !== undefined ? size : fontSize,
          fontWeight: weight !== undefined ? weight : fontWeight,
          lineHeight: height !== undefined ? height : lineHeight,
          letterSpacing: spacing !== undefined ? spacing : letterSpacing,
        }),
      });

      if (!response.ok) throw new Error('Failed to save preferences');
    } catch (error) {
      toast.error('Failed to save font preferences');
    }
  };

  const handleResetFonts = () => {
    setFontFamily('Inter');
    setFontSize(14);
    setFontWeight(400);
    setLineHeight(1.5);
    setLetterSpacing(0);
    saveFontPreferences('Inter', 14, 400, 1.5, 0);
    toast.success('Font settings reset to defaults');
  };

  // Accessibility handlers
  const handleAccessibilityUpdate = async (key: string, value: boolean) => {
    try {
      await handleSettingUpdate('appearance', key, value);
      
      // Apply accessibility settings to document
      if (key === 'largeText') {
        document.documentElement.classList.toggle('large-text', value);
      } else if (key === 'enhancedFocus') {
        document.documentElement.classList.toggle('enhanced-focus', value);
      } else if (key === 'screenReaderMode') {
        document.documentElement.classList.toggle('screen-reader-mode', value);
      } else if (key === 'keyboardNavigation') {
        document.documentElement.classList.toggle('keyboard-nav', value);
      }
    } catch (error) {
      toast.error('Failed to update accessibility setting');
    }
  };

  const ThemePreview = () => {
    return (
      <div className="space-y-4 p-4 border rounded-lg bg-background">
        <h4 className="font-medium text-sm">Theme Preview</h4>
        
        <div className="grid grid-cols-2 gap-3">
          <Button size="sm">Primary</Button>
          <Button variant="outline" size="sm">Outline</Button>
          <Button variant="secondary" size="sm">Secondary</Button>
          <Button variant="ghost" size="sm">Ghost</Button>
        </div>
        
        <div className="space-y-2">
          <Input placeholder="Input field" size="sm" />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>

        <div className="p-3 bg-muted rounded-md text-sm">
          <p className="text-muted-foreground">
            This is how text appears in your current theme. The preview updates in real-time as you change settings.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 md:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Appearance</h1>
          <p className="text-muted-foreground">
            Customize how Meridian looks and feels
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Theme Mode */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Theme Mode
                </CardTitle>
                <CardDescription>
                  Choose your preferred color theme
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    onClick={() => setTheme('light')}
                    className="flex flex-col items-center gap-2 h-auto py-4"
                  >
                    <Sun className="w-5 h-5" />
                    <span className="text-sm font-medium">Light</span>
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    onClick={() => setTheme('dark')}
                    className="flex flex-col items-center gap-2 h-auto py-4"
                  >
                    <Moon className="w-5 h-5" />
                    <span className="text-sm font-medium">Dark</span>
                  </Button>
                  <Button
                    variant={theme === 'system' ? 'default' : 'outline'}
                    onClick={() => setTheme('system')}
                    className="flex flex-col items-center gap-2 h-auto py-4"
                  >
                    <Monitor className="w-5 h-5" />
                    <span className="text-sm font-medium">System</span>
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  System theme matches your device settings
                </p>
              </CardContent>
            </Card>

            {/* Scheduled Theme Switching - Phase 4.2 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Scheduled Theme Switching
                </CardTitle>
                <CardDescription>
                  Automatically switch themes at specific times
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="scheduled-theme">Enable Scheduled Switching</Label>
                    <p className="text-sm text-muted-foreground">
                      Theme changes automatically at set times
                    </p>
                  </div>
                  <Switch
                    id="scheduled-theme"
                    checked={scheduledThemeEnabled}
                    onCheckedChange={setScheduledThemeEnabled}
                  />
                </div>

                {scheduledThemeEnabled && (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="light-time" className="flex items-center gap-2">
                        <Sun className="w-3 h-3" />
                        Light Theme Time
                      </Label>
                      <Input
                        id="light-time"
                        type="time"
                        value={lightThemeTime}
                        onChange={(e) => setLightThemeTime(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dark-time" className="flex items-center gap-2">
                        <Moon className="w-3 h-3" />
                        Dark Theme Time
                      </Label>
                      <Input
                        id="dark-time"
                        type="time"
                        value={darkThemeTime}
                        onChange={(e) => setDarkThemeTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Location-Based Theme - Phase 4.2 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location-Based Theme
                </CardTitle>
                <CardDescription>
                  Sync theme with sunrise and sunset
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="location-theme">Enable Location-Based</Label>
                    <p className="text-sm text-muted-foreground">
                      Theme follows day/night cycle
                    </p>
                  </div>
                  <Switch
                    id="location-theme"
                    checked={locationBasedEnabled}
                    onCheckedChange={(checked) => {
                      setLocationBasedEnabled(checked);
                      if (checked && !currentLocation) {
                        getLocation();
                      }
                    }}
                  />
                </div>

                {locationBasedEnabled && currentLocation && sunTimes && (
                  <div className="p-3 bg-muted rounded-md space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Sunrise className="w-4 h-4" />
                        Sunrise
                      </span>
                      <Badge variant="outline">{sunTimes.sunrise}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Sunset className="w-4 h-4" />
                        Sunset
                      </span>
                      <Badge variant="outline">{sunTimes.sunset}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground pt-2">
                      Location: {currentLocation.latitude.toFixed(2)}°, {currentLocation.longitude.toFixed(2)}°
                    </p>
                  </div>
                )}

                {locationBasedEnabled && !currentLocation && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={getLocation}
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Detect Location
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Accessibility - Enhanced Phase 4.5 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Accessibility className="w-4 h-4" />
                  Accessibility
                </CardTitle>
                <CardDescription>
                  Comprehensive options for improved accessibility
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* High Contrast Mode */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="high-contrast">High Contrast Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Increase contrast for better visibility (WCAG AAA)
                    </p>
                  </div>
                  <Switch
                    id="high-contrast"
                    checked={settings.appearance.highContrast}
                    onCheckedChange={(checked) => handleSettingUpdate('appearance', 'highContrast', checked)}
                  />
                </div>

                {/* Large Text Mode */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="large-text">Large Text Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Increase base font size by 25% for better readability
                    </p>
                  </div>
                  <Switch
                    id="large-text"
                    checked={largeText}
                    onCheckedChange={(checked) => {
                      setLargeText(checked);
                      handleAccessibilityUpdate('largeText', checked);
                    }}
                  />
                </div>

                {/* Enhanced Focus Indicators */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="enhanced-focus">Enhanced Focus Indicators</Label>
                    <p className="text-sm text-muted-foreground">
                      Show prominent visual indicators for keyboard focus
                    </p>
                  </div>
                  <Switch
                    id="enhanced-focus"
                    checked={enhancedFocus}
                    onCheckedChange={(checked) => {
                      setEnhancedFocus(checked);
                      handleAccessibilityUpdate('enhancedFocus', checked);
                    }}
                  />
                </div>

                {/* Screen Reader Optimizations */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="screen-reader">Screen Reader Optimizations</Label>
                    <p className="text-sm text-muted-foreground">
                      Enhanced ARIA labels and live regions
                    </p>
                  </div>
                  <Switch
                    id="screen-reader"
                    checked={screenReaderMode}
                    onCheckedChange={(checked) => {
                      setScreenReaderMode(checked);
                      handleAccessibilityUpdate('screenReaderMode', checked);
                    }}
                  />
                </div>

                {/* Keyboard Navigation Helpers */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="keyboard-nav">Keyboard Navigation Helpers</Label>
                    <p className="text-sm text-muted-foreground">
                      Show keyboard shortcuts and skip links
                    </p>
                  </div>
                  <Switch
                    id="keyboard-nav"
                    checked={keyboardNavigation}
                    onCheckedChange={(checked) => {
                      setKeyboardNavigation(checked);
                      handleAccessibilityUpdate('keyboardNavigation', checked);
                    }}
                  />
                </div>

                {/* Reduced Motion */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="reduced-motion">Reduced Motion</Label>
                    <p className="text-sm text-muted-foreground">
                      Minimize animations for motion sensitivity
                    </p>
                  </div>
                  <Switch
                    id="reduced-motion"
                    checked={settings.appearance.reducedMotion}
                    onCheckedChange={(checked) => handleSettingUpdate('appearance', 'reducedMotion', checked)}
                  />
                </div>

                {/* Accessibility Status */}
                <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Accessibility className="w-4 h-4 mt-0.5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">Accessibility Status</p>
                      <p className="text-xs text-muted-foreground">
                        {settings.appearance.highContrast && largeText && enhancedFocus
                          ? '✓ Enhanced accessibility mode active'
                          : 'Enable more options for better accessibility'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Background Customization - Phase 4.3 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Background Customization
                </CardTitle>
                <CardDescription>
                  Personalize your workspace with a custom background
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!backgroundImage ? (
                  <Tabs defaultValue="upload" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="upload" className="gap-2">
                        <Upload className="w-4 h-4" />
                        Upload
                      </TabsTrigger>
                      <TabsTrigger value="unsplash" className="gap-2">
                        <Sparkles className="w-4 h-4" />
                        Unsplash
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="upload" className="mt-4">
                      <div>
                        <Label htmlFor="background-upload" className="cursor-pointer">
                          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm font-medium mb-1">Upload Background Image</p>
                            <p className="text-xs text-muted-foreground">
                              JPEG, PNG, WebP, or GIF (max 10MB)
                            </p>
                          </div>
                        </Label>
                        <Input
                          id="background-upload"
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={handleBackgroundUpload}
                          disabled={uploadingBackground}
                          className="hidden"
                        />
                        {uploadingBackground && (
                          <p className="text-sm text-muted-foreground text-center mt-2">
                            Uploading...
                          </p>
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="unsplash" className="mt-4">
                      <div>
                        <Button
                          variant="outline"
                          className="w-full h-auto py-8 border-2 border-dashed hover:border-primary hover:bg-muted/50 transition-colors"
                          onClick={() => setUnsplashPickerOpen(true)}
                        >
                          <div className="text-center">
                            <Sparkles className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm font-medium mb-1">Choose from Unsplash</p>
                            <p className="text-xs text-muted-foreground">
                              Millions of free professional photos
                            </p>
                          </div>
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="space-y-4">
                    {/* Image Preview */}
                    <div className="relative rounded-lg overflow-hidden border-2 border-border">
                      <div
                        className="w-full h-32 bg-cover bg-center"
                        style={{
                          backgroundImage: `url(${backgroundImage})`,
                          backgroundPosition,
                          filter: `blur(${backgroundBlur}px)`,
                          opacity: backgroundOpacity / 100,
                        }}
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={handleRemoveBackground}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Position Control */}
                    <div className="space-y-2">
                      <Label>Position</Label>
                      <Select
                        value={backgroundPosition}
                        onValueChange={(value: any) => {
                          setBackgroundPosition(value);
                          saveBackgroundPreferences(undefined, value, undefined, undefined);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="center">
                            <div className="flex items-center gap-2">
                              <Maximize className="h-4 w-4" />
                              Center
                            </div>
                          </SelectItem>
                          <SelectItem value="top">Top</SelectItem>
                          <SelectItem value="bottom">Bottom</SelectItem>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Blur Control */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>Blur: {backgroundBlur}px</Label>
                      </div>
                      <Slider
                        value={[backgroundBlur]}
                        onValueChange={([value]) => {
                          setBackgroundBlur(value);
                        }}
                        onValueCommit={([value]) => {
                          saveBackgroundPreferences(undefined, undefined, value, undefined);
                        }}
                        min={0}
                        max={20}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    {/* Opacity Control */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>Opacity: {backgroundOpacity}%</Label>
                      </div>
                      <Slider
                        value={[backgroundOpacity]}
                        onValueChange={([value]) => {
                          setBackgroundOpacity(value);
                        }}
                        onValueCommit={([value]) => {
                          saveBackgroundPreferences(undefined, undefined, undefined, value);
                        }}
                        min={0}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Font Customization - Phase 4.4 */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Type className="w-4 h-4" />
                      Font Customization
                    </CardTitle>
                    <CardDescription>
                      Customize typography for better readability
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleResetFonts}>
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Reset
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Font Family */}
                <div className="space-y-2">
                  <Label>Font Family</Label>
                  <Select
                    value={fontFamily}
                    onValueChange={(value) => {
                      setFontFamily(value);
                      saveFontPreferences(value, undefined, undefined, undefined, undefined);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inter">Inter</SelectItem>
                      <SelectItem value="system-ui">System Default</SelectItem>
                      <SelectItem value="Roboto">Roboto</SelectItem>
                      <SelectItem value="Open Sans">Open Sans</SelectItem>
                      <SelectItem value="Lato">Lato</SelectItem>
                      <SelectItem value="Montserrat">Montserrat</SelectItem>
                      <SelectItem value="Poppins">Poppins</SelectItem>
                      <SelectItem value="Source Sans Pro">Source Sans Pro</SelectItem>
                      <SelectItem value="Georgia">Georgia (Serif)</SelectItem>
                      <SelectItem value="Times New Roman">Times New Roman (Serif)</SelectItem>
                      <SelectItem value="Courier New">Courier New (Monospace)</SelectItem>
                      <SelectItem value="Monaco">Monaco (Monospace)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Font Size */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Font Size: {fontSize}px</Label>
                  </div>
                  <Slider
                    value={[fontSize]}
                    onValueChange={([value]) => {
                      setFontSize(value);
                    }}
                    onValueCommit={([value]) => {
                      saveFontPreferences(undefined, value, undefined, undefined, undefined);
                    }}
                    min={10}
                    max={24}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* Font Weight */}
                <div className="space-y-2">
                  <Label>Font Weight</Label>
                  <Select
                    value={fontWeight.toString()}
                    onValueChange={(value) => {
                      const weight = parseInt(value);
                      setFontWeight(weight);
                      saveFontPreferences(undefined, undefined, weight, undefined, undefined);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100">Thin (100)</SelectItem>
                      <SelectItem value="200">Extra Light (200)</SelectItem>
                      <SelectItem value="300">Light (300)</SelectItem>
                      <SelectItem value="400">Regular (400)</SelectItem>
                      <SelectItem value="500">Medium (500)</SelectItem>
                      <SelectItem value="600">Semi Bold (600)</SelectItem>
                      <SelectItem value="700">Bold (700)</SelectItem>
                      <SelectItem value="800">Extra Bold (800)</SelectItem>
                      <SelectItem value="900">Black (900)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Line Height */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Line Height: {lineHeight.toFixed(2)}</Label>
                  </div>
                  <Slider
                    value={[lineHeight]}
                    onValueChange={([value]) => {
                      setLineHeight(value);
                    }}
                    onValueCommit={([value]) => {
                      saveFontPreferences(undefined, undefined, undefined, value, undefined);
                    }}
                    min={1}
                    max={2.5}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                {/* Letter Spacing */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Letter Spacing: {letterSpacing.toFixed(1)}px</Label>
                  </div>
                  <Slider
                    value={[letterSpacing]}
                    onValueChange={([value]) => {
                      setLetterSpacing(value);
                    }}
                    onValueCommit={([value]) => {
                      saveFontPreferences(undefined, undefined, undefined, undefined, value);
                    }}
                    min={-2}
                    max={5}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                {/* Live Preview */}
                <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                  <Label className="text-xs text-muted-foreground mb-2 block">Live Preview</Label>
                  <div
                    style={{
                      fontFamily: fontFamily,
                      fontSize: `${fontSize}px`,
                      fontWeight: fontWeight,
                      lineHeight: lineHeight,
                      letterSpacing: `${letterSpacing}px`,
                    }}
                  >
                    <p className="mb-2">
                      The quick brown fox jumps over the lazy dog.
                    </p>
                    <p className="text-muted-foreground text-sm">
                      This is how your text will appear with the current font settings across the application.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Live Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Live Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ThemePreview />
              </CardContent>
            </Card>

            {/* Accessibility Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Accessibility className="w-5 h-5" />
                  Accessibility Features
                </CardTitle>
                <CardDescription>
                  Advanced accessibility tools and assistive features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <VoiceControl />
                <ColorBlindMode />
                <ReducedMotionMode />
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleResetToDefaults}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset to Defaults
                </Button>
              </CardContent>
            </Card>

            {/* Current Theme Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Current Theme</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Mode</span>
                  <Badge variant="outline" className="capitalize">{theme}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">High Contrast</span>
                  <Badge variant={settings.appearance.highContrast ? "default" : "secondary"}>
                    {settings.appearance.highContrast ? 'On' : 'Off'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Reduced Motion</span>
                  <Badge variant={settings.appearance.reducedMotion ? "default" : "secondary"}>
                    {settings.appearance.reducedMotion ? 'On' : 'Off'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Unsplash Photo Picker Modal */}
      <UnsplashPhotoPicker
        isOpen={unsplashPickerOpen}
        onClose={() => setUnsplashPickerOpen(false)}
        onSelect={handleUnsplashPhotoSelect}
        initialQuery="workspace background"
      />
    </div>
  );
}
