/**
 * 🟢 Availability Status Component
 * 
 * Displays user's current availability with timezone and working hours
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Globe, MapPin } from "lucide-react";
import { getUserAvailability, smartProfileKeys } from "@/fetchers/profile/smart-profile-fetchers";
import { cn } from "@/lib/cn";

interface AvailabilityStatusProps {
  userId: string;
  compact?: boolean;
  className?: string;
}

const statusConfig = {
  available: {
    label: "Available",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-green-200 dark:border-green-800",
    dot: "bg-green-600",
  },
  away: {
    label: "Away",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
    dot: "bg-yellow-600",
  },
  busy: {
    label: "Busy",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 border-red-200 dark:border-red-800",
    dot: "bg-red-600",
  },
  do_not_disturb: {
    label: "Do Not Disturb",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    dot: "bg-purple-600",
  },
  offline: {
    label: "Offline",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300 border-gray-200 dark:border-gray-800",
    dot: "bg-gray-600",
  },
};

export function AvailabilityStatus({ userId, compact = false, className }: AvailabilityStatusProps) {
  const { data, isLoading } = useQuery({
    queryKey: smartProfileKeys.availability(userId),
    queryFn: () => getUserAvailability(userId),
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  const availability = data?.data || {};
  const status = availability.status || "offline";
  const config = statusConfig[status as keyof typeof statusConfig];

  if (compact) {
    return (
      <div className={cn("inline-flex items-center gap-2", className)}>
        <div className="relative">
          <div className={cn("h-2 w-2 rounded-full", config.dot)} />
          <div className={cn("absolute inset-0 h-2 w-2 rounded-full animate-ping", config.dot)} />
        </div>
        <span className="text-sm font-medium">{config.label}</span>
        {availability.currentLocalTime && (
          <>
            <span className="text-muted-foreground">•</span>
            <span className="text-sm text-muted-foreground">{availability.currentLocalTime}</span>
          </>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="h-24 bg-muted rounded-lg animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          Availability
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={cn("text-sm", config.color)}>
            <div className={cn("h-2 w-2 rounded-full mr-2", config.dot)} />
            {config.label}
          </Badge>
          {availability.inWorkingHours !== undefined && (
            <span className="text-xs text-muted-foreground">
              {availability.inWorkingHours ? "In working hours" : "Outside working hours"}
            </span>
          )}
        </div>

        {/* Status Message */}
        {availability.statusMessage && (
          <p className="text-sm italic text-muted-foreground">
            {availability.statusEmoji && <span className="mr-2">{availability.statusEmoji}</span>}
            "{availability.statusMessage}"
          </p>
        )}

        {/* Timezone & Local Time */}
        <div className="space-y-2">
          {availability.timezone && (
            <div className="flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Timezone:</span>
              <span className="font-medium">{availability.timezone}</span>
            </div>
          )}
          
          {availability.currentLocalTime && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Local Time:</span>
              <span className="font-medium">{availability.currentLocalTime}</span>
            </div>
          )}
        </div>

        {/* Working Hours */}
        {availability.workingHoursStart && availability.workingHoursEnd && (
          <div className="pt-3 border-t">
            <p className="text-xs font-medium mb-2">Working Hours</p>
            <p className="text-sm">
              {availability.workingHoursStart} - {availability.workingHoursEnd}
            </p>
            {availability.workingDays && (
              <p className="text-xs text-muted-foreground mt-1">
                {availability.workingDays.map((d: string) => d.slice(0, 3)).join(", ")}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

