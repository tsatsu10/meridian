/**
 * RiskBadge Component
 * Displays project risk count and severity
 */

import { cn } from "@/lib/cn";
import { AlertCircle, AlertTriangle, AlertOctagon } from "lucide-react";
import type { RiskIndicator } from "@/types/health";

interface RiskBadgeProps {
  risks: RiskIndicator[];
  compact?: boolean;
  onClick?: () => void;
}

const SEVERITY_COLORS = {
  low: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  medium: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
  high: "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  critical: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
};

const SEVERITY_ICONS = {
  low: AlertCircle,
  medium: AlertTriangle,
  high: AlertOctagon,
  critical: AlertOctagon,
};

function getHighestSeverity(
  risks: RiskIndicator[]
): "low" | "medium" | "high" | "critical" {
  if (risks.length === 0) return "low";

  const severityRank = { low: 0, medium: 1, high: 2, critical: 3 };
  return risks.reduce((highest, risk) => {
    const highestRank = severityRank[highest];
    const riskRank = severityRank[risk.severity];
    return riskRank > highestRank ? risk.severity : highest;
  }, "low");
}

export function RiskBadge({
  risks,
  compact = false,
  onClick,
}: RiskBadgeProps) {
  if (risks.length === 0) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
        <span>✓</span>
        <span>No Risks</span>
      </div>
    );
  }

  const severity = getHighestSeverity(risks);
  const severityClass = SEVERITY_COLORS[severity];
  const SeverityIcon = SEVERITY_ICONS[severity];

  if (compact) {
    return (
      <div
        className={cn(
          "inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-sm cursor-pointer hover:scale-110 transition-transform",
          severity === "low" && "bg-blue-500",
          severity === "medium" && "bg-yellow-500",
          severity === "high" && "bg-orange-500",
          severity === "critical" && "bg-red-500"
        )}
        title={`${risks.length} risk${risks.length !== 1 ? "s" : ""}: ${severity}`}
        onClick={onClick}
      >
        {risks.length}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border cursor-pointer hover:shadow-md transition-shadow",
        severityClass
      )}
      onClick={onClick}
    >
      <SeverityIcon className="h-3 w-3" />
      <span>
        {risks.length} risk{risks.length !== 1 ? "s" : ""}
      </span>
      <span className="text-xs opacity-75">({severity})</span>
    </div>
  );
}

interface RiskListProps {
  risks: RiskIndicator[];
  maxItems?: number;
}

export function RiskList({ risks, maxItems = 3 }: RiskListProps) {
  const displayed = risks.slice(0, maxItems);
  const remaining = risks.length - displayed.length;

  if (risks.length === 0) {
    return (
      <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
        <span>✓</span>
        <span>No risks identified</span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {displayed.map((risk) => (
        <div
          key={risk.id}
          className={cn(
            "text-xs p-2 rounded border-l-2",
            risk.severity === "critical" &&
              "bg-red-50 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-300",
            risk.severity === "high" &&
              "bg-orange-50 dark:bg-orange-900/20 border-orange-500 text-orange-700 dark:text-orange-300",
            risk.severity === "medium" &&
              "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 text-yellow-700 dark:text-yellow-300",
            risk.severity === "low" &&
              "bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300"
          )}
        >
          <div className="font-medium">{risk.description}</div>
          <div className="text-xs opacity-75 mt-0.5">{risk.impact}</div>
        </div>
      ))}
      {remaining > 0 && (
        <div className="text-xs text-muted-foreground italic pt-1">
          +{remaining} more risk{remaining !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
