import { useState } from "react";
import { BarChart, LineChart, PieChart } from "@/components/ui/charts";
import { useSecurityAnalytics } from "@/hooks/use-security-analytics";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Activity, AlertTriangle, Shield, Users } from "lucide-react";

interface SecurityAnalyticsProps {
  userId: string;
  workspaceId: string;
}

export function SecurityAnalytics({ userId, workspaceId }: SecurityAnalyticsProps) {
  const [dateRange, setDateRange] = useState({ from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), to: new Date() });
  const [metricType, setMetricType] = useState("all");
  
  const { data, loading } = useSecurityAnalytics({
    userId,
    workspaceId,
    dateRange,
    metricType
  });

  return (
    <div className="space-y-8 bg-white dark:bg-gray-900 p-6 rounded-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Security Analytics</h2>
        <div className="flex items-center space-x-4">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
          />
          <Select
            value={metricType}
            onValueChange={setMetricType}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
            options={[
              { value: "all", label: "All Metrics" },
              { value: "auth", label: "Authentication" },
              { value: "threats", label: "Threats" },
              { value: "access", label: "Access Patterns" }
            ]}
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <Shield className="h-6 w-6 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Security Score</p>
              <h3 className="text-2xl font-bold">{data.securityScore}%</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <div>
              <p className="text-sm text-gray-600">Active Threats</p>
              <h3 className="text-2xl font-bold">{data.activeThreats}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <Activity className="h-6 w-6 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Security Events</p>
              <h3 className="text-2xl font-bold">{data.securityEvents}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <Users className="h-6 w-6 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Protected Users</p>
              <h3 className="text-2xl font-bold">{data.protectedUsers}</h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Security Events Over Time</h3>
          <LineChart
            data={data.eventsOverTime}
            xAxis="date"
            yAxis="events"
            height={300}
          />
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Threat Distribution</h3>
          <PieChart
            data={data.threatDistribution}
            nameKey="type"
            valueKey="count"
            height={300}
          />
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Authentication Methods Usage</h3>
          <BarChart
            data={data.authMethodsUsage}
            xAxis="method"
            yAxis="usage"
            height={300}
          />
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Security Score Trends</h3>
          <LineChart
            data={data.scoreHistory}
            xAxis="date"
            yAxis="score"
            height={300}
          />
        </Card>
      </div>

      {/* Detailed Metrics Table */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Detailed Security Metrics</h3>
        <table className="w-full">
          <thead>
            <tr className="text-left border-b">
              <th className="pb-3">Metric</th>
              <th className="pb-3">Current</th>
              <th className="pb-3">Previous</th>
              <th className="pb-3">Change</th>
            </tr>
          </thead>
          <tbody>
            {data.detailedMetrics.map((metric) => (
              <tr key={metric.name} className="border-b">
                <td className="py-3">{metric.name}</td>
                <td className="py-3">{metric.current}</td>
                <td className="py-3">{metric.previous}</td>
                <td className="py-3">
                  <span className={metric.change >= 0 ? "text-green-600" : "text-red-600"}>
                    {metric.change >= 0 ? "+" : ""}{metric.change}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}