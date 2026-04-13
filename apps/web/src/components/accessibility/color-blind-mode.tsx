import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Eye,
  Palette,
  CheckCircle2,
  RefreshCw,
  Info,
} from "lucide-react";
import { cn } from "@/lib/cn";

type ColorBlindMode = "normal" | "protanopia" | "deuteranopia" | "tritanopia" | "achromatopsia";

interface ColorBlindProfile {
  id: ColorBlindMode;
  name: string;
  description: string;
  affected: string;
  prevalence: string;
  cssFilter: string;
}

const COLOR_BLIND_PROFILES: ColorBlindProfile[] = [
  {
    id: "normal",
    name: "Normal Vision",
    description: "Standard color vision with no adjustments",
    affected: "None",
    prevalence: "~90% of population",
    cssFilter: "none",
  },
  {
    id: "protanopia",
    name: "Protanopia (Red-Blind)",
    description: "Difficulty distinguishing between red and green colors",
    affected: "Red-sensitive cones",
    prevalence: "~1% of males",
    cssFilter: `
      contrast(1.1)
      sepia(0.3)
      saturate(0.8)
      hue-rotate(-10deg)
    `,
  },
  {
    id: "deuteranopia",
    name: "Deuteranopia (Green-Blind)",
    description: "Difficulty distinguishing between green and red colors",
    affected: "Green-sensitive cones",
    prevalence: "~1% of males",
    cssFilter: `
      contrast(1.1)
      sepia(0.2)
      saturate(0.9)
      hue-rotate(10deg)
    `,
  },
  {
    id: "tritanopia",
    name: "Tritanopia (Blue-Blind)",
    description: "Difficulty distinguishing between blue and yellow colors",
    affected: "Blue-sensitive cones",
    prevalence: "~0.001% of population",
    cssFilter: `
      contrast(1.15)
      saturate(0.7)
      hue-rotate(-5deg)
      brightness(1.05)
    `,
  },
  {
    id: "achromatopsia",
    name: "Achromatopsia (Total Color Blindness)",
    description: "Complete absence of color vision, seeing only in grayscale",
    affected: "All cone cells",
    prevalence: "~0.003% of population",
    cssFilter: "grayscale(100%) contrast(1.2)",
  },
];

// Demo color palette for preview
const DEMO_COLORS = [
  { name: "Primary", class: "bg-blue-600" },
  { name: "Success", class: "bg-green-600" },
  { name: "Warning", class: "bg-yellow-600" },
  { name: "Danger", class: "bg-red-600" },
  { name: "Info", class: "bg-cyan-600" },
  { name: "Purple", class: "bg-purple-600" },
];

