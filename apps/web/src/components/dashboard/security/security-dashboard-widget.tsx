import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  AlertTriangle,
  Lock,
  Users,
  Activity,
  RefreshCw,
  Settings,
  Download,
} from "lucide-react";
import { SecurityMetricsCard } from "./security-metrics-card";
import { SecurityAlertsList } from "./security-alerts-list";
import { SecurityThreatChart } from "./security-threat-chart";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SecurityMetrics, SecurityAlert } from "./types";
import { cn } from "@/lib/cn";

export function SecurityDashboardWidget() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("7d");

  // Fetch security metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery<SecurityMetrics>({
    queryKey: ["security-metrics"],
    queryFn: async () => {
      const response = await fetch("/api/security/metrics");
      if (!response.ok) throw new Error("Failed to fetch security metrics");
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch security alerts
  const { data: alerts, isLoading: alertsLoading } = useQuery<SecurityAlert[]>({
    queryKey: ["security-alerts", timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/security/alerts?timeRange=${timeRange}`);
      if (!response.ok) throw new Error("Failed to fetch security alerts");
      return response.json();
    },
    refetchInterval: 30000,
  });

  // Fetch threat data for chart
  const { data: threatData, isLoading: threatLoading } = useQuery({
    queryKey: ["security-threats", timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/security/threats?timeRange=${timeRange}`);
      if (!response.ok) throw new Error("Failed to fetch threat data");
      return response.json();
    },
  });

  // Resolve alert mutation
  const resolveAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const response = await fetch(`/api/security/alerts/${alertId}/resolve`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to resolve alert");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["security-metrics"] });
    },
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["security-metrics"] });
    queryClient.invalidateQueries({ queryKey: ["security-alerts"] });
    queryClient.invalidateQueries({ queryKey: ["security-threats"] });
  };

  const handleExportReport = async () => {
    try {
      const response = await fetch("/api/security/export-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeRange }),
      });
      
      if (!response.ok) throw new Error("Failed to export report");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `security-report-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const getSecurityScoreSeverity = (score: number): "critical" | "high" | "medium" | "low" | "info" => {
    if (score < 40) return "critical";
    if (score < 60) return "high";
    if (score < 75) return "medium";
    if (score < 90) return "low";
    return "info";
  };

  if (metricsLoading || alertsLoading || threatLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading security dashboard...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" aria-hidden="true" />
            Security Dashboard
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor security metrics and respond to threats in real-time
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            aria-label="Refresh security data"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportReport}
            aria-label="Export security report"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Security Score and Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <SecurityMetricsCard
          title="Security Score"
          value={metrics?.securityScore ?? 0}
          icon={Shield}
          severity={getSecurityScoreSeverity(metrics?.securityScore ?? 0)}
          description="Overall security health"
          trend={metrics?.securityScore && metrics.securityScore > 75 ? "up" : "down"}
          trendValue={`${metrics?.securityScore ?? 0}/100`}
        />
        
        <SecurityMetricsCard
          title="Active Threats"
          value={metrics?.activeThreats ?? 0}
          icon={AlertTriangle}
          severity={
            (metrics?.activeThreats ?? 0) > 10
              ? "critical"
              : (metrics?.activeThreats ?? 0) > 5
              ? "high"
              : "info"
          }
          description="Requires attention"
        />
        
        <SecurityMetricsCard
          title="Failed Logins"
          value={metrics?.failedLogins24h ?? 0}
          icon={Lock}
          severity={
            (metrics?.failedLogins24h ?? 0) > 50
              ? "high"
              : (metrics?.failedLogins24h ?? 0) > 20
              ? "medium"
              : "low"
          }
          description="Last 24 hours"
          trend={(metrics?.failedLogins24h ?? 0) > 20 ? "up" : "down"}
        />
        
        <SecurityMetricsCard
          title="Active Sessions"
          value={metrics?.activeSessions ?? 0}
          icon={Users}
          severity="info"
          description="Current users online"
        />
        
        <SecurityMetricsCard
          title="2FA Adoption"
          value={`${metrics?.twoFactorAdoption ?? 0}%`}
          icon={Activity}
          severity={
            (metrics?.twoFactorAdoption ?? 0) < 50
              ? "high"
              : (metrics?.twoFactorAdoption ?? 0) < 75
              ? "medium"
              : "low"
          }
          description="Team-wide adoption"
          trend={(metrics?.twoFactorAdoption ?? 0) > 50 ? "up" : "down"}
        />
      </div>

      {/* Detailed Views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="text-sm">
            Overview
          </TabsTrigger>
          <TabsTrigger value="alerts" className="text-sm">
            Alerts ({alerts?.filter(a => !a.resolved).length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-sm">
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SecurityThreatChart data={threatData ?? []} timeRange={timeRange} />
            <SecurityAlertsList
              alerts={alerts ?? []}
              maxItems={5}
              onResolve={(alertId) => resolveAlertMutation.mutate(alertId)}
            />
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant={timeRange === "24h" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange("24h")}
              >
                24h
              </Button>
              <Button
                variant={timeRange === "7d" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange("7d")}
              >
                7d
              </Button>
              <Button
                variant={timeRange === "30d" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange("30d")}
              >
                30d
              </Button>
            </div>
          </div>
          
          <SecurityAlertsList
            alerts={alerts ?? []}
            maxItems={20}
            onResolve={(alertId) => resolveAlertMutation.mutate(alertId)}
          />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <SecurityThreatChart data={threatData ?? []} timeRange={timeRange} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

