import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Contrast } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

/**
 * High Contrast Toggle Component
 * 
 * Provides accessibility-focused theme options:
 * - Light mode (default)
 * - Dark mode
 * - High contrast light
 * - High contrast dark
 * 
 * Persists preference to localStorage
 * Applies CSS classes to document root
 * 
 * @example
 * ```tsx
 * <HighContrastToggle />
 * ```
 */

type ThemeMode = "light" | "dark" | "high-contrast-light" | "high-contrast-dark";

const themes = [
  {
    value: "light" as const,
    label: "Light",
    icon: Sun,
    description: "Default light theme",
  },
  {
    value: "dark" as const,
    label: "Dark",
    icon: Moon,
    description: "Default dark theme",
  },
  {
    value: "high-contrast-light" as const,
    label: "High Contrast Light",
    icon: Contrast,
    description: "WCAG AAA compliant light theme",
  },
  {
    value: "high-contrast-dark" as const,
    label: "High Contrast Dark",
    icon: Contrast,
    description: "WCAG AAA compliant dark theme",
  },
];

export function HighContrastToggle({ className }: { className?: string }) {
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(() => {
    // Check localStorage first
    const stored = localStorage.getItem("meridian-theme");
    if (stored && themes.some(t => t.value === stored)) {
      return stored as ThemeMode;
    }
    
    // Fall back to system preference
    const prefersDark = window.matchMedia("(prefers-contrast: more)").matches;
    return prefersDark ? "high-contrast-dark" : "light";
  });

  useEffect(() => {
    // Apply theme to document
    applyTheme(currentTheme);
    
    // Save to localStorage
    localStorage.setItem("meridian-theme", currentTheme);
    
    // Announce to screen readers
    announceThemeChange(currentTheme);
  }, [currentTheme]);

  const applyTheme = (theme: ThemeMode) => {
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove("light", "dark", "high-contrast-light", "high-contrast-dark");
    
    // Add current theme class
    root.classList.add(theme);
    
    // Set data attribute for CSS targeting
    root.setAttribute("data-theme", theme);
    
    // Apply high contrast specific styles
    if (theme.startsWith("high-contrast")) {
      root.style.setProperty("--contrast-ratio", "7");
    } else {
      root.style.setProperty("--contrast-ratio", "4.5");
    }
  };

  const announceThemeChange = (theme: ThemeMode) => {
    const announcement = `Theme changed to ${themes.find(t => t.value === theme)?.label}`;
    
    // Create temporary element for screen reader announcement
    const liveRegion = document.createElement("div");
    liveRegion.setAttribute("role", "status");
    liveRegion.setAttribute("aria-live", "polite");
    liveRegion.className = "sr-only";
    liveRegion.textContent = announcement;
    
    document.body.appendChild(liveRegion);
    
    setTimeout(() => {
      document.body.removeChild(liveRegion);
    }, 1000);
  };

  const handleThemeChange = (theme: ThemeMode) => {
    setCurrentTheme(theme);
  };

  const currentThemeData = themes.find(t => t.value === currentTheme);
  const Icon = currentThemeData?.icon || Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative", className)}
          aria-label="Change theme and contrast"
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">
            Current theme: {currentThemeData?.label}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 py-1.5">
          <p className="text-sm font-semibold">Theme & Contrast</p>
          <p className="text-xs text-muted-foreground">
            Choose your preferred appearance
          </p>
        </div>
        <DropdownMenuSeparator />
        {themes.map((theme) => {
          const ThemeIcon = theme.icon;
          const isActive = currentTheme === theme.value;
          
          return (
            <DropdownMenuItem
              key={theme.value}
              onClick={() => handleThemeChange(theme.value)}
              className={cn(
                "flex flex-col items-start gap-1 py-3",
                isActive && "bg-accent"
              )}
              role="menuitemradio"
              aria-checked={isActive}
            >
              <div className="flex items-center gap-2 w-full">
                <ThemeIcon className="h-4 w-4" aria-hidden="true" />
                <span className="font-medium">{theme.label}</span>
                {isActive && (
                  <span className="ml-auto text-xs text-primary" aria-hidden="true">
                    ✓
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {theme.description}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default HighContrastToggle;

