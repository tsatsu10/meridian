import { useCallback, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Type,
} from "lucide-react";
import { useThemeSync } from "@/hooks/use-theme-sync";
import { useSettingsStore, type AppearanceSettings } from "@/store/settings";
import { toast } from "sonner";
import { userMessage } from "@/lib/user-message";
import { API_BASE_URL } from "@/constants/urls";
import { getSunTimes } from "@/lib/theme/auto-theme";
import PageTitle from "@/components/page-title";

// Import Accessibility Components
import { VoiceControl } from "@/components/accessibility/voice-control";
import { ColorBlindMode } from "@/components/accessibility/color-blind-mode";
import { ReducedMotionMode } from "@/components/accessibility/reduced-motion-mode";
import { withErrorBoundary } from "@/components/dashboard/universal-error-boundary";

export const Route = createFileRoute("/dashboard/settings/appearance")({
  component: withErrorBoundary(AppearanceSettingsPage, "Appearance Settings"),
});

/**
 * Only families the app can actually render are offered.
 *
 * The list used to include Roboto, Open Sans, Lato, Montserrat, Poppins and
 * Source Sans Pro, none of which are loaded — index.html pulls only Inter and
 * Space Grotesk from Google Fonts — so picking one silently fell back to the
 * default on any machine without it installed. What remains is the two loaded
 * webfonts plus generic stacks every OS resolves.
 */
const FONT_FAMILIES = [
  { value: "Inter", label: "Inter" },
  { value: "Space Grotesk", label: "Space Grotesk" },
  { value: "system-ui", label: "System Default" },
  { value: "Georgia, serif", label: "Georgia (Serif)" },
  { value: "ui-monospace, monospace", label: "Monospace" },
];

const FONT_WEIGHTS = [
  { value: "300", label: "Light (300)" },
  { value: "400", label: "Regular (400)" },
  { value: "500", label: "Medium (500)" },
  { value: "600", label: "Semi Bold (600)" },
  { value: "700", label: "Bold (700)" },
];

const BACKGROUND_POSITIONS = [
  { value: "center", label: "Center" },
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
] as const;

const ALLOWED_BACKGROUND_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const MAX_BACKGROUND_BYTES = 10 * 1024 * 1024;

