/**
 * HealthFactorBreakdown Component
 * Displays detailed breakdown of health factors
 */

import { cn } from "@/lib/cn";
import { Progress } from "@/components/ui/progress";
import type { HealthFactor } from "@/types/health";

interface HealthFactorBreakdownProps {
  factors: HealthFactor[];
  compact?: boolean;
}

const FACTOR_ICONS = {
  Completion: "📊",
  Timeline: "⏰",
  "Task Health": "✓",
  Resources: "👥",
  Risk: "⚠",
};

const FACTOR_DESCRIPTIONS = {
  Completion: "Task completion percentage and velocity",
  Timeline: "Deadline proximity and progress alignment",
  "Task Health": "Overdue and blocked task penalties",
  Resources: "Team utilization and capacity",
  Risk: "Blockers, dependencies, and critical path",
};

export function HealthFactorBreakdown({
  factors,
  compact = false,
}: HealthFactorBreakdownProps) {
  if (!factors || factors.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No factor data available
      </div>
    );
  }

  // Sort by weight (descending)
  const sortedFactors = [...factors].sort((a, b) => b.weight - a.weight);

  if (compact) {
    return (
      <div className="space-y-2">
        {sortedFactors.map((factor) => (
          <div key={factor.name} className="text-xs space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span>
                  {
                    FACTOR_ICONS[
                      factor.name as keyof typeof FACTOR_ICONS
                    ] || "•"
                  }
                </span>
                <span className="font-medium">{factor.name}</span>
              </div>
              <span className="font-bold">{Math.round(factor.score)}</span>
            </div>
            <Progress value={factor.score} className="h-1.5" />
            <div className="text-xs text-muted-foreground">
              {(factor.weight * 100).toFixed(0)}% weight • Trend:{" "}
              {factor.trend}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedFactors.map((factor) => (
        <div key={factor.name} className="space-y-2">
          {/* Factor Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {
                  FACTOR_ICONS[
                    factor.name as keyof typeof FACTOR_ICONS
                  ] || "•"
                }
              </span>
              <div>
                <div className="font-semibold text-sm">{factor.name}</div>
                <div className="text-xs text-muted-foreground">
                  {
                    FACTOR_DESCRIPTIONS[
                      factor.name as keyof typeof FACTOR_DESCRIPTIONS
                    ] || "Factor analysis"
                  }
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-foreground">
                {Math.round(factor.score)}
              </div>
              <div className="text-xs text-muted-foreground">
                {(factor.weight * 100).toFixed(0)}% weight
              </div>
            </div>
          </div>

          {/* Score Progress */}
          <Progress value={factor.score} className="h-2" />

          {/* Trend & Recommendation */}
          <div className="flex items-center justify-between text-xs">
            <div
              className={cn(
                "px-2 py-1 rounded-full font-medium",
                factor.trend === "improving" &&
                  "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
                factor.trend === "stable" &&
                  "bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300",
                factor.trend === "declining" &&
                  "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
              )}
            >
              {factor.trend === "improving" && "↑ Improving"}
              {factor.trend === "stable" && "→ Stable"}
              {factor.trend === "declining" && "↓ Declining"}
            </div>
          </div>

          {/* Recommendation */}
          {factor.recommendation && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-xs text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              💡 {factor.recommendation}
            </div>
          )}
        </div>
      ))}

      {/* Summary Stats */}
      <div className="pt-2 border-t border-border/50 space-y-1.5">
        <div className="text-xs font-medium">Factor Summary</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {sortedFactors.map((factor) => (
            <div
              key={`summary-${factor.name}`}
              className="flex items-center justify-between text-muted-foreground"
            >
              <span>{factor.name}</span>
              <span className="font-semibold">{Math.round(factor.score)}/100</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface HealthFactorCardProps {
  factor: HealthFactor;
}

export function HealthFactorCard({ factor }: HealthFactorCardProps) {
  return (
    <div className="p-4 border border-border/50 rounded-lg space-y-3 bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">
            {
              FACTOR_ICONS[
                factor.name as keyof typeof FACTOR_ICONS
              ] || "•"
            }
          </span>
          <div>
            <div className="font-semibold">{factor.name}</div>
            <div className="text-xs text-muted-foreground">
              {(factor.weight * 100).toFixed(0)}% of overall score
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold">{Math.round(factor.score)}</div>
          <div className="text-xs text-muted-foreground">/100</div>
        </div>
      </div>

      <Progress value={factor.score} className="h-2" />

      <div className="flex items-center gap-2 text-xs">
        <div
          className={cn(
            "px-2 py-1 rounded-full font-medium",
            factor.trend === "improving" &&
              "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
            factor.trend === "stable" &&
              "bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300",
            factor.trend === "declining" &&
              "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
          )}
        >
          {factor.trend === "improving" && "↑ Improving"}
          {factor.trend === "stable" && "→ Stable"}
          {factor.trend === "declining" && "↓ Declining"}
        </div>
      </div>

      {factor.recommendation && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-xs text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          <div className="font-semibold mb-1">Recommendation</div>
          <div>{factor.recommendation}</div>
        </div>
      )}
    </div>
  );
}
