/**
 * 🔔 Version Update Badge Component
 * 
 * Shows "Update Available" indicator on widget cards
 */

import { Badge } from "@/components/ui/badge";
import { ArrowUpCircle, Zap, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";
import { hasUpdateAvailable } from "@/hooks/use-widget-updates";

interface VersionBadgeProps {
  currentVersion: string;
  latestVersion: string;
  isBreakingChange?: boolean;
  className?: string;
  onClick?: () => void;
}

export function VersionBadge({
  currentVersion,
  latestVersion,
  isBreakingChange = false,
  className,
  onClick,
}: VersionBadgeProps) {
  const hasUpdate = hasUpdateAvailable(currentVersion, latestVersion);

  if (!hasUpdate) return null;

  return (
    <Badge
      variant={isBreakingChange ? "destructive" : "default"}
      className={cn(
        "gap-1.5 cursor-pointer transition-all hover:scale-105",
        isBreakingChange 
          ? "bg-orange-500 hover:bg-orange-600" 
          : "bg-blue-500 hover:bg-blue-600",
        className
      )}
      onClick={onClick}
    >
      {isBreakingChange ? (
        <AlertTriangle className="h-3 w-3" />
      ) : (
        <ArrowUpCircle className="h-3 w-3" />
      )}
      <span className="text-xs font-medium">
        v{latestVersion} Available
      </span>
      <Zap className="h-3 w-3" />
    </Badge>
  );
}

// Compact version for smaller spaces
export function VersionBadgeCompact({
  currentVersion,
  latestVersion,
  isBreakingChange = false,
  className,
  onClick,
}: VersionBadgeProps) {
  const hasUpdate = hasUpdateAvailable(currentVersion, latestVersion);

  if (!hasUpdate) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition-all hover:scale-105",
        isBreakingChange 
          ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" 
          : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        className
      )}
      onClick={onClick}
    >
      {isBreakingChange ? (
        <AlertTriangle className="h-3 w-3" />
      ) : (
        <ArrowUpCircle className="h-3 w-3" />
      )}
      <span>Update</span>
    </div>
  );
}

// Notification banner for dashboard
export function VersionUpdateBanner({
  updateCount,
  breakingCount,
  onViewUpdates,
}: {
  updateCount: number;
  breakingCount: number;
  onViewUpdates?: () => void;
}) {
  if (updateCount === 0) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md",
        breakingCount > 0
          ? "bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800"
          : "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
      )}
      onClick={onViewUpdates}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-lg",
          breakingCount > 0
            ? "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400"
            : "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
        )}>
          {breakingCount > 0 ? (
            <AlertTriangle className="h-5 w-5" />
          ) : (
            <Zap className="h-5 w-5" />
          )}
        </div>
        <div>
          <h4 className={cn(
            "font-semibold text-sm",
            breakingCount > 0 ? "text-orange-900 dark:text-orange-200" : "text-blue-900 dark:text-blue-200"
          )}>
            {updateCount} Widget Update{updateCount > 1 ? 's' : ''} Available
          </h4>
          <p className={cn(
            "text-xs",
            breakingCount > 0 ? "text-orange-700 dark:text-orange-300" : "text-blue-700 dark:text-blue-300"
          )}>
            {breakingCount > 0 
              ? `${breakingCount} breaking change${breakingCount > 1 ? 's' : ''} - review before updating`
              : 'New features and improvements ready to install'
            }
          </p>
        </div>
      </div>
      <ArrowUpCircle className={cn(
        "h-5 w-5",
        breakingCount > 0 ? "text-orange-600 dark:text-orange-400" : "text-blue-600 dark:text-blue-400"
      )} />
    </div>
  );
}

