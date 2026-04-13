/**
 * 🎯 Profile Goals Section
 * 
 * Displays user's goals on their profile
 */

import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp } from "lucide-react";
import { cn } from "@/lib/cn";

interface ProfileGoalsSectionProps {
  goals: any;
  compact?: boolean;
}

export function ProfileGoalsSection({ goals, compact = false }: ProfileGoalsSectionProps) {
  const activeGoals = goals?.active || [];
  const stats = goals?.stats;
  
  if (activeGoals.length === 0 && !stats?.completed) {
    return (
      <div className="text-center py-8 space-y-2">
        <Target className="h-8 w-8 mx-auto text-gray-400" />
        <p className="text-sm text-muted-foreground">No active goals</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Target className="h-4 w-4" />
          Goals & OKRs
        </h3>
        {stats && (
          <Badge variant="outline">
            {stats.completed} completed · {stats.completionRate}% rate
          </Badge>
        )}
      </div>
      
      <div className="space-y-3">
        {activeGoals.slice(0, compact ? 2 : 10).map((goal: any) => (
          <div key={goal.id} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-sm">{goal.title}</h4>
                {goal.description && !compact && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {goal.description}
                  </p>
                )}
              </div>
              <span className="text-sm font-bold tabular-nums ml-2">
                {goal.progress}%
              </span>
            </div>
            
            <Progress value={goal.progress} className="h-1.5" />
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              {goal.keyResults?.length || 0} key results
              {goal.keyResults && (
                <span>
                  · {goal.keyResults.filter((kr: any) => {
                    const progress = (parseFloat(kr.currentValue) / parseFloat(kr.targetValue)) * 100;
                    return progress >= 100;
                  }).length}/{goal.keyResults.length} complete
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {compact && activeGoals.length > 2 && (
        <p className="text-xs text-center text-muted-foreground">
          +{activeGoals.length - 2} more goals
        </p>
      )}
    </div>
  );
}

