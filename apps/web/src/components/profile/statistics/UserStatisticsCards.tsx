/**
 * 📊 User Statistics Cards
 * 
 * Displays key user metrics in card format
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2,
  FolderOpen,
  Users,
  Clock,
  TrendingUp,
  Calendar,
  MessageCircle,
} from "lucide-react";
import { getUserStatistics, smartProfileKeys } from "@/fetchers/profile/smart-profile-fetchers";
import NumberTicker from "@/components/magicui/number-ticker";
import { MagicCard } from "@/components/magicui/magic-card";
import { cn } from "@/lib/cn";

interface UserStatisticsCardsProps {
  userId: string;
  className?: string;
}

export function UserStatisticsCards({ userId, className }: UserStatisticsCardsProps) {
  const { data, isLoading } = useQuery({
    queryKey: smartProfileKeys.statistics(userId),
    queryFn: () => getUserStatistics(userId),
    staleTime: 5 * 60 * 1000,
  });

  const stats = data?.data || {};

  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      label: "Tasks Completed",
      value: stats.tasksCompletedAllTime || 0,
      subValue: `${stats.tasksCompletedWeek || 0} this week`,
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
    },
    {
      label: "Active Projects",
      value: stats.projectsActive || 0,
      subValue: `${stats.projectsTotal || 0} total`,
      icon: FolderOpen,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Team Memberships",
      value: stats.teamsCount || 0,
      subValue: `${stats.teamsLeadCount || 0} as lead`,
      icon: Users,
      color: "text-purple-600 dark:text-purple-400",
    },
    {
      label: "Response Time",
      value: Math.round(parseFloat(stats.avgResponseTimeMinutes) || 0),
      subValue: "minutes avg",
      icon: Clock,
      color: "text-orange-600 dark:text-orange-400",
    },
    {
      label: "Contribution Score",
      value: Math.round(parseFloat(stats.contributionScore) || 0),
      subValue: "out of 100",
      icon: TrendingUp,
      color: "text-pink-600 dark:text-pink-400",
    },
    {
      label: "Days in Workspace",
      value: stats.daysInWorkspace || 0,
      subValue: formatTenure(stats.daysInWorkspace || 0),
      icon: Calendar,
      color: "text-indigo-600 dark:text-indigo-400",
    },
  ];

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4", className)}>
      {statCards.map((stat) => (
        <MagicCard key={stat.label} className="cursor-pointer">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center text-center space-y-2">
              <stat.icon className={cn("h-8 w-8", stat.color)} />
              <div className="text-3xl font-bold">
                <NumberTicker value={stat.value} />
              </div>
              <p className="text-xs font-medium">{stat.label}</p>
              <p className="text-xs text-muted-foreground">{stat.subValue}</p>
            </div>
          </CardContent>
        </MagicCard>
      ))}
    </div>
  );
}

function formatTenure(days: number): string {
  if (days < 30) return `${days} days`;
  if (days < 365) return `${Math.floor(days / 30)} months`;
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  return months > 0 ? `${years}y ${months}m` : `${years} year${years > 1 ? "s" : ""}`;
}

