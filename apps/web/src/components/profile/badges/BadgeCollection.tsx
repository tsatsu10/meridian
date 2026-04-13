/**
 * 🏆 Badge Collection Component
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Sparkles } from "lucide-react";
import { getUserBadges, smartProfileKeys } from "@/fetchers/profile/smart-profile-fetchers";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/cn";

interface BadgeCollectionProps {
  userId: string;
  className?: string;
}

const rarityConfig = {
  legendary: {
    gradient: "bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500",
    border: "border-yellow-400",
    glow: "shadow-[0_0_20px_rgba(251,191,36,0.5)]",
  },
  epic: {
    gradient: "bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600",
    border: "border-purple-400",
    glow: "shadow-[0_0_15px_rgba(168,85,247,0.4)]",
  },
  rare: {
    gradient: "bg-gradient-to-br from-blue-500 to-cyan-500",
    border: "border-blue-400",
    glow: "shadow-[0_0_10px_rgba(59,130,246,0.3)]",
  },
  common: {
    gradient: "bg-gradient-to-br from-gray-400 to-gray-500",
    border: "border-gray-400",
    glow: "",
  },
};

export function BadgeCollection({ userId, className }: BadgeCollectionProps) {
  const { data, isLoading } = useQuery({
    queryKey: smartProfileKeys.badges(userId),
    queryFn: () => getUserBadges(userId),
    staleTime: 5 * 60 * 1000,
  });

  const badges = data?.data || [];

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Badges & Credentials
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (badges.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Badges & Credentials
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Award className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No badges earned yet</p>
            <p className="text-xs mt-1">Complete tasks and contribute to earn badges!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Badges & Credentials
          <Badge variant="secondary" className="ml-auto">
            {badges.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {badges.map((badge: any) => {
            const config = rarityConfig[badge.rarity as keyof typeof rarityConfig] || rarityConfig.common;

            return (
              <div
                key={badge.id}
                className={cn(
                  "relative p-4 rounded-xl border-2 transition-all hover:scale-105 cursor-pointer group",
                  config.border,
                  config.glow
                )}
              >
                <div className="flex flex-col items-center text-center space-y-2">
                  <div
                    className={cn(
                      "h-16 w-16 rounded-full flex items-center justify-center text-3xl",
                      config.gradient
                    )}
                  >
                    {badge.badgeIcon || "🏆"}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{badge.badgeName}</p>
                    <p className="text-xs text-muted-foreground">{badge.badgeDescription}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      badge.rarity === "legendary" && "border-yellow-400 text-yellow-600",
                      badge.rarity === "epic" && "border-purple-400 text-purple-600",
                      badge.rarity === "rare" && "border-blue-400 text-blue-600"
                    )}
                  >
                    {badge.rarity}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(badge.awardedAt), { addSuffix: true })}
                  </p>
                </div>

                {/* Shine effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 rounded-xl" />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

