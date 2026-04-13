"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BlurFade } from "@/components/magicui/blur-fade";
import NumberTicker from "@/components/magicui/number-ticker";
import { cn } from "@/lib/cn";
import { LucideIcon } from "lucide-react";

interface AnimatedStatsCardProps {
  title: string;
  value: number;
  previousValue?: number;
  icon: LucideIcon;
  description?: string;
  delay?: number;
  className?: string;
  decimalPlaces?: number;
  prefix?: string;
  suffix?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: number;
  colorScheme?: "primary" | "success" | "warning" | "danger" | "info";
}

const colorSchemes = {
  primary: {
    gradient: "from-violet-500 to-purple-500",
    bg: "bg-violet-50 dark:bg-violet-950/20",
    text: "text-violet-700 dark:text-violet-300",
    icon: "text-violet-500",
  },
  success: {
    gradient: "from-green-500 to-emerald-500",
    bg: "bg-green-50 dark:bg-green-950/20",
    text: "text-green-700 dark:text-green-300",
    icon: "text-green-500",
  },
  warning: {
    gradient: "from-yellow-500 to-orange-500",
    bg: "bg-yellow-50 dark:bg-yellow-950/20",
    text: "text-yellow-700 dark:text-yellow-300",
    icon: "text-yellow-500",
  },
  danger: {
    gradient: "from-red-500 to-rose-500",
    bg: "bg-red-50 dark:bg-red-950/20",
    text: "text-red-700 dark:text-red-300",
    icon: "text-red-500",
  },
  info: {
    gradient: "from-blue-500 to-cyan-500",
    bg: "bg-blue-50 dark:bg-blue-950/20",
    text: "text-blue-700 dark:text-blue-300",
    icon: "text-blue-500",
  },
};

export default function AnimatedStatsCard({
  title,
  value,
  previousValue,
  icon: Icon,
  description,
  delay = 0,
  className,
  decimalPlaces = 0,
  prefix = "",
  suffix = "",
  trend = "neutral",
  trendValue,
  colorScheme = "primary",
}: AnimatedStatsCardProps) {
  const colors = colorSchemes[colorScheme];
  
  const trendPercentage = previousValue && previousValue > 0 
    ? ((value - previousValue) / previousValue) * 100 
    : 0;

  const getTrendIcon = () => {
    if (trend === "up" || trendPercentage > 0) return "↗";
    if (trend === "down" || trendPercentage < 0) return "↘";
    return "→";
  };

  const getTrendColor = () => {
    if (trend === "up" || trendPercentage > 0) return "text-green-500";
    if (trend === "down" || trendPercentage < 0) return "text-red-500";
    return "text-gray-500";
  };

  return (
    <BlurFade delay={delay} inView>
      <Card className={cn(
        "glass-card border-border/50 hover:shadow-lg transition-all duration-300 group",
        className
      )}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <p className="text-sm font-medium text-muted-foreground">
                {title}
              </p>
              <div className="flex items-baseline gap-2">
                <div className="flex items-center gap-1">
                  {prefix && (
                    <span className="text-2xl font-bold gradient-text">
                      {prefix}
                    </span>
                  )}
                  <NumberTicker
                    value={value}
                    delay={delay + 0.2}
                    decimalPlaces={decimalPlaces}
                    className="text-2xl font-bold gradient-text"
                  />
                  {suffix && (
                    <span className="text-2xl font-bold gradient-text">
                      {suffix}
                    </span>
                  )}
                </div>
                
                {/* Trend indicator */}
                {(trendValue || trendPercentage !== 0) && (
                  <div className={cn(
                    "flex items-center gap-1 text-xs font-medium",
                    getTrendColor()
                  )}>
                    <span>{getTrendIcon()}</span>
                    <NumberTicker
                      value={trendValue || Math.abs(trendPercentage)}
                      delay={delay + 0.4}
                      decimalPlaces={1}
                      className="font-medium"
                    />
                    {!trendValue && <span>%</span>}
                  </div>
                )}
              </div>
              
              {description && (
                <p className="text-xs text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
            
            <div className={cn(
              "relative p-3 rounded-xl transition-all duration-300 group-hover:scale-110",
              colors.bg
            )}>
              <Icon className={cn("w-6 h-6", colors.icon)} />
              
              {/* Animated background */}
              <div className={cn(
                "absolute inset-0 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300",
                "bg-gradient-to-r",
                colors.gradient
              )} />
            </div>
          </div>
        </CardContent>
      </Card>
    </BlurFade>
  );
} 