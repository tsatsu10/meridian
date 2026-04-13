import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface SecurityMetricsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  severity?: "critical" | "high" | "medium" | "low" | "info";
  description?: string;
  onClick?: () => void;
}

export function SecurityMetricsCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  severity = "info",
  description,
  onClick,
}: SecurityMetricsCardProps) {
  const severityStyles = {
    critical: "border-red-500 bg-red-50 dark:bg-red-950/20",
    high: "border-orange-500 bg-orange-50 dark:bg-orange-950/20",
    medium: "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20",
    low: "border-blue-500 bg-blue-50 dark:bg-blue-950/20",
    info: "border-gray-300 dark:border-gray-700",
  };

  const iconStyles = {
    critical: "text-red-600 dark:text-red-400",
    high: "text-orange-600 dark:text-orange-400",
    medium: "text-yellow-600 dark:text-yellow-400",
    low: "text-blue-600 dark:text-blue-400",
    info: "text-gray-600 dark:text-gray-400",
  };

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-red-600" : trend === "down" ? "text-green-600" : "text-gray-600";

  return (
    <Card
      className={cn(
        "glass-card transition-all duration-200 hover:shadow-lg",
        severityStyles[severity],
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <Icon className={cn("h-5 w-5", iconStyles[severity])} aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-3xl font-bold">{value}</div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {trend && trendValue && (
            <Badge variant="outline" className={cn("ml-2", trendColor)}>
              <TrendIcon className="h-3 w-3 mr-1" aria-hidden="true" />
              {trendValue}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

