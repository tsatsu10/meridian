/**
 * 🏅 Profile Achievements Section
 * 
 * Displays unlocked achievement badges
 */

import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { format } from "date-fns";

interface ProfileAchievementsSectionProps {
  achievements: any;
  compact?: boolean;
}

export function ProfileAchievementsSection({ achievements, compact = false }: ProfileAchievementsSectionProps) {
  const unlocked = achievements?.unlocked || [];
  const stats = achievements?.stats;
  
  const getRarityGradient = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return 'bg-gradient-to-r from-purple-500 to-pink-500';
      case 'epic':
        return 'bg-gradient-to-r from-yellow-400 to-orange-500';
      case 'rare':
        return 'bg-gradient-to-r from-blue-400 to-cyan-500';
      default:
        return 'bg-gray-200 dark:bg-gray-800';
    }
  };
  
  if (unlocked.length === 0) {
    return (
      <div className="text-center py-8 space-y-2">
        <Trophy className="h-8 w-8 mx-auto text-gray-400" />
        <p className="text-sm text-muted-foreground">No achievements yet</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          Achievements
        </h3>
        {stats && (
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {stats.totalPoints.toLocaleString()} points
            </Badge>
            <div className="flex items-center gap-1 text-xs">
              {stats.byRarity.legendary > 0 && <span>🌈{stats.byRarity.legendary}</span>}
              {stats.byRarity.epic > 0 && <span>⭐{stats.byRarity.epic}</span>}
              {stats.byRarity.rare > 0 && <span>💎{stats.byRarity.rare}</span>}
              {stats.byRarity.common > 0 && <span>🏅{stats.byRarity.common}</span>}
            </div>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {unlocked.slice(0, compact ? 6 : 20).map((achievement: any) => {
          const badge = achievement.achievement;
          
          return (
            <div
              key={achievement.id}
              className={cn(
                "rounded-lg p-3 text-white transition-all hover:scale-105",
                getRarityGradient(badge.rarity)
              )}
            >
              <div className="text-center space-y-1">
                <div className="text-3xl">{badge.icon}</div>
                <p className="font-bold text-sm">{badge.name}</p>
                <p className="text-xs opacity-90 line-clamp-2">{badge.description}</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    +{badge.points}
                  </Badge>
                  {badge.rarity === 'legendary' && (
                    <Sparkles className="h-3 w-3 animate-pulse" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {compact && unlocked.length > 6 && (
        <p className="text-xs text-center text-muted-foreground">
          +{unlocked.length - 6} more badges
        </p>
      )}
    </div>
  );
}

