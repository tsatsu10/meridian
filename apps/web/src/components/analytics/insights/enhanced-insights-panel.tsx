// @epic-2.1-workflow: Enhanced insights panel with alert levels and long press support
// @persona-sarah: PM needs to manage multiple insights efficiently
// @persona-david: Team lead needs to monitor alerts and take bulk actions

import { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/cn";

interface EnhancedInsightsPanelProps {
  insights: any[];
  alerts: Array<{
    type: "warning" | "critical" | "info";
    message: string;
    actionRequired: boolean;
  }>;
  onInsightAction: (insight: any) => void;
  onLongPress?: () => void;
}

export function EnhancedInsightsPanel({
  insights,
  alerts,
  onInsightAction,
  onLongPress,
}: EnhancedInsightsPanelProps) {
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const touchStartTimeRef = useRef<number>(0);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "success":
        return CheckCircle2;
      case "warning":
        return AlertTriangle;
      case "critical":
        return AlertTriangle;
      default:
        return Activity;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "critical":
        return AlertTriangle;
      case "warning":
        return AlertTriangle;
      default:
        return Activity;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case "critical":
        return "border-red-200 bg-red-50 text-red-800";
      case "warning":
        return "border-yellow-200 bg-yellow-50 text-yellow-800";
      default:
        return "border-blue-200 bg-blue-50 text-blue-800";
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    touchStartTimeRef.current = Date.now();
    const timer = setTimeout(() => {
      onLongPress?.();
    }, 500); // 500ms for long press
    setLongPressTimer(timer);
  };

  const handleTouchEnd = (e: React.TouchEvent, insight: any) => {
    e.preventDefault();
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    // If touch duration was less than 500ms, treat as a normal tap
    const touchDuration = Date.now() - touchStartTimeRef.current;
    if (touchDuration < 500) {
      onInsightAction(insight);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Critical Alerts */}
      {alerts && alerts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">System Alerts</h4>
          {alerts.map((alert, index) => {
            const AlertIcon = getAlertIcon(alert.type);
            return (
              <div
                key={index}
                className={cn(
                  "flex items-start space-x-3 p-3 rounded-lg border",
                  getAlertColor(alert.type)
                )}
              >
                <AlertIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{alert.type.toUpperCase()}</p>
                  <p className="text-xs opacity-90">{alert.message}</p>
                  {alert.actionRequired && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      Action Required
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Insights */}
      {insights && insights.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">AI Insights</h4>
          {insights.map((insight, index) => {
            const InsightIcon = getInsightIcon(insight.type);
            return (
              <div
                key={insight.id || index}
                className="flex items-start space-x-3 p-3 rounded-lg bg-muted/30 border border-border/50"
                onTouchStart={handleTouchStart}
                onTouchEnd={(e) => handleTouchEnd(e, insight)}
                onTouchMove={handleTouchMove}
              >
                <InsightIcon className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{insight.title}</p>
                  <p className="text-xs text-gray-500">{insight.description}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onInsightAction(insight);
                    }}
                    className="mt-2 h-6 px-2 text-xs"
                  >
                    {insight.action}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export type { EnhancedInsightsPanelProps };