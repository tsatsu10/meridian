import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL, API_URL } from '@/constants/urls';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InteractiveChart, ChartType, TimeRange } from "@/components/dashboard/interactive-chart";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface WorkspaceAnalyticsProps {
  workspaceId: string;
}

export function WorkspaceAnalytics({ workspaceId }: WorkspaceAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [chartType, setChartType] = useState<ChartType>("line");

  const { data, isLoading, error } = useQuery({
    queryKey: ["workspace-analytics", workspaceId, timeRange],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/analytics?timeRange=${timeRange}`);
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    }
  });

  const handleExport = () => {
    // TODO: Implement CSV export
  };

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error loading analytics: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>

          <Select value={chartType} onValueChange={(value: ChartType) => setChartType(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select chart type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="line">Line Chart</SelectItem>
              <SelectItem value="bar">Bar Chart</SelectItem>
              <SelectItem value="area">Area Chart</SelectItem>
              <SelectItem value="pie">Pie Chart</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Stats Overview */}
      {data && (
        <StatsGrid
          stats={{
            totalTasks: data.productivityMetrics.totalTasks,
            completedTasks: data.productivityMetrics.completedTasks,
            activeProjects: data.projectMetrics.active,
            teamMembers: data.teamMetrics.totalMembers,
            productivity: (data.productivityMetrics.completedTasks / data.productivityMetrics.totalTasks) * 100 || 0,
            overdueTasks: 0 // TODO: Add to API
          }}
          isLoading={isLoading}
          showTrends={true}
        />
      )}

      {/* Project Status Distribution */}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle>Project Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <InteractiveChart
              title="Project Status"
              data={[
                { label: "Active", value: data.projectMetrics.active },
                { label: "Completed", value: data.projectMetrics.completed },
                { label: "On Hold", value: data.projectMetrics.onHold }
              ]}
              chartType="pie"
              height={300}
            />
          </CardContent>
        </Card>
      )}

      {/* Productivity Trend */}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle>Productivity Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <InteractiveChart
              title="Tasks & Hours"
              data={data.productivityTrend}
              chartType={chartType}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              onChartTypeChange={setChartType}
              height={400}
              showTrend={true}
              showComparison={true}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
} 