import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";
import UniversalHeader from "@/components/dashboard/universal-header";
import OfflineStatusIndicator from "@/components/pwa/OfflineStatusIndicator";

interface DashboardHeaderProps {
  riskData: any;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export default function DashboardHeader({
  riskData,
  isRefreshing,
  onRefresh
}: DashboardHeaderProps) {
  return (
    <UniversalHeader
      title="Dashboard"
      subtitle="Welcome back! Here's what's happening with your projects."
      variant="default"
      customActions={
        <div className="flex items-center space-x-3">
          {/* Offline Status Indicator */}
          <OfflineStatusIndicator data-testid="offline-status-indicator" />

          {/* Risk Indicator - Only show if there are actual risks */}
          {riskData?.hasHighRisk && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg shadow-sm" data-testid="risk-indicator">
              <AlertTriangle className="h-4 w-4 text-red-500" data-testid="alert-triangle-icon" />
              <span className="text-sm font-medium text-red-700 dark:text-red-300">Risks Detected</span>
              <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">
                {riskData?.highPriorityRisks?.length || 0}
              </Badge>
            </div>
          )}

          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} data-testid="refresh-icon" />
            <span>Refresh</span>
          </Button>
        </div>
      }
    />
  );
}