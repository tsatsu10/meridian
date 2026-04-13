/**
 * 🔥 Profile Streaks Section
 * 
 * Displays user's current streaks
 */

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Flame, Target, TrendingUp, Users, BookOpen } from "lucide-react";
import { cn } from "@/lib/cn";

interface ProfileStreaksSectionProps {
  streaks: any;
  compact?: boolean;
}

const STREAK_ICONS = {
  login: Target,
  task: Flame,
  goal: TrendingUp,
  collaboration: Users,
  learning: BookOpen,
};

const STREAK_LABELS = {
  login: 'Login',
  task: 'Task Completion',
  goal: 'Goal Updates',
  collaboration: 'Team Collaboration',
  learning: 'Learning',
};

export function ProfileStreaksSection({ streaks, compact = false }: ProfileStreaksSectionProps) {
  const current = streaks?.current || {};
  const longest = streaks?.longest || 0;
  const totalDays = streaks?.totalActiveDays || 0;
  
  const activeStreaks = Object.entries(current).filter(([_, count]) => (count as number) > 0);
  
  if (activeStreaks.length === 0) {
    return (
      <div className="text-center py-8 space-y-2">
        <Flame className="h-8 w-8 mx-auto text-gray-400" />
        <p className="text-sm text-muted-foreground">No active streaks</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-500" />
          Streaks
        </h3>
        <Badge variant="outline">
          Longest: {longest} days
        </Badge>
      </div>
      
      <div className="space-y-3">
        {activeStreaks.slice(0, compact ? 2 : 5).map(([type, count]) => {
          const Icon = STREAK_ICONS[type as keyof typeof STREAK_ICONS] || Flame;
          const label = STREAK_LABELS[type as keyof typeof STREAK_LABELS] || type;
          const days = count as number;
          
          return (
            <div key={type} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-orange-500" />
                <span className="text-sm">{label}</span>
              </div>
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500 animate-pulse" />
                <span className="text-lg font-bold tabular-nums">{days}</span>
                <span className="text-xs text-muted-foreground">days</span>
              </div>
            </div>
          );
        })}
      </div>
      
      {totalDays > 0 && (
        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground text-center">
            {totalDays} total active days
          </p>
        </div>
      )}
    </div>
  );
}

