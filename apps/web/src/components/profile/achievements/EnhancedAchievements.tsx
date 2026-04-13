/**
 * 🏆 Enhanced Achievements Component
 * 
 * Shows achievements with categories, rarity, and progress
 */

import { Trophy, Star, Award, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import NumberTicker from "@/components/magicui/number-ticker";
import { cn } from "@/lib/cn";

interface EnhancedAchievementsProps {
  achievements: any;
  className?: string;
}

const rarityConfig = {
  legendary: {
    icon: Zap,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
    borderColor: "border-yellow-400",
  },
  epic: {
    icon: Star,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    borderColor: "border-purple-400",
  },
  rare: {
    icon: Award,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-400",
  },
  common: {
    icon: Trophy,
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-50 dark:bg-gray-950/30",
    borderColor: "border-gray-400",
  },
};

export function EnhancedAchievements({ achievements, className }: EnhancedAchievementsProps) {
  const achievementsData = achievements?.unlocked || [];
  const stats = achievements?.stats || {
    totalUnlocked: 0,
    totalPoints: 0,
    byRarity: { legendary: 0, epic: 0, rare: 0, common: 0 },
    recentUnlocks: [],
  };

  // Group by rarity
  const byRarity = {
    legendary: achievementsData.filter((a: any) => a.achievement?.rarity === "legendary"),
    epic: achievementsData.filter((a: any) => a.achievement?.rarity === "epic"),
    rare: achievementsData.filter((a: any) => a.achievement?.rarity === "rare"),
    common: achievementsData.filter((a: any) => a.achievement?.rarity === "common"),
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Achievements
          <Badge variant="secondary" className="ml-auto">
            <NumberTicker value={stats.totalUnlocked} />
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4">
          {Object.entries(stats.byRarity).map(([rarity, count]) => {
            const config = rarityConfig[rarity as keyof typeof rarityConfig];
            const Icon = config.icon;

            return (
              <div
                key={rarity}
                className={cn("p-3 rounded-lg text-center", config.bgColor)}
              >
                <Icon className={cn("h-6 w-6 mx-auto mb-1", config.color)} />
                <div className="text-2xl font-bold">
                  <NumberTicker value={count as number} />
                </div>
                <p className="text-xs text-muted-foreground capitalize">{rarity}</p>
              </div>
            );
          })}
        </div>

        {/* Total Points */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
          <span className="font-medium">Total Achievement Points</span>
          <span className="text-2xl font-bold text-primary">
            <NumberTicker value={stats.totalPoints} />
          </span>
        </div>

        {/* Achievements by Rarity Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="legendary">Legendary</TabsTrigger>
            <TabsTrigger value="epic">Epic</TabsTrigger>
            <TabsTrigger value="rare">Rare</TabsTrigger>
            <TabsTrigger value="common">Common</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <AchievementsList achievements={achievementsData} />
          </TabsContent>

          {Object.entries(byRarity).map(([rarity, items]) => (
            <TabsContent key={rarity} value={rarity} className="mt-4">
              <AchievementsList achievements={items as any[]} emptyMessage={`No ${rarity} achievements yet`} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function AchievementsList({ achievements, emptyMessage = "No achievements yet" }: { achievements: any[]; emptyMessage?: string }) {
  if (achievements.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {achievements.map((item: any) => {
        const achievement = item.achievement || {};
        const rarity = achievement.rarity || "common";
        const config = rarityConfig[rarity as keyof typeof rarityConfig];

        return (
          <div
            key={item.id}
            className={cn(
              "p-4 rounded-lg border-2 transition-all hover:scale-102",
              config.bgColor,
              config.borderColor
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn("text-3xl", config.color)}>
                {achievement.icon || "🏆"}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold">{achievement.name}</h4>
                    <p className="text-sm text-muted-foreground">{achievement.description}</p>
                  </div>
                  <Badge variant="outline" className={cn("capitalize", config.color)}>
                    {rarity}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>+{achievement.points || 0} points</span>
                  <span>•</span>
                  <span>
                    Unlocked {formatDistanceToNow(new Date(item.unlockedAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

