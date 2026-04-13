/**
 * HealthBadge Component
 * Displays project health status with score and state
 */

import { cn } from "@/lib/cn";
import { HEALTH_COLORS, HEALTH_ICONS } from "@/utils/health-constants";

interface HealthBadgeProps {
  state: "ahead" | "on-track" | "at-risk" | "behind" | "critical";
  score: number;
  icon?: string;
  showScore?: boolean;
  size?: "sm" | "md" | "lg";
}

const HEALTH_BG_COLORS = {
  ahead: "bg-blue-50 dark:bg-blue-900/20",
  "on-track": "bg-green-50 dark:bg-green-900/20",
  "at-risk": "bg-yellow-50 dark:bg-yellow-900/20",
  behind: "bg-red-50 dark:bg-red-900/20",
  critical: "bg-purple-50 dark:bg-purple-900/20",
};

const HEALTH_TEXT_COLORS = {
  ahead: "text-blue-700 dark:text-blue-300",
  "on-track": "text-green-700 dark:text-green-300",
  "at-risk": "text-yellow-700 dark:text-yellow-300",
  behind: "text-red-700 dark:text-red-300",
  critical: "text-purple-700 dark:text-purple-300",
};

const HEALTH_LABELS = {
  ahead: "Ahead",
  "on-track": "On Track",
  "at-risk": "At Risk",
  behind: "Behind",
  critical: "Critical",
};

const SIZE_CLASSES = {
  sm: "px-2 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
  lg: "px-4 py-2 text-base",
};

export function HealthBadge({
  state,
  score,
  icon,
  showScore = true,
  size = "md",
}: HealthBadgeProps) {
  const color = HEALTH_COLORS[state];
  const bgClass = HEALTH_BG_COLORS[state];
  const textClass = HEALTH_TEXT_COLORS[state];
  const label = HEALTH_LABELS[state];
  const displayIcon = icon || HEALTH_ICONS[state];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium border",
        SIZE_CLASSES[size],
        bgClass,
        textClass,
        "border-current border-opacity-20"
      )}
    >
      <span>{displayIcon}</span>
      <span>{label}</span>
      {showScore && (
        <span className="opacity-75">
          ({Math.round(score)}/100)
        </span>
      )}
    </div>
  );
}

export function HealthBadgeCompact({
  state,
  score,
}: HealthBadgeProps) {
  const color = HEALTH_COLORS[state];
  const displayIcon = HEALTH_ICONS[state];

  return (
    <div
      className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-lg"
      style={{ backgroundColor: color }}
      title={`${state}: ${Math.round(score)}/100`}
    >
      {displayIcon}
    </div>
  );
}