export function ColorBlindMode() {
  const [selectedMode, setSelectedMode] = useState<ColorBlindMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("color-blind-mode") as ColorBlindMode) || "normal";
    }
    return "normal";
  });

  // Apply color blind mode
  useEffect(() => {
    const root = document.documentElement;
    const currentProfile = COLOR_BLIND_PROFILES.find(p => p.id === selectedMode);

    if (currentProfile && currentProfile.cssFilter !== "none") {
      root.style.filter = currentProfile.cssFilter;
      root.setAttribute("data-color-blind-mode", selectedMode);
    } else {
      root.style.filter = "";
      root.removeAttribute("data-color-blind-mode");
    }

    // Save to localStorage
    localStorage.setItem("color-blind-mode", selectedMode);
  }, [selectedMode]);

  const handleModeChange = (mode: ColorBlindMode) => {
    setSelectedMode(mode);
  };

  const handleReset = () => {
    setSelectedMode("normal");
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette className="h-5 w-5 text-purple-600" aria-hidden="true" />
            Color Blind Mode
          </CardTitle>
          <div className="flex items-center gap-3">
            {selectedMode !== "normal" && (
              <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                {COLOR_BLIND_PROFILES.find(p => p.id === selectedMode)?.name}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={selectedMode === "normal"}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Adjust color display for different types of color blindness
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Color Vision Profiles */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Select Color Vision Profile</h4>
          <RadioGroup value={selectedMode} onValueChange={(value) => handleModeChange(value as ColorBlindMode)}>
            <div className="space-y-3">
              {COLOR_BLIND_PROFILES.map((profile) => (
                <div key={profile.id} className="relative">
                  <div
                    className={cn(
                      "p-4 border rounded-lg cursor-pointer transition-all",
                      selectedMode === profile.id
                        ? "border-primary bg-primary/5 ring-2 ring-primary ring-offset-2"
                        : "border-border hover:bg-muted/30"
                    )}
                    onClick={() => handleModeChange(profile.id)}
                  >
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value={profile.id} id={profile.id} className="mt-1" />
                      <div className="flex-1">
                        <Label
                          htmlFor={profile.id}
                          className="text-sm font-medium cursor-pointer flex items-center gap-2"
                        >
                          {profile.name}
                          {selectedMode === profile.id && (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          )}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {profile.description}
                        </p>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Affected:</span>
                            <span className="ml-1 font-medium">{profile.affected}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Prevalence:</span>
                            <span className="ml-1 font-medium">{profile.prevalence}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>

        {/* Color Preview */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Color Preview
          </h4>
          <div className="p-4 border border-border rounded-lg bg-background/50">
            <div className="grid grid-cols-3 gap-3">
              {DEMO_COLORS.map((color) => (
                <div key={color.name} className="space-y-2">
                  <div className={cn("h-16 rounded-lg shadow-sm", color.class)}></div>
                  <div className="text-center text-xs font-medium">{color.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Gradient Preview */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Gradient Preview</h4>
          <div className="space-y-2">
            <div className="h-12 rounded-lg bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"></div>
            <div className="h-12 rounded-lg bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
            <div className="h-12 rounded-lg bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500"></div>
          </div>
        </div>

        {/* Status Indicator Preview */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Status Indicators Preview</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 border border-green-200 rounded-lg bg-green-50 dark:bg-green-900/20">
              <CheckCircle2 className="h-5 w-5 text-green-600 mb-1" />
              <div className="text-xs font-medium">Success</div>
            </div>
            <div className="p-3 border border-yellow-200 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
              <Info className="h-5 w-5 text-yellow-600 mb-1" />
              <div className="text-xs font-medium">Warning</div>
            </div>
            <div className="p-3 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20">
              <Info className="h-5 w-5 text-red-600 mb-1" />
              <div className="text-xs font-medium">Error</div>
            </div>
            <div className="p-3 border border-blue-200 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <Info className="h-5 w-5 text-blue-600 mb-1" />
              <div className="text-xs font-medium">Info</div>
            </div>
          </div>
        </div>

        {/* Chart Colors Preview */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Chart Colors Preview</h4>
          <div className="p-4 border border-border rounded-lg bg-background/50">
            <div className="flex items-end justify-between gap-2 h-32">
              {[65, 45, 80, 35, 90, 55, 70, 40].map((height, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex-1 rounded-t transition-all",
                    index % 4 === 0 && "bg-blue-500",
                    index % 4 === 1 && "bg-green-500",
                    index % 4 === 2 && "bg-purple-500",
                    index % 4 === 3 && "bg-orange-500"
                  )}
                  style={{ height: `${height}%` }}
                ></div>
              ))}
            </div>
          </div>
        </div>

        {/* Information */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-900 dark:text-blue-200">
              <strong>About Color Blind Modes:</strong> These filters simulate different types of color vision
              deficiency to help designers and developers ensure their interfaces are accessible. The selected
              mode affects the entire dashboard. Users with color blindness can select the appropriate mode
              to enhance their viewing experience.
            </div>
          </div>
        </div>

        {/* Accessibility Tips */}
        {selectedMode !== "normal" && (
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <div className="flex items-start gap-3">
              <Eye className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-purple-900 dark:text-purple-200">
                <strong>Active Mode:</strong> You're currently viewing the dashboard in {COLOR_BLIND_PROFILES.find(p => p.id === selectedMode)?.name} mode.
                This affects how colors are displayed across the entire interface. You can switch back to Normal Vision at any time.
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

