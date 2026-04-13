/**
 * 👀 Profile Viewers Component
 * 
 * Displays who has viewed the user's profile
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Eye, User, Calendar, Monitor, Smartphone, Tablet } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ClickableUserProfile } from "@/components/user/clickable-user-profile";
import { getProfileViewers, smartProfileKeys } from "@/fetchers/profile/smart-profile-fetchers";
import { cn } from "@/lib/cn";

interface ProfileViewersProps {
  userId: string;
  className?: string;
}

const deviceIcons = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

const sourceLabels: Record<string, { label: string; color: string }> = {
  search: { label: "Search", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  project: { label: "Project", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  team: { label: "Team", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" },
  direct: { label: "Direct", color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300" },
  notification: { label: "Notification", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300" },
};

export function ProfileViewers({ userId, className }: ProfileViewersProps) {
  const { data, isLoading } = useQuery({
    queryKey: smartProfileKeys.viewers(userId),
    queryFn: () => getProfileViewers(userId, { limit: 20 }),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const viewers = data?.data || [];

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Who Viewed Your Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-3 w-24 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (viewers.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Who Viewed Your Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Eye className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No profile views yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Who Viewed Your Profile
          <Badge variant="secondary" className="ml-auto">
            {viewers.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {viewers.map((view: any) => {
            const DeviceIcon = deviceIcons[view.deviceType as keyof typeof deviceIcons] || Monitor;
            const sourceConfig = sourceLabels[view.source] || sourceLabels.direct;

            return (
              <div
                key={view.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                {view.isAnonymous ? (
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <ClickableUserProfile
                    userId={view.viewerId}
                    userName={view.viewerName}
                    userAvatar={view.viewerAvatar}
                    size="md"
                    openMode="both"
                  />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">
                      {view.isAnonymous ? "Anonymous User" : view.viewerName}
                    </p>
                    <Badge variant="outline" className={cn("text-xs", sourceConfig.color)}>
                      {sourceConfig.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    {!view.isAnonymous && view.viewerJobTitle && (
                      <span className="truncate">{view.viewerJobTitle}</span>
                    )}
                    {!view.isAnonymous && view.viewerCompany && (
                      <>
                        <span>•</span>
                        <span className="truncate">{view.viewerCompany}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <DeviceIcon className="h-4 w-4" />
                  <span className="whitespace-nowrap">
                    {formatDistanceToNow(new Date(view.viewedAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