function formatTime(date: Date) {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AppearanceSettingsPage() {
  const { theme, effectiveTheme, setTheme, autoThemeActive } = useThemeSync();
  const { settings, updateSettings, resetSection } = useSettingsStore();
  const appearance = settings.appearance;

  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

  /**
   * Every control on this page writes through here. Appearance settings are a
   * single persisted section, so there is no longer a second store to fall out
   * of sync with: the four accessibility toggles used to be local state written
   * to /api/settings but read back from /api/user-preferences, and typography
   * and background were local state written to endpoints with no read side at
   * all. All of it now round-trips through the same place as theme and
   * highContrast, which always worked.
   */
  const update = useCallback(
    async (updates: Partial<AppearanceSettings>) => {
      try {
        await updateSettings("appearance", updates);
      } catch (error) {
        console.error("Failed to update appearance settings:", error);
        toast.error(userMessage(error, "save that setting"));
      }
    },
    [updateSettings],
  );

  const sunTimes =
    appearance.locationLatitude !== null &&
    appearance.locationLongitude !== null
      ? getSunTimes(
          new Date(),
          appearance.locationLatitude,
          appearance.locationLongitude,
        )
      : null;

  const detectLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation is not supported by your browser");
      update({ locationBasedEnabled: false });
      return;
    }

    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDetectingLocation(false);
        const { latitude, longitude } = position.coords;
        // Persisted, unlike before: the coordinates used to live in component
        // state, so after a reload the setting stayed switched on while the
        // schedule it drove had nothing to work from.
        update({
          locationLatitude: latitude,
          locationLongitude: longitude,
        });
        toast.success("Location detected");
      },
      (error) => {
        setDetectingLocation(false);
        console.error("Geolocation failed:", error);
        toast.error(
          "Could not detect location. Please enable location services.",
        );
        update({ locationBasedEnabled: false });
      },
    );
  }, [update]);

  const handleResetToDefaults = useCallback(async () => {
    // One atomic reset of the whole section. This used to fire four separate
    // updates in a row, which the settings store's throttle silently collapsed
    // into one — so the button changed nothing at all while still reporting
    // success — and it left the accessibility toggles, typography and
    // background untouched even in principle.
    await resetSection("appearance");
    toast.success("Appearance reset to defaults");
  }, [resetSection]);

  const handleBackgroundUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      if (file.size > MAX_BACKGROUND_BYTES) {
        toast.error("File size must be less than 10MB");
        return;
      }

      if (!ALLOWED_BACKGROUND_TYPES.includes(file.type)) {
        toast.error("Only JPEG, PNG, WebP, and GIF images are allowed");
        return;
      }

      setUploadingBackground(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(
          `${API_BASE_URL}/user-preferences/background/upload`,
          {
            method: "POST",
            credentials: "include",
            body: formData,
          },
        );

        if (!response.ok) {
          throw new Error(`Upload failed with ${response.status}`);
        }

        // The API stores a re-encoded file and returns its URL; this used to be
        // a multi-megabyte base64 data URL.
        const data = (await response.json()) as { imageUrl?: string };
        if (!data.imageUrl) {
          throw new Error("Upload response contained no image URL");
        }

        await update({ backgroundImage: data.imageUrl });
        toast.success("Background image uploaded");
      } catch (error) {
        console.error("Background upload failed:", error);
        toast.error(userMessage(error, "upload the background image"));
      } finally {
        setUploadingBackground(false);
        // Let the same file be chosen again after a failure.
        event.target.value = "";
      }
    },
    [update],
  );

  const handleRemoveBackground = useCallback(async () => {
    await update({ backgroundImage: null });
    toast.success("Background image removed");
  }, [update]);

  const ThemePreview = () => (
    <div className="space-y-4 p-4 border rounded-lg bg-background">
      <h4 className="font-medium text-sm">Theme Preview</h4>

      <div className="grid grid-cols-2 gap-3">
        <Button size="sm">Primary</Button>
        <Button variant="outline" size="sm">
          Outline
        </Button>
        <Button variant="secondary" size="sm">
          Secondary
        </Button>
        <Button variant="ghost" size="sm">
          Ghost
        </Button>
      </div>

      <div className="space-y-2">
        <Input placeholder="Input field" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="destructive">Destructive</Badge>
      </div>

      <div className="p-3 bg-muted rounded-md text-sm">
        <p className="text-muted-foreground">
          This is how text appears in your current theme. The preview updates in
          real-time as you change settings.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <PageTitle title="Appearance" />
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
                    variant={theme === "light" ? "default" : "outline"}
                    onClick={() => setTheme("light")}
                    className="flex flex-col items-center gap-2 h-auto py-4"
                  >
                    <Sun className="w-5 h-5" />
                    <span className="text-sm font-medium">Light</span>
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    onClick={() => setTheme("dark")}
                    className="flex flex-col items-center gap-2 h-auto py-4"
                  >
                    <Moon className="w-5 h-5" />
                    <span className="text-sm font-medium">Dark</span>
                  </Button>
                  <Button
                    variant={theme === "system" ? "default" : "outline"}
                    onClick={() => setTheme("system")}
                    className="flex flex-col items-center gap-2 h-auto py-4"
                  >
                    <Monitor className="w-5 h-5" />
                    <span className="text-sm font-medium">System</span>
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  System theme matches your device settings
                </p>
                {autoThemeActive && (
                  <p className="text-sm text-muted-foreground">
                    A schedule below is currently overriding this choice —
                    showing the <strong>{effectiveTheme}</strong> theme.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Scheduled Theme Switching */}
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
                    <Label htmlFor="scheduled-theme">
                      Enable Scheduled Switching
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Theme changes automatically at set times
                    </p>
                  </div>
                  <Switch
                    id="scheduled-theme"
                    checked={appearance.scheduledThemeEnabled}
                    onCheckedChange={(checked) =>
                      update({ scheduledThemeEnabled: checked })
                    }
                  />
                </div>

                {appearance.scheduledThemeEnabled && (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <Label
                        htmlFor="light-time"
                        className="flex items-center gap-2"
                      >
                        <Sun className="w-3 h-3" />
                        Light Theme Time
                      </Label>
                      <Input
                        id="light-time"
                        type="time"
                        value={appearance.lightThemeTime}
                        onChange={(e) =>
                          update({ lightThemeTime: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="dark-time"
                        className="flex items-center gap-2"
                      >
                        <Moon className="w-3 h-3" />
                        Dark Theme Time
                      </Label>
                      <Input
                        id="dark-time"
                        type="time"
                        value={appearance.darkThemeTime}
                        onChange={(e) =>
                          update({ darkThemeTime: e.target.value })
                        }
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Location-Based Theme */}
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
                    <Label htmlFor="location-theme">
                      Enable Location-Based
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Theme follows day/night cycle
                    </p>
                  </div>
                  <Switch
                    id="location-theme"
                    checked={appearance.locationBasedEnabled}
                    onCheckedChange={(checked) => {
                      update({ locationBasedEnabled: checked });
                      if (checked && appearance.locationLatitude === null) {
                        detectLocation();
                      }
                    }}
                  />
                </div>

                {appearance.locationBasedEnabled &&
                  appearance.locationLatitude !== null &&
                  appearance.locationLongitude !== null && (
                    <div className="p-3 bg-muted rounded-md space-y-2 text-sm">
                      {sunTimes ? (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-muted-foreground">
                              <Sunrise className="w-4 h-4" />
                              Sunrise
                            </span>
                            <Badge variant="outline">
                              {formatTime(sunTimes.sunrise)}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-muted-foreground">
                              <Sunset className="w-4 h-4" />
                              Sunset
                            </span>
                            <Badge variant="outline">
                              {formatTime(sunTimes.sunset)}
                            </Badge>
                          </div>
                        </>
                      ) : (
                        <p className="text-muted-foreground">
                          At your latitude the sun neither rises nor sets today,
                          so there is nothing to follow. Your manual theme
                          choice (or the schedule above) applies instead.
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground pt-2">
                        Location: {appearance.locationLatitude.toFixed(2)}°,{" "}
                        {appearance.locationLongitude.toFixed(2)}°
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={detectLocation}
                        disabled={detectingLocation}
                      >
                        <MapPin className="w-4 h-4 mr-2" />
                        {detectingLocation ? "Detecting…" : "Update Location"}
                      </Button>
                    </div>
                  )}

                {appearance.locationBasedEnabled &&
                  appearance.locationLatitude === null && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={detectLocation}
                      disabled={detectingLocation}
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      {detectingLocation ? "Detecting…" : "Detect Location"}
                    </Button>
                  )}
              </CardContent>
            </Card>

            {/* Accessibility */}
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
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="high-contrast">High Contrast Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Increase contrast for better visibility (WCAG AAA)
                    </p>
                  </div>
                  <Switch
                    id="high-contrast"
                    checked={appearance.highContrast}
                    onCheckedChange={(checked) =>
                      update({ highContrast: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="large-text">Large Text Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Increase base font size by 25% for better readability
                    </p>
                  </div>
                  <Switch
                    id="large-text"
                    checked={appearance.largeText}
                    onCheckedChange={(checked) =>
                      update({ largeText: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="enhanced-focus">
                      Enhanced Focus Indicators
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Show prominent visual indicators for keyboard focus
                    </p>
                  </div>
                  <Switch
                    id="enhanced-focus"
                    checked={appearance.enhancedFocus}
                    onCheckedChange={(checked) =>
                      update({ enhancedFocus: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="screen-reader">
                      Screen Reader Optimizations
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Enhanced ARIA labels and live regions
                    </p>
                  </div>
                  <Switch
                    id="screen-reader"
                    checked={appearance.screenReaderMode}
                    onCheckedChange={(checked) =>
                      update({ screenReaderMode: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="keyboard-nav">
                      Keyboard Navigation Helpers
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Show keyboard shortcuts and skip links
                    </p>
                  </div>
                  <Switch
                    id="keyboard-nav"
                    checked={appearance.keyboardNavigation}
                    onCheckedChange={(checked) =>
                      update({ keyboardNavigation: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="reduced-motion">Reduced Motion</Label>
                    <p className="text-sm text-muted-foreground">
                      Minimize animations for motion sensitivity
                    </p>
                  </div>
                  <Switch
                    id="reduced-motion"
                    checked={appearance.reducedMotion}
                    onCheckedChange={(checked) =>
                      update({ reducedMotion: checked })
                    }
                  />
                </div>

                {/* Accessibility Status */}
                <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Accessibility className="w-4 h-4 mt-0.5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">
                        Accessibility Status
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {/* Counts what's on rather than demanding one arbitrary
                            trio of options be enabled together. */}
                        {(() => {
                          const enabled = [
                            appearance.highContrast,
                            appearance.largeText,
                            appearance.enhancedFocus,
                            appearance.screenReaderMode,
                            appearance.keyboardNavigation,
                            appearance.reducedMotion,
                          ].filter(Boolean).length;

                          if (enabled === 0) {
                            return "No accessibility options enabled";
                          }
                          return `${enabled} of 6 accessibility options enabled`;
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Background Customization */}
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
                {!appearance.backgroundImage ? (
                  <div>
                    <Label
                      htmlFor="background-upload"
                      className="cursor-pointer"
                    >
                      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium mb-1">
                          Upload Background Image
                        </p>
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
                ) : (
                  <div className="space-y-4">
                    {/* Image Preview */}
                    <div className="relative rounded-lg overflow-hidden border-2 border-border">
                      <div
                        className="w-full h-32 bg-cover"
                        style={{
                          backgroundImage: `url(${appearance.backgroundImage})`,
                          backgroundPosition: appearance.backgroundPosition,
                          filter: `blur(${appearance.backgroundBlur}px)`,
                          opacity: appearance.backgroundOpacity / 100,
                        }}
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={handleRemoveBackground}
                        aria-label="Remove background image"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Position Control */}
                    <div className="space-y-2">
                      <Label htmlFor="background-position">Position</Label>
                      <Select
                        value={appearance.backgroundPosition}
                        onValueChange={(value) =>
                          update({
                            backgroundPosition:
                              value as AppearanceSettings["backgroundPosition"],
                          })
                        }
                      >
                        <SelectTrigger id="background-position">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BACKGROUND_POSITIONS.map((position) => (
                            <SelectItem
                              key={position.value}
                              value={position.value}
                            >
                              {position.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Blur Control */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>Blur: {appearance.backgroundBlur}px</Label>
                      </div>
                      <Slider
                        value={[appearance.backgroundBlur]}
                        onValueCommit={([value]) =>
                          update({ backgroundBlur: value })
                        }
                        min={0}
                        max={20}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    {/* Opacity Control */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>Opacity: {appearance.backgroundOpacity}%</Label>
                      </div>
                      <Slider
                        value={[appearance.backgroundOpacity]}
                        onValueCommit={([value]) =>
                          update({ backgroundOpacity: value })
                        }
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

            {/* Font Customization */}
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      update({
                        fontFamily: "Inter",
                        fontSize: 16,
                        fontWeight: 400,
                        lineHeight: 1.5,
                        letterSpacing: 0,
                      })
                    }
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Reset
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Font Family */}
                <div className="space-y-2">
                  <Label htmlFor="font-family">Font Family</Label>
                  <Select
                    value={appearance.fontFamily}
                    onValueChange={(value) => update({ fontFamily: value })}
                  >
                    <SelectTrigger id="font-family">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_FAMILIES.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Font Size */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Font Size: {appearance.fontSize}px</Label>
                  </div>
                  <Slider
                    value={[appearance.fontSize]}
                    onValueCommit={([value]) => update({ fontSize: value })}
                    min={10}
                    max={24}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* Font Weight */}
                <div className="space-y-2">
                  <Label htmlFor="font-weight">Font Weight</Label>
                  <Select
                    value={appearance.fontWeight.toString()}
                    onValueChange={(value) =>
                      update({ fontWeight: Number.parseInt(value, 10) })
                    }
                  >
                    <SelectTrigger id="font-weight">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_WEIGHTS.map((weight) => (
                        <SelectItem key={weight.value} value={weight.value}>
                          {weight.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Line Height */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>
                      Line Height: {appearance.lineHeight.toFixed(2)}
                    </Label>
                  </div>
                  <Slider
                    value={[appearance.lineHeight]}
                    onValueCommit={([value]) => update({ lineHeight: value })}
                    min={1}
                    max={2.5}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                {/* Letter Spacing */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>
                      Letter Spacing: {appearance.letterSpacing.toFixed(1)}px
                    </Label>
                  </div>
                  <Slider
                    value={[appearance.letterSpacing]}
                    onValueCommit={([value]) =>
                      update({ letterSpacing: value })
                    }
                    min={-2}
                    max={5}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  These settings apply across the whole application, so this
                  page updates as you change them.
                </p>
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
                  <Badge variant="outline" className="capitalize">
                    {theme}
                  </Badge>
                </div>
                {autoThemeActive && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Currently showing
                    </span>
                    <Badge variant="outline" className="capitalize">
                      {effectiveTheme}
                    </Badge>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">High Contrast</span>
                  <Badge
                    variant={appearance.highContrast ? "default" : "secondary"}
                  >
                    {appearance.highContrast ? "On" : "Off"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Reduced Motion</span>
                  <Badge
                    variant={appearance.reducedMotion ? "default" : "secondary"}
                  >
                    {appearance.reducedMotion ? "On" : "Off"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
