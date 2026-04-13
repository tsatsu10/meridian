import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FactorDetail {
  name: string;
  score: number; // 0-100
  trend: "improving" | "stable" | "declining";
  description: string;
  metrics: Array<{
    label: string;
    value: string | number;
    unit?: string;
  }>;
}

interface FactorDetailCardProps {
  factor: FactorDetail;
  className?: string;
}

export function FactorDetailCard({ factor, className }: FactorDetailCardProps) {
  const getTrendIcon = () => {
    switch (factor.trend) {
      case "improving":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "declining":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendLabel = () => {
    switch (factor.trend) {
      case "improving":
        return "Improving";
      case "declining":
        return "Declining";
      default:
        return "Stable";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-blue-500";
    if (score >= 40) return "bg-amber-500";
    return "bg-red-500";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-50 dark:bg-green-900/20";
    if (score >= 60) return "bg-blue-50 dark:bg-blue-900/20";
    if (score >= 40) return "bg-amber-50 dark:bg-amber-900/20";
    return "bg-red-50 dark:bg-red-900/20";
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-gray-200 dark:border-gray-700 p-4 transition-all hover:shadow-md",
        getScoreBg(factor.score),
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white">{factor.name}</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{factor.description}</p>
        </div>
        <div className="flex-shrink-0 text-right ml-4">
          <div className={cn("h-12 w-12 rounded-lg flex items-center justify-center", getScoreBg(factor.score))}>
            <span className="font-bold text-lg text-gray-900 dark:text-white">
              {Math.round(factor.score)}
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div
            className={cn("h-full transition-all", getScoreColor(factor.score))}
            style={{ width: `${factor.score}%` }}
          />
        </div>
      </div>

      {/* Trend */}
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-200 dark:border-gray-600">
        {getTrendIcon()}
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {getTrendLabel()}
        </span>
      </div>

      {/* Metrics */}
      {factor.metrics && factor.metrics.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {factor.metrics.map((metric, idx) => (
            <div key={idx} className="rounded bg-white dark:bg-gray-800/50 p-2">
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                {metric.label}
              </p>
              <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">
                {metric.value}
                {metric.unit && <span className="text-xs font-normal text-gray-600 dark:text-gray-400 ml-1">{metric.unit}</span>}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Grid of factor detail cards
 */
interface FactorDetailGridProps {
  factors: FactorDetail[];
  cols?: number;
  className?: string;
}

export function FactorDetailGrid({ factors, cols = 2, className }: FactorDetailGridProps) {
  return (
    <div className={cn("grid gap-4", className)} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {factors.map((factor) => (
        <FactorDetailCard key={factor.name} factor={factor} />
      ))}
    </div>
  );
}

/**
 * Compact inline factor display
 */
export function FactorDetailInline({ factor, className }: FactorDetailCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-blue-600 dark:text-blue-400";
    if (score >= 40) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{factor.name}</p>
        <p className="text-xs text-gray-600 dark:text-gray-400">{factor.description}</p>
      </div>
      <div className={cn("text-lg font-bold", getScoreColor(factor.score))}>
        {Math.round(factor.score)}
      </div>
    </div>
  );
}
