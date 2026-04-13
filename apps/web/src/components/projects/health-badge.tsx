import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { HealthMetrics } from "@/hooks/use-project-health";

interface HealthBadgeProps {
  health: HealthMetrics;
  className?: string;
  showIcon?: boolean;
  showLabel?: boolean;
}

export function HealthBadge({ 
  health, 
  className,
  showIcon = true,
  showLabel = true 
}: HealthBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium border-0",
        health.bgColor,
        health.color,
        className
      )}
    >
      {showIcon && <span className="mr-1">{health.icon}</span>}
      {showLabel && health.label}
    </Badge>
  );
}

