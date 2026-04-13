import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Wifi, WifiOff, Clock, Activity } from "lucide-react";
import { cn } from "@/lib/cn";

interface SystemHealthSectionProps {
  riskData: any;
  allNotifications: any[];
}

export default function SystemHealthSection({
  riskData,
  allNotifications
}: SystemHealthSectionProps) {
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isUpdating, setIsUpdating] = useState(false);

  // Monitor WebSocket connection status
  useEffect(() => {
    const checkConnection = () => {
      // Check if data is fresh (within last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const isDataFresh = !riskData.dataUpdatedAt || new Date(riskData.dataUpdatedAt) > fiveMinutesAgo;
      setIsConnected(isDataFresh);
    };

    checkConnection();
    const interval = setInterval(checkConnection, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [riskData.dataUpdatedAt]);

  // Update last updated timestamp when risk data changes
  useEffect(() => {
    if (riskData.data) {
      setLastUpdated(new Date());
      setIsUpdating(true);
      const timer = setTimeout(() => setIsUpdating(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [riskData.data]);

  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins === 0) return 'just now';
    if (diffMins === 1) return '1 min ago';
    if (diffMins < 60) return `${diffMins} mins ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;

    return date.toLocaleDateString();
  };

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-500" />
            System Health
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Real-time connection indicator */}
            <div className="flex items-center gap-1">
              {isConnected ? (
                <Wifi className={cn(
                  "h-4 w-4 text-green-500",
                  isUpdating && "animate-pulse"
                )} />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className={cn(
                "text-xs",
                isConnected ? "text-green-600" : "text-red-600"
              )}>
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>

            {/* Activity pulse indicator */}
            {isUpdating && (
              <div className="flex items-center gap-1">
                <Activity className="h-3 w-3 text-blue-500 animate-spin" />
                <span className="text-xs text-blue-600">Updating...</span>
              </div>
            )}
          </div>
        </div>

        {/* Last updated timestamp */}
        <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
          <Clock className="h-3 w-3" />
          <span>Updated {formatLastUpdated(lastUpdated)}</span>
          {riskData.isLoading && (
            <span className="ml-2 text-blue-600">Refreshing...</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Risk Level</span>
            <div className="flex items-center gap-2">
              {/* Live risk level indicator */}
              <div className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                (riskData.data?.riskLevel === 'critical') ? "bg-red-500" :
                (riskData.data?.riskLevel === 'high') ? "bg-orange-500" :
                (riskData.data?.riskLevel === 'medium') ? "bg-yellow-500" : "bg-green-500"
              )} />
              <Badge variant="outline" className="text-xs">
                {riskData.data?.riskLevel || 'low'}
              </Badge>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Active Risks</span>
            <span className="font-medium">{riskData.data?.summary?.totalRisks || 0}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Risk Score</span>
            <span className={cn(
              "font-medium",
              (riskData.data?.overallRiskScore || 0) > 70 ? "text-red-600" :
              (riskData.data?.overallRiskScore || 0) > 40 ? "text-yellow-600" : "text-green-600"
            )}>
              {riskData.data?.overallRiskScore || 0}/100
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Notifications</span>
            <span className="font-medium">{allNotifications.length}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}