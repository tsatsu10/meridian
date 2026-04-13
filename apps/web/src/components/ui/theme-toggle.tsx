import React from "react";
import { Button } from "./button";
import { Sun, Moon, Monitor } from "lucide-react";
import useTheme from "@/components/providers/theme-provider/hooks/use-theme";

interface ThemeToggleProps {
  className?: string;
  showLabels?: boolean;
}

export function ThemeToggle({ className, showLabels = true }: ThemeToggleProps) {
  const { theme, setTheme, clearThemeStorage } = useTheme();

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    if (newTheme === "light") {
      // Clear storage to ensure light mode is applied
      clearThemeStorage();
    }
    setTheme(newTheme);
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Button
        variant={theme === "light" ? "default" : "outline"}
        size="sm"
        onClick={() => handleThemeChange("light")}
        className="flex items-center gap-2"
      >
        <Sun className="h-4 w-4" />
        {showLabels && "Light"}
      </Button>
      
      <Button
        variant={theme === "dark" ? "default" : "outline"}
        size="sm"
        onClick={() => handleThemeChange("dark")}
        className="flex items-center gap-2"
      >
        <Moon className="h-4 w-4" />
        {showLabels && "Dark"}
      </Button>
      
      <Button
        variant={theme === "system" ? "default" : "outline"}
        size="sm"
        onClick={() => handleThemeChange("system")}
        className="flex items-center gap-2"
      >
        <Monitor className="h-4 w-4" />
        {showLabels && "System"}
      </Button>
    </div>
  );
} 