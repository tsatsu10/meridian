// Phase 2: Offline Status Indicator Component
// Visual indicator for offline synchronization status

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  WifiOff,
  Wifi,
  CloudOff,
  Cloud,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { toast } from '@/lib/toast';

interface OfflineStatusIndicatorProps {
  className?: string;
  showAsPopover?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function OfflineStatusIndicator({
  className,
  showAsPopover = true,
  size = "sm",
}: OfflineStatusIndicatorProps) {
  const { 
    syncState, 
    hasPendingOperations, 
    isOffline, 
    needsSync,
    forcSync,
    clearOfflineData,
  } = useOfflineSync();

  // Get status display data
  const getStatusData = () => {
    if (isOffline) {
      return {
        icon: WifiOff,
        color: "text-red-500",
        bgColor: "bg-red-100 dark:bg-red-900",
        label: "Offline",
        description: hasPendingOperations 
          ? `${syncState.pendingOperations} operations pending`
          : "You're working offline",
      };
    }

    if (syncState.isSyncing) {
      return {
        icon: RefreshCw,
        color: "text-blue-500",
        bgColor: "bg-blue-100 dark:bg-blue-900",
        label: "Syncing",
        description: "Synchronizing data...",
        animate: true,
      };
    }

    if (needsSync) {
      return {
        icon: CloudOff,
        color: "text-orange-500",
        bgColor: "bg-orange-100 dark:bg-orange-900",
        label: "Pending",
        description: `${syncState.pendingOperations} operations to sync`,
      };
    }

    return {
      icon: hasPendingOperations ? Cloud : CheckCircle2,
      color: "text-green-500",
      bgColor: "bg-green-100 dark:bg-green-900",
      label: "Online",
      description: "All data synchronized",
    };
  };

  const statusData = getStatusData();
  const IconComponent = statusData.icon;

  // Handle force sync
  const handleForceSync = async () => {
    try {
      await forcSync();
      toast.success("Synchronization completed");
    } catch (error) {
      toast.error("Synchronization failed");
    }
  };

  const StatusIcon = () => (
    <div className={cn(
      "flex items-center justify-center rounded-full",
      size === "sm" && "w-6 h-6",
      size === "md" && "w-8 h-8", 
      size === "lg" && "w-10 h-10",
      statusData.bgColor
    )}>
      <IconComponent 
        className={cn(
          statusData.color,
          size === "sm" && "w-3 h-3",
          size === "md" && "w-4 h-4",
          size === "lg" && "w-5 h-5",
          statusData.animate && "animate-spin"
        )} 
      />
    </div>
  );

  if (showAsPopover) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size={size === "sm" ? "sm" : "default"}
            className={cn("relative", className)}
          >
            <StatusIcon />
            {hasPendingOperations && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 text-xs flex items-center justify-center"
              >
                {syncState.pendingOperations > 9 ? "9+" : syncState.pendingOperations}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-background border-border shadow-lg" align="end">
          <div className="w-80 p-4 bg-background rounded-lg">
            <div className="flex items-center gap-3 mb-4">
              <StatusIcon />
              <div>
                <h3 className="font-semibold">{statusData.label}</h3>
                <p className="text-sm text-muted-foreground">{statusData.description}</p>
              </div>
            </div>
            
            {needsSync && (
              <Button 
                onClick={handleForceSync}
                size="sm" 
                className="w-full"
                disabled={syncState.isSyncing}
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", syncState.isSyncing && "animate-spin")} />
                {syncState.isSyncing ? "Syncing..." : "Force Sync"}
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className={className}>
      <StatusIcon />
    </div>
  );
}