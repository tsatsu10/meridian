/**
 * TrendIndicator Component
 * Displays health trend (improving, stable, declining)
 */

import { cn } from "@/lib/cn";
import { TREND_INDICATORS } from "@/utils/health-constants";

interface TrendIndicatorProps {
  trend: "improving" | "stable" | "declining";
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

export function TrendIndicator({
  trend,
  showLabel = false,
  size = "md",
  className,
}: TrendIndicatorProps) {
  const trendData = TREND_INDICATORS[trend];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1",
        SIZE_CLASSES[size],
        className
      )}
      title={`Trend: ${trendData.label}`}
    >
      <span
        className="text-lg"
        style={{ color: trendData.color }}
      >
        {trendData.icon}
      </span>
      {showLabel && (
        <span style={{ color: trendData.color }} className="font-medium">
          {trendData.label}
        </span>
      )}
    </div>
  );
}

interface TrendChangeProps {
  current: number;
  previous: number;
  showPercent?: boolean;
}

export function TrendChange({ current, previous, showPercent = true }: TrendChangeProps) {
  const change = current - previous;
  const percentChange = previous !== 0 ? ((change / previous) * 100).toFixed(1) : 0;

  const isImproving = change > 0;
  const isDeciding = change < 0;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 text-sm font-medium",
        isImproving && "text-green-600 dark:text-green-400",
        isDeciding && "text-red-600 dark:text-red-400",
        !isImproving && !isDeciding && "text-gray-600 dark:text-gray-400"
      )}
    >
      {isImproving && (
        <>
          <span>↑</span>
          <span>+{change.toFixed(1)}</span>
          {showPercent && <span>({percentChange}%)</span>}
        </>
      )}
      {isDeciding && (
        <>
          <span>↓</span>
          <span>{change.toFixed(1)}</span>
          {showPercent && <span>({percentChange}%)</span>}
        </>
      )}
      {!isImproving && !isDeciding && (
        <>
          <span>→</span>
          <span>Stable</span>
        </>
      )}
    </div>
  );
}
