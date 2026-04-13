import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Zap,
  ZapOff,
  Info,
  CheckCircle2,
  RefreshCw,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/cn";

export function ReducedMotionMode() {
  const [isReducedMotion, setIsReducedMotion] = useState(() => {
    // Check localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("reduced-motion");
      if (saved !== null) {
        return saved === "true";
      }
      // Check system preference
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return false;
  });

  const [systemPreference, setSystemPreference] = useState(false);

  // Detect system preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setSystemPreference(mediaQuery.matches);

      const handler = (e: MediaQueryListEvent) => {
        setSystemPreference(e.matches);
      };

      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, []);

  // Apply reduced motion
  useEffect(() => {
    const root = document.documentElement;

    if (isReducedMotion) {
      root.classList.add("reduce-motion");
      root.style.setProperty("--animation-duration", "0.01ms");
      root.style.setProperty("--transition-duration", "0.01ms");
    } else {
      root.classList.remove("reduce-motion");
      root.style.removeProperty("--animation-duration");
      root.style.removeProperty("--transition-duration");
    }

    // Save to localStorage
    localStorage.setItem("reduced-motion", isReducedMotion.toString());
  }, [isReducedMotion]);

  const handleToggle = (enabled: boolean) => {
    setIsReducedMotion(enabled);
  };

  const useSystemPreference = () => {
    setIsReducedMotion(systemPreference);
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {isReducedMotion ? (
              <ZapOff className="h-5 w-5 text-gray-600" aria-hidden="true" />
            ) : (
              <Zap className="h-5 w-5 text-yellow-600" aria-hidden="true" />
            )}
            Reduced Motion Mode
          </CardTitle>
          <div className="flex items-center gap-3">
            {isReducedMotion && (
              <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                Active
              </Badge>
            )}
            <div className="flex items-center gap-2">
              <Switch
                id="reduced-motion-toggle"
                checked={isReducedMotion}
                onCheckedChange={handleToggle}
              />
              <Label htmlFor="reduced-motion-toggle" className="text-sm">
                {isReducedMotion ? "Enabled" : "Disabled"}
              </Label>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Minimize animations and transitions for users with vestibular disorders
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* System Preference Detection */}
        {systemPreference && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <Eye className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm text-blue-900 dark:text-blue-200">
                  <strong>System Preference Detected:</strong> Your operating system is set to prefer reduced motion.
                  {!isReducedMotion && (
                    <>
                      {" "}Would you like to enable reduced motion mode?
                    </>
                  )}
                </div>
                {!isReducedMotion && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={useSystemPreference}
                    className="mt-2"
                  >
                    Use System Preference
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Status Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className={cn(
            "p-4 border rounded-lg transition-colors",
            isReducedMotion
              ? "border-green-500 bg-green-50 dark:bg-green-900/20"
              : "border-border bg-background/50"
          )}>
            <div className="flex items-center gap-2 mb-2">
              {isReducedMotion ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <ZapOff className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-xs text-muted-foreground">Animations</span>
            </div>
            <div className="text-xl font-bold">
              {isReducedMotion ? "Disabled" : "Enabled"}
            </div>
          </div>

          <div className={cn(
            "p-4 border rounded-lg transition-colors",
            isReducedMotion
              ? "border-green-500 bg-green-50 dark:bg-green-900/20"
              : "border-border bg-background/50"
          )}>
            <div className="flex items-center gap-2 mb-2">
              {isReducedMotion ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <ZapOff className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-xs text-muted-foreground">Transitions</span>
            </div>
            <div className="text-xl font-bold">
              {isReducedMotion ? "Minimized" : "Normal"}
            </div>
          </div>
        </div>

        {/* Demo Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Animation Preview</h4>
            <span className="text-xs text-muted-foreground">
              {isReducedMotion ? "Animations are disabled" : "Animations are enabled"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Spinning Animation */}
            <div className="p-4 border border-border rounded-lg bg-background/50">
              <div className="flex flex-col items-center gap-3">
                <div className={cn(
                  "h-12 w-12 rounded-full border-4 border-blue-600 border-t-transparent",
                  !isReducedMotion && "animate-spin"
                )}></div>
                <span className="text-xs text-muted-foreground">Spinning</span>
              </div>
            </div>

            {/* Pulse Animation */}
            <div className="p-4 border border-border rounded-lg bg-background/50">
              <div className="flex flex-col items-center gap-3">
                <div className={cn(
                  "h-12 w-12 rounded-full bg-green-600",
                  !isReducedMotion && "animate-pulse"
                )}></div>
                <span className="text-xs text-muted-foreground">Pulsing</span>
              </div>
            </div>

            {/* Bounce Animation */}
            <div className="p-4 border border-border rounded-lg bg-background/50">
              <div className="flex flex-col items-center gap-3">
                <div className={cn(
                  "h-12 w-12 rounded-lg bg-purple-600",
                  !isReducedMotion && "animate-bounce"
                )}></div>
                <span className="text-xs text-muted-foreground">Bouncing</span>
              </div>
            </div>

            {/* Fade Animation */}
            <div className="p-4 border border-border rounded-lg bg-background/50">
              <div className="flex flex-col items-center gap-3">
                <div className={cn(
                  "h-12 w-12 rounded-lg bg-orange-600",
                  !isReducedMotion && "animate-pulse opacity-50"
                )}></div>
                <span className="text-xs text-muted-foreground">Fading</span>
              </div>
            </div>
          </div>
        </div>

        {/* What Gets Disabled */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">What Gets Affected</h4>
          <div className="space-y-2">
            <div className="flex items-start gap-3 p-3 border border-border rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <div className="font-medium mb-1">Page Transitions</div>
                <div className="text-xs text-muted-foreground">
                  Smooth scrolling and page transitions are removed
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 border border-border rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <div className="font-medium mb-1">Loading Animations</div>
                <div className="text-xs text-muted-foreground">
                  Spinners and progress bars use instant states instead of animations
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 border border-border rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <div className="font-medium mb-1">UI Transitions</div>
                <div className="text-xs text-muted-foreground">
                  Buttons, dropdowns, and modals appear instantly without fade effects
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 border border-border rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <div className="font-medium mb-1">Hover Effects</div>
                <div className="text-xs text-muted-foreground">
                  Hover state changes happen instantly without smooth transitions
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Information */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-900 dark:text-blue-200">
              <strong>About Reduced Motion:</strong> This feature is designed for users with vestibular disorders
              or those who experience discomfort from animations and motion effects. Enabling this mode removes
              or significantly reduces animations, transitions, and parallax effects throughout the interface.
              The system automatically detects your OS preference and can apply it automatically.
            </div>
          </div>
        </div>

        {/* Active Status */}
        {isReducedMotion && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-green-900 dark:text-green-200">
                <strong>Reduced Motion Active:</strong> Animations and transitions are now minimized across
                the entire dashboard. You can disable this mode at any time using the toggle above.
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

