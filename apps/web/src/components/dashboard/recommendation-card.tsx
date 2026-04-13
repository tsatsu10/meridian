import { Lightbulb, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  category: "performance" | "timeline" | "resources" | "quality" | "risk";
  actionItems?: string[];
  estimatedImpact?: number; // 0-100
}

interface RecommendationCardProps {
  recommendation: Recommendation;
  onAction?: () => void;
  className?: string;
}

export function RecommendationCard({
  recommendation,
  onAction,
  className,
}: RecommendationCardProps) {
  const priorityConfig = {
    high: { bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-200 dark:border-red-800", text: "text-red-700 dark:text-red-300", badge: "bg-red-100 dark:bg-red-900/40" },
    medium: { bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-300", badge: "bg-amber-100 dark:bg-amber-900/40" },
    low: { bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-200 dark:border-blue-800", text: "text-blue-700 dark:text-blue-300", badge: "bg-blue-100 dark:bg-blue-900/40" },
  };

  const config = priorityConfig[recommendation.priority];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "performance":
        return <TrendingUp className="h-5 w-5" />;
      case "timeline":
        return <TrendingUp className="h-5 w-5" />;
      case "resources":
        return <CheckCircle2 className="h-5 w-5" />;
      case "quality":
        return <CheckCircle2 className="h-5 w-5" />;
      case "risk":
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <Lightbulb className="h-5 w-5" />;
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border-2 p-4 transition-all hover:shadow-md",
        config.bg,
        config.border,
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className={cn("p-2 rounded-lg", config.badge)}>
          {getCategoryIcon(recommendation.category)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
              {recommendation.title}
            </h3>
            <span className={cn("px-2 py-0.5 text-xs font-semibold rounded", config.badge, config.text)}>
              {recommendation.priority.charAt(0).toUpperCase() + recommendation.priority.slice(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
        {recommendation.description}
      </p>

      {/* Action Items */}
      {recommendation.actionItems && recommendation.actionItems.length > 0 && (
        <div className="mb-3 space-y-1">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            Action Items
          </p>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            {recommendation.actionItems.slice(0, 3).map((item, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="text-gray-400">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer with impact and action */}
      <div className="flex items-center justify-between gap-2">
        {recommendation.estimatedImpact !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              Potential Impact:
            </span>
            <div className="h-2 w-16 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                style={{ width: `${recommendation.estimatedImpact}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              +{Math.round(recommendation.estimatedImpact)}
            </span>
          </div>
        )}
        {onAction && (
          <button
            onClick={onAction}
            className={cn(
              "px-3 py-1.5 rounded text-xs font-semibold transition-colors",
              config.badge,
              config.text,
              "hover:opacity-80"
            )}
          >
            Learn More
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Panel showing multiple recommendations
 */
interface RecommendationPanelProps {
  recommendations: Recommendation[];
  maxDisplay?: number;
  onRecommendationAction?: (rec: Recommendation) => void;
  className?: string;
}

export function RecommendationPanel({
  recommendations,
  maxDisplay = 5,
  onRecommendationAction,
  className,
}: RecommendationPanelProps) {
  // Sort by priority: high > medium > low, then by impact
  const sorted = [...recommendations]
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return (b.estimatedImpact || 0) - (a.estimatedImpact || 0);
    })
    .slice(0, maxDisplay);

  return (
    <div className={cn("space-y-3", className)}>
      {sorted.map((rec) => (
        <RecommendationCard
          key={rec.id}
          recommendation={rec}
          onAction={() => onRecommendationAction?.(rec)}
        />
      ))}
      {recommendations.length > maxDisplay && (
        <div className="pt-2 text-center">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            +{recommendations.length - maxDisplay} more recommendations
          </p>
        </div>
      )}
    </div>
  );
}
