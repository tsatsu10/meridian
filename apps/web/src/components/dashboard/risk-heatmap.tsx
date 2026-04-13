import { AlertCircle, AlertTriangle, Info, AlertOctagon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HealthFactor {
  name: string;
  score: number; // 0-100
  weight: number; // 0-1 (importance)
}

interface RiskHeatmapProps {
  factors: HealthFactor[];
  className?: string;
}

export function RiskHeatmap({ factors, className }: RiskHeatmapProps) {
  const getRiskLevel = (score: number) => {
    if (score >= 80) return { label: "Low", color: "bg-green-100 dark:bg-green-900/30", icon: Info, textColor: "text-green-700 dark:text-green-300" };
    if (score >= 60) return { label: "Medium", color: "bg-blue-100 dark:bg-blue-900/30", icon: AlertCircle, textColor: "text-blue-700 dark:text-blue-300" };
    if (score >= 40) return { label: "High", color: "bg-amber-100 dark:bg-amber-900/30", icon: AlertTriangle, textColor: "text-amber-700 dark:text-amber-300" };
    return { label: "Critical", color: "bg-red-100 dark:bg-red-900/30", icon: AlertOctagon, textColor: "text-red-700 dark:text-red-300" };
  };

  // Sort by weight (importance) descending, then by score ascending
  const sortedFactors = [...factors].sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    return a.score - b.score;
  });

  return (
    <div className={cn("space-y-3", className)}>
      {sortedFactors.map((factor) => {
        const risk = getRiskLevel(factor.score);
        const Icon = risk.icon;

        return (
          <div
            key={factor.name}
            className={cn(
              "flex items-center gap-3 rounded-lg p-3 transition-all",
              risk.color
            )}
          >
            <Icon className={cn("h-5 w-5 flex-shrink-0", risk.textColor)} />
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-semibold", risk.textColor)}>
                {factor.name}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Score: {Math.round(factor.score)} / 100
              </p>
            </div>
            <div className="flex-shrink-0">
              <div className="h-2 w-16 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                  className={cn("h-full transition-all", getRiskLevelBarColor(factor.score))}
                  style={{ width: `${factor.score}%` }}
                />
              </div>
            </div>
            <span className={cn("text-xs font-semibold whitespace-nowrap", risk.textColor)}>
              {risk.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Get bar color for risk level
 */
function getRiskLevelBarColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-blue-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}

/**
 * Matrix-style heatmap visualization
 */
export function RiskHeatmapMatrix({
  factors,
  cols = 3,
  className,
}: RiskHeatmapProps & { cols?: number }) {
  const getRiskColor = (score: number) => {
    if (score >= 80) return "bg-gradient-to-br from-green-400 to-green-600";
    if (score >= 60) return "bg-gradient-to-br from-blue-400 to-blue-600";
    if (score >= 40) return "bg-gradient-to-br from-amber-400 to-amber-600";
    return "bg-gradient-to-br from-red-400 to-red-600";
  };

  return (
    <div className={cn("grid gap-2", className)} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {factors.map((factor) => (
        <div
          key={factor.name}
          className={cn(
            "flex flex-col items-center justify-center rounded-lg p-4 text-white",
            getRiskColor(factor.score)
          )}
          title={factor.name}
        >
          <p className="text-xs font-semibold text-center truncate">{factor.name}</p>
          <p className="text-lg font-bold mt-1">{Math.round(factor.score)}</p>
        </div>
      ))}
    </div>
  );
}
