/**
 * 📈 Profile Insights Dashboard
 * 
 * Shows profile analytics trends, engagement, and insights
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, TrendingUp, Users, Activity } from "lucide-react";
import { getProfileInsights, smartProfileKeys } from "@/fetchers/profile/smart-profile-fetchers";
import NumberTicker from "@/components/magicui/number-ticker";
import { MagicCard } from "@/components/magicui/magic-card";

interface ProfileInsightsProps {
  userId: string;
  className?: string;
}

export function ProfileInsights({ userId, className }: ProfileInsightsProps) {
  const { data, isLoading } = useQuery({
    queryKey: smartProfileKeys.insights(userId),
    queryFn: () => getProfileInsights(userId),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const insights = data?.data || {};
  const views = insights.views || {};
  const statistics = insights.statistics || {};

  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}>
      {/* Total Views */}
      <MagicCard className="cursor-pointer">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center text-center space-y-2">
            <Eye className="h-8 w-8 text-primary" />
            <div className="text-3xl font-bold">
              <NumberTicker value={views.totalViews || 0} />
            </div>
            <p className="text-sm text-muted-foreground">Profile Views</p>
          </div>
        </CardContent>
      </MagicCard>

      {/* Unique Viewers */}
      <MagicCard className="cursor-pointer">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center text-center space-y-2">
            <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <div className="text-3xl font-bold">
              <NumberTicker value={views.uniqueViewers || 0} />
            </div>
            <p className="text-sm text-muted-foreground">Unique Viewers</p>
          </div>
        </CardContent>
      </MagicCard>

      {/* Views This Week */}
      <MagicCard className="cursor-pointer">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center text-center space-y-2">
            <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
            <div className="text-3xl font-bold">
              <NumberTicker value={views.viewsThisWeek || 0} />
            </div>
            <p className="text-sm text-muted-foreground">This Week</p>
          </div>
        </CardContent>
      </MagicCard>

      {/* Engagement */}
      <MagicCard className="cursor-pointer">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center text-center space-y-2">
            <Activity className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            <div className="text-3xl font-bold">
              <NumberTicker value={Math.round((views.averageDuration || 0) / 60)} />s
            </div>
            <p className="text-sm text-muted-foreground">Avg. Time</p>
          </div>
        </CardContent>
      </MagicCard>
    </div>
  );
}

