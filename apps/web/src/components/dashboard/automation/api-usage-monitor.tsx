import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  Download,
  RefreshCw,
  Globe,
  Server,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/cn";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";

interface APIMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  avgResponseTime: number; // milliseconds
  p95ResponseTime: number; // milliseconds
  p99ResponseTime: number; // milliseconds
  errorRate: number; // percentage
  rateLimitRemaining: number;
  rateLimitTotal: number;
  rateLimitResetAt: Date;
}

interface EndpointStats {
  endpoint: string;
  method: string;
  calls: number;
  avgResponseTime: number;
  errorRate: number;
  lastCalled: Date;
  status: "healthy" | "degraded" | "failing";
}

interface APICall {
  id: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: Date;
  error?: string;
}

interface TimeseriesData {
  time: string;
  calls: number;
  errors: number;
  avgResponseTime: number;
}

type TimeRange = "hour" | "day" | "week" | "month";

export function APIUsageMonitor() {
  const [timeRange, setTimeRange] = useState<TimeRange>("day");
  const [selectedTab, setSelectedTab] = useState("overview");

  // Fetch API metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery<APIMetrics>({
    queryKey: ["api-metrics", timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/monitoring/metrics?range=${timeRange}`);
      if (!response.ok) throw new Error("Failed to fetch API metrics");
      const result = await response.json();
      return result.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch endpoint stats
  const { data: endpoints, isLoading: endpointsLoading } = useQuery<EndpointStats[]>({
    queryKey: ["api-endpoints", timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/monitoring/endpoints?range=${timeRange}`);
      if (!response.ok) throw new Error("Failed to fetch endpoint stats");
      const result = await response.json();
      return result.data;
    },
  });

  // Fetch recent API calls
  const { data: recentCalls, isLoading: callsLoading } = useQuery<APICall[]>({
    queryKey: ["api-recent-calls"],
    queryFn: async () => {
      const response = await fetch("/api/monitoring/recent-calls");
      if (!response.ok) throw new Error("Failed to fetch recent calls");
      const result = await response.json();
      return result.data;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch timeseries data
  const { data: timeseries, isLoading: timeseriesLoading } = useQuery<TimeseriesData[]>({
    queryKey: ["api-timeseries", timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/monitoring/timeseries?range=${timeRange}`);
      if (!response.ok) throw new Error("Failed to fetch timeseries");
      const result = await response.json();
      return result.data;
    },
  });

  const rateLimitPercentage = useMemo(() => {
    if (!metrics) return 0;
    return ((metrics.rateLimitTotal - metrics.rateLimitRemaining) / metrics.rateLimitTotal) * 100;
  }, [metrics]);

  const getStatusColor = (status: string) => {
    if (status === "healthy") return "text-green-600";
    if (status === "degraded") return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      healthy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      degraded: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      failing: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
    return styles[status as keyof typeof styles] || styles.healthy;
  };

  const getStatusCodeColor = (code: number) => {
    if (code >= 200 && code < 300) return "text-green-600";
    if (code >= 300 && code < 400) return "text-blue-600";
    if (code >= 400 && code < 500) return "text-yellow-600";
    return "text-red-600";
  };

  const getMethodBadge = (method: string) => {
    const styles = {
      GET: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      POST: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      PUT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      PATCH: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
    return styles[method as keyof typeof styles] || "bg-gray-100 text-gray-800";
  };

  if (metricsLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-muted-foreground">Loading API usage data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600" aria-hidden="true" />
            API Usage Monitor
          </CardTitle>
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hour">Last Hour</SelectItem>
                <SelectItem value="day">Last 24 Hours</SelectItem>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor API call volume, response times, error rates, and rate limits
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="logs">Recent Calls</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border border-border rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-4 w-4 text-blue-600" aria-hidden="true" />
                  <span className="text-xs text-muted-foreground">Total Calls</span>
                </div>
                <div className="text-3xl font-bold">{metrics?.totalCalls.toLocaleString() ?? 0}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {metrics?.successfulCalls.toLocaleString() ?? 0} successful
                </div>
              </div>

              <div className="p-4 border border-border rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" />
                  <span className="text-xs text-muted-foreground">Success Rate</span>
                </div>
                <div className="text-3xl font-bold text-green-600">
                  {metrics?.totalCalls
                    ? ((metrics.successfulCalls / metrics.totalCalls) * 100).toFixed(1)
                    : 0}
                  %
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {metrics?.failedCalls ?? 0} failures
                </div>
              </div>

              <div className="p-4 border border-border rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-purple-600" aria-hidden="true" />
                  <span className="text-xs text-muted-foreground">Avg Response</span>
                </div>
                <div className="text-3xl font-bold">{metrics?.avgResponseTime ?? 0}ms</div>
                <div className="text-xs text-muted-foreground mt-1">
                  P95: {metrics?.p95ResponseTime ?? 0}ms
                </div>
              </div>

              <div className="p-4 border border-border rounded-lg bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-orange-600" aria-hidden="true" />
                  <span className="text-xs text-muted-foreground">Error Rate</span>
                </div>
                <div className={cn("text-3xl font-bold", metrics?.errorRate ?? 0 > 5 ? "text-red-600" : "text-green-600")}>
                  {metrics?.errorRate.toFixed(2) ?? 0}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">in {timeRange}</div>
              </div>
            </div>

            {/* Rate Limit Status */}
            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  Rate Limit Status
                </h4>
                <span className="text-xs text-muted-foreground">
                  Resets: {metrics?.rateLimitResetAt ? new Date(metrics.rateLimitResetAt).toLocaleTimeString() : "N/A"}
                </span>
              </div>
              <Progress
                value={rateLimitPercentage}
                className={cn(
                  "h-3 mb-2",
                  rateLimitPercentage <= 70 && "[&>div]:bg-green-600",
                  rateLimitPercentage > 70 && rateLimitPercentage <= 90 && "[&>div]:bg-yellow-600",
                  rateLimitPercentage > 90 && "[&>div]:bg-red-600"
                )}
              />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Used: {(metrics?.rateLimitTotal ?? 0) - (metrics?.rateLimitRemaining ?? 0)} / {metrics?.rateLimitTotal ?? 0}
                </span>
                <span className={cn("font-medium", rateLimitPercentage > 90 ? "text-red-600" : "text-green-600")}>
                  {metrics?.rateLimitRemaining ?? 0} remaining
                </span>
              </div>
            </div>

            {/* Call Volume Chart */}
            <div className="border border-border rounded-lg p-4">
              <h4 className="text-sm font-semibold mb-4">API Call Volume</h4>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timeseries || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip contentStyle={{ backgroundColor: "rgba(255, 255, 255, 0.95)", borderRadius: "8px" }} />
                  <Legend />
                  <Area type="monotone" dataKey="calls" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} name="Total Calls" />
                  <Area type="monotone" dataKey="errors" stroke="#EF4444" fill="#EF4444" fillOpacity={0.3} name="Errors" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* Endpoints Tab */}
          <TabsContent value="endpoints" className="mt-6">
            <ScrollArea className="h-[500px] pr-4">
              {endpointsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {endpoints?.map((endpoint) => (
                    <div
                      key={`${endpoint.method}-${endpoint.endpoint}`}
                      className="p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={cn("text-xs", getMethodBadge(endpoint.method))}>
                              {endpoint.method}
                            </Badge>
                            <span className="font-mono text-sm">{endpoint.endpoint}</span>
                            <Badge variant="outline" className={cn("text-xs", getStatusBadge(endpoint.status))}>
                              {endpoint.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Last called: {new Date(endpoint.lastCalled).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-muted-foreground">Calls:</span>
                          <span className="font-medium ml-1">{endpoint.calls.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg Time:</span>
                          <span className="font-medium ml-1">{endpoint.avgResponseTime}ms</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Error Rate:</span>
                          <span className={cn("font-medium ml-1", endpoint.errorRate > 5 ? "text-red-600" : "text-green-600")}>
                            {endpoint.errorRate.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="mt-6 space-y-6">
            <div className="border border-border rounded-lg p-4">
              <h4 className="text-sm font-semibold mb-4">Response Time Trends</h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeseries || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis label={{ value: "ms", angle: -90, position: "insideLeft" }} />
                  <Tooltip contentStyle={{ backgroundColor: "rgba(255, 255, 255, 0.95)", borderRadius: "8px" }} />
                  <Legend />
                  <Line type="monotone" dataKey="avgResponseTime" stroke="#8B5CF6" strokeWidth={2} name="Avg Response Time" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 border border-border rounded-lg bg-background/50">
                <div className="text-xs text-muted-foreground mb-1">Average Response</div>
                <div className="text-2xl font-bold">{metrics?.avgResponseTime ?? 0}ms</div>
              </div>
              <div className="p-4 border border-border rounded-lg bg-background/50">
                <div className="text-xs text-muted-foreground mb-1">95th Percentile</div>
                <div className="text-2xl font-bold">{metrics?.p95ResponseTime ?? 0}ms</div>
              </div>
              <div className="p-4 border border-border rounded-lg bg-background/50">
                <div className="text-xs text-muted-foreground mb-1">99th Percentile</div>
                <div className="text-2xl font-bold">{metrics?.p99ResponseTime ?? 0}ms</div>
              </div>
            </div>
          </TabsContent>

          {/* Recent Calls Tab */}
          <TabsContent value="logs" className="mt-6">
            <ScrollArea className="h-[500px] pr-4">
              {callsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentCalls?.map((call) => (
                    <div
                      key={call.id}
                      className="p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors font-mono text-xs"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn(getMethodBadge(call.method))}>
                            {call.method}
                          </Badge>
                          <span className="text-muted-foreground">{call.endpoint}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={cn("font-medium", getStatusCodeColor(call.statusCode))}>
                            {call.statusCode}
                          </span>
                          <span className="text-muted-foreground">{call.responseTime}ms</span>
                        </div>
                      </div>
                      <div className="text-muted-foreground">
                        {new Date(call.timestamp).toLocaleString()}
                      </div>
                      {call.error && (
                        <div className="text-red-600 mt-2 text-xs">{call.error}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Alert Banner */}
        {(metrics?.errorRate ?? 0) > 10 && (
          <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div className="text-xs text-red-900 dark:text-red-200">
              <strong>High Error Rate:</strong> The API error rate is above 10%. This may indicate service degradation or issues with external integrations.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

