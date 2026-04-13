/**
 * 📋 Version Changelog Modal
 * 
 * Shows detailed changelog and update information
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  Bug,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDistanceToNow } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { VersionChangelog } from "@/hooks/use-widget-updates";

interface VersionChangelogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widgetId: string;
  widgetName: string;
  currentVersion: string;
  latestVersion: string;
  changelog: VersionChangelog;
  instanceId?: string;
}

const CHANGE_TYPE_CONFIG = {
  feature: {
    icon: Sparkles,
    label: "New Feature",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  bugfix: {
    icon: Bug,
    label: "Bug Fix",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
  performance: {
    icon: Zap,
    label: "Performance",
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
  },
  breaking: {
    icon: AlertTriangle,
    label: "Breaking Change",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
  },
};

export function VersionChangelogModal({
  open,
  onOpenChange,
  widgetId,
  widgetName,
  currentVersion,
  latestVersion,
  changelog,
  instanceId,
}: VersionChangelogModalProps) {
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!instanceId) throw new Error("No instance ID provided");
      
      const response = await api.post(`/api/settings/widget-instances/${instanceId}/update`, {
        targetVersion: latestVersion,
      });
      return response?.data || response;
    },
    onSuccess: () => {
      toast.success(`${widgetName} updated to v${latestVersion}!`);
      queryClient.invalidateQueries({ queryKey: ['widget-updates'] });
      queryClient.invalidateQueries({ queryKey: ['widget-instances'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update widget");
    },
  });

  const handleUpdate = () => {
    setIsUpdating(true);
    updateMutation.mutate();
  };

  const hasBreakingChanges = changelog.changes.some(c => c.type === "breaking");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl">{widgetName}</DialogTitle>
              <DialogDescription className="mt-2 flex items-center gap-3">
                <span>v{currentVersion} → v{latestVersion}</span>
                {hasBreakingChanges && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Breaking Changes
                  </Badge>
                )}
              </DialogDescription>
            </div>
            <div className="text-right">
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {formatDistanceToNow(new Date(changelog.releaseDate), { addSuffix: true })}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <Separator className="my-4" />

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Upgrade Notes */}
            {changelog.upgradeNotes && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                      Important Upgrade Notes
                    </h4>
                    <p className="text-sm text-blue-800 dark:text-blue-300 whitespace-pre-wrap">
                      {changelog.upgradeNotes}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Changes by Type */}
            <div className="space-y-4">
              <h4 className="font-semibold text-lg">What's New</h4>
              
              {Object.entries(
                changelog.changes.reduce((acc, change) => {
                  if (!acc[change.type]) acc[change.type] = [];
                  acc[change.type].push(change);
                  return acc;
                }, {} as Record<string, typeof changelog.changes>)
              ).map(([type, changes]) => {
                const config = CHANGE_TYPE_CONFIG[type as keyof typeof CHANGE_TYPE_CONFIG];
                const Icon = config.icon;

                return (
                  <div key={type} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={cn("p-1.5 rounded-md", config.bgColor)}>
                        <Icon className={cn("h-4 w-4", config.color)} />
                      </div>
                      <h5 className="font-medium text-sm">{config.label}s</h5>
                      <Badge variant="secondary" className="text-xs">
                        {changes.length}
                      </Badge>
                    </div>
                    <ul className="space-y-2 ml-9">
                      {changes.map((change, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                          <span>{change.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            {/* Version Info */}
            <div className="pt-4 border-t">
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="font-medium text-muted-foreground">Current Version</dt>
                  <dd className="mt-1 font-mono">{currentVersion}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Latest Version</dt>
                  <dd className="mt-1 font-mono font-semibold text-primary">{latestVersion}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Release Date</dt>
                  <dd className="mt-1">
                    {new Date(changelog.releaseDate).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Changes</dt>
                  <dd className="mt-1">{changelog.changes.length} updates</dd>
                </div>
              </dl>
            </div>
          </div>
        </ScrollArea>

        <Separator className="my-4" />

        <DialogFooter className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <div className="flex gap-2">
            {instanceId && (
              <Button
                onClick={handleUpdate}
                disabled={isUpdating || updateMutation.isPending}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {isUpdating ? "Updating..." : `Update to v${latestVersion}`}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

