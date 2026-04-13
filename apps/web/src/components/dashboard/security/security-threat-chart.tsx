import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Shield, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/cn";

interface ThreatData {
  date: string;
  failedLogins: number;
  suspiciousActivity: number;
  blockedIPs: number;
}

interface SecurityThreatChartProps {
  data: ThreatData[];
  timeRange?: "24h" | "7d" | "30d";
}

export function SecurityThreatChart({ data, timeRange = "7d" }: SecurityThreatChartProps) {
  const chartData = useMemo(() => {
    return data.map(item => ({
      ...item,
      total: item.failedLogins + item.suspiciousActivity + item.blockedIPs,
    }));
  }, [data]);

  const totalThreats = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.total, 0);
  }, [chartData]);

  const trend = useMemo(() => {
    if (chartData.length < 2) return { direction: "neutral" as const, value: 0 };
    
    const recent = chartData[chartData.length - 1].total;
    const previous = chartData[chartData.length - 2].total;
    const change = ((recent - previous) / previous) * 100;
    
    return {
      direction: change > 0 ? "up" as const : change < 0 ? "down" as const : "neutral" as const,
      value: Math.abs(change).toFixed(1),
    };
  }, [chartData]);

  const getBarColor = (value: number) => {
    if (value > 50) return "#ef4444"; // red
    if (value > 20) return "#f59e0b"; // orange
    if (value > 10) return "#eab308"; // yellow
    return "#10b981"; // green
  };

  const timeRangeLabels = {
    "24h": "Last 24 Hours",
    "7d": "Last 7 Days",
    "30d": "Last 30 Days",
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" aria-hidden="true" />
            Threat Activity
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {timeRangeLabels[timeRange]}
            </Badge>
            {trend.direction !== "neutral" && (
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  trend.direction === "up" ? "text-red-600" : "text-green-600"
                )}
              >
                {trend.direction === "up" ? (
                  <TrendingUp className="h-3 w-3 mr-1" aria-hidden="true" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" aria-hidden="true" />
                )}
                {trend.value}%
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="text-3xl font-bold">{totalThreats}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Total security events detected
          </p>
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Bar dataKey="failedLogins" stackId="a" fill="#ef4444" name="Failed Logins" />
            <Bar dataKey="suspiciousActivity" stackId="a" fill="#f59e0b" name="Suspicious Activity" />
            <Bar dataKey="blockedIPs" stackId="a" fill="#10b981" name="Blocked IPs" />
          </BarChart>
        </ResponsiveContainer>

        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="text-sm font-medium text-red-600">Failed Logins</div>
            <div className="text-2xl font-bold">
              {chartData.reduce((sum, item) => sum + item.failedLogins, 0)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-orange-600">Suspicious</div>
            <div className="text-2xl font-bold">
              {chartData.reduce((sum, item) => sum + item.suspiciousActivity, 0)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-green-600">Blocked IPs</div>
            <div className="text-2xl font-bold">
              {chartData.reduce((sum, item) => sum + item.blockedIPs, 0)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

