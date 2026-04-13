import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Zap,
  Play,
  Pause,
  Trash2,
  Edit,
  Plus,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Copy,
  Download,
  Settings,
  Activity,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/cn";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: "task_created" | "task_completed" | "time_scheduled" | "status_changed" | "field_updated";
    config: Record<string, any>;
  };
  actions: Array<{
    type: "send_notification" | "update_field" | "create_task" | "assign_user" | "send_email";
    config: Record<string, any>;
  }>;
  status: "active" | "paused" | "error";
  enabled: boolean;
  createdBy: string;
  createdAt: Date;
  lastRun?: Date;
  executionCount: number;
  successRate: number; // percentage
  avgExecutionTime: number; // milliseconds
}

interface AutomationMetrics {
  totalRules: number;
  activeRules: number;
  pausedRules: number;
  errorRules: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgExecutionTime: number;
}

interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: "task_management" | "notifications" | "workflows" | "integrations";
  icon: string;
  popularity: number;
  trigger: {
    type: string;
    config: Record<string, any>;
  };
  actions: Array<{
    type: string;
    config: Record<string, any>;
  }>;
}

interface ExecutionHistory {
  id: string;
  ruleId: string;
  ruleName: string;
  timestamp: Date;
  status: "success" | "failure";
  duration: number;
  error?: string;
}

const STATUS_COLORS = {
  active: "#10B981",
  paused: "#FBBF24",
  error: "#EF4444",
};

export function AutomationRulesDashboard() {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch automation metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery<AutomationMetrics>({
    queryKey: ["automation-metrics"],
    queryFn: async () => {
      const response = await fetch("/api/automation/metrics");
      if (!response.ok) throw new Error("Failed to fetch metrics");
      const result = await response.json();
      return result.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch automation rules
  const { data: rules, isLoading: rulesLoading } = useQuery<AutomationRule[]>({
    queryKey: ["automation-rules"],
    queryFn: async () => {
      const response = await fetch("/api/automation/rules");
      if (!response.ok) throw new Error("Failed to fetch rules");
      const result = await response.json();
      return result.data;
    },
  });

  // Fetch templates
  const { data: templates, isLoading: templatesLoading } = useQuery<AutomationTemplate[]>({
    queryKey: ["automation-templates"],
    queryFn: async () => {
      const response = await fetch("/api/automation/templates");
      if (!response.ok) throw new Error("Failed to fetch templates");
      const result = await response.json();
      return result.data;
    },
  });

  // Fetch execution history
  const { data: history, isLoading: historyLoading } = useQuery<ExecutionHistory[]>({
    queryKey: ["automation-history"],
    queryFn: async () => {
      const response = await fetch("/api/automation/history");
      if (!response.ok) throw new Error("Failed to fetch history");
      const result = await response.json();
      return result.data;
    },
  });

  // Toggle rule status mutation
  const toggleRuleMutation = useMutation({
    mutationFn: async ({ ruleId, enabled }: { ruleId: string; enabled: boolean }) => {
      const response = await fetch(`/api/automation/rules/${ruleId}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) throw new Error("Failed to toggle rule");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      queryClient.invalidateQueries({ queryKey: ["automation-metrics"] });
    },
  });

  // Delete rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const response = await fetch(`/api/automation/rules/${ruleId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete rule");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      queryClient.invalidateQueries({ queryKey: ["automation-metrics"] });
    },
  });

  // Filtered rules
  const filteredRules = useMemo(() => {
    if (!rules) return [];
    let filtered = rules;

    if (filterStatus !== "all") {
      filtered = filtered.filter((rule) => rule.status === filterStatus);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (rule) =>
          rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          rule.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [rules, filterStatus, searchQuery]);

  // Chart data
  const statusDistribution = useMemo(() => {
    if (!rules) return [];
    const counts = {
      active: rules.filter((r) => r.status === "active").length,
      paused: rules.filter((r) => r.status === "paused").length,
      error: rules.filter((r) => r.status === "error").length,
    };
    return [
      { name: "Active", value: counts.active, color: STATUS_COLORS.active },
      { name: "Paused", value: counts.paused, color: STATUS_COLORS.paused },
      { name: "Error", value: counts.error, color: STATUS_COLORS.error },
    ];
  }, [rules]);

  const getTriggerIcon = (type: string) => {
    const icons: Record<string, any> = {
      task_created: Plus,
      task_completed: CheckCircle2,
      time_scheduled: Clock,
      status_changed: Activity,
      field_updated: Edit,
    };
    return icons[type] || Zap;
  };

  const getTriggerLabel = (type: string) => {
    const labels: Record<string, string> = {
      task_created: "Task Created",
      task_completed: "Task Completed",
      time_scheduled: "Scheduled Time",
      status_changed: "Status Changed",
      field_updated: "Field Updated",
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
    return styles[status as keyof typeof styles] || styles.active;
  };

  if (metricsLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-muted-foreground">Loading automation dashboard...</span>
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
            <Zap className="h-5 w-5 text-yellow-600" aria-hidden="true" />
            Automation Rules Dashboard
          </CardTitle>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Rule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Automation Rule</DialogTitle>
                  <DialogDescription>
                    Set up a new automation rule to streamline your workflows
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Rule Name</Label>
                    <Input placeholder="e.g., Auto-assign new tasks" />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input placeholder="Brief description of what this rule does" />
                  </div>
                  <div className="space-y-2">
                    <Label>Trigger</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select trigger" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="task_created">Task Created</SelectItem>
                        <SelectItem value="task_completed">Task Completed</SelectItem>
                        <SelectItem value="time_scheduled">Scheduled Time</SelectItem>
                        <SelectItem value="status_changed">Status Changed</SelectItem>
                        <SelectItem value="field_updated">Field Updated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsCreateDialogOpen(false)}>Create Rule</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Manage automation rules, workflows, and performance metrics
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="rules">Rules</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border border-border rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-blue-600" aria-hidden="true" />
                  <span className="text-xs text-muted-foreground">Total Rules</span>
                </div>
                <div className="text-3xl font-bold">{metrics?.totalRules ?? 0}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {metrics?.activeRules ?? 0} active
                </div>
              </div>

              <div className="p-4 border border-border rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" />
                  <span className="text-xs text-muted-foreground">Success Rate</span>
                </div>
                <div className="text-3xl font-bold text-green-600">
                  {metrics?.totalExecutions
                    ? ((metrics.successfulExecutions / metrics.totalExecutions) * 100).toFixed(1)
                    : 0}
                  %
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {metrics?.successfulExecutions ?? 0} successful
                </div>
              </div>

              <div className="p-4 border border-border rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-purple-600" aria-hidden="true" />
                  <span className="text-xs text-muted-foreground">Executions</span>
                </div>
                <div className="text-3xl font-bold">{metrics?.totalExecutions ?? 0}</div>
                <div className="text-xs text-muted-foreground mt-1">total runs</div>
              </div>

              <div className="p-4 border border-border rounded-lg bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-orange-600" aria-hidden="true" />
                  <span className="text-xs text-muted-foreground">Avg Time</span>
                </div>
                <div className="text-3xl font-bold">{metrics?.avgExecutionTime ?? 0}ms</div>
                <div className="text-xs text-muted-foreground mt-1">execution time</div>
              </div>
            </div>

            {/* Status Distribution */}
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-border rounded-lg p-4">
                <h4 className="text-sm font-semibold mb-4">Rules by Status</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="border border-border rounded-lg p-4">
                <h4 className="text-sm font-semibold mb-4">Quick Stats</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 border border-border rounded">
                    <span className="text-sm">Active Rules</span>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      {metrics?.activeRules ?? 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 border border-border rounded">
                    <span className="text-sm">Paused Rules</span>
                    <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                      {metrics?.pausedRules ?? 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 border border-border rounded">
                    <span className="text-sm">Error Rules</span>
                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                      {metrics?.errorRules ?? 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 border border-border rounded">
                    <span className="text-sm">Failed Executions</span>
                    <Badge variant="outline">{metrics?.failedExecutions ?? 0}</Badge>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Rules Tab */}
          <TabsContent value="rules" className="mt-6 space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-3">
              <Input
                placeholder="Search rules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs"
              />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Rules List */}
            <ScrollArea className="h-[500px] pr-4">
              {rulesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRules.map((rule) => {
                    const TriggerIcon = getTriggerIcon(rule.trigger.type);
                    return (
                      <div
                        key={rule.id}
                        className="p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{rule.name}</span>
                              <Badge variant="outline" className={cn("text-xs", getStatusBadge(rule.status))}>
                                {rule.status}
                              </Badge>
                              {!rule.enabled && (
                                <Badge variant="outline" className="text-xs">
                                  Disabled
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{rule.description}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <TriggerIcon className="h-3 w-3" />
                                {getTriggerLabel(rule.trigger.type)}
                              </span>
                              <ArrowRight className="h-3 w-3" />
                              <span>{rule.actions.length} action(s)</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                toggleRuleMutation.mutate({ ruleId: rule.id, enabled: !rule.enabled })
                              }
                            >
                              {rule.enabled ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteRuleMutation.mutate(rule.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </div>

                        {/* Performance Metrics */}
                        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
                          <div className="text-xs">
                            <span className="text-muted-foreground">Executions:</span>
                            <span className="font-medium ml-1">{rule.executionCount}</span>
                          </div>
                          <div className="text-xs">
                            <span className="text-muted-foreground">Success Rate:</span>
                            <span className="font-medium ml-1 text-green-600">{rule.successRate}%</span>
                          </div>
                          <div className="text-xs">
                            <span className="text-muted-foreground">Avg Time:</span>
                            <span className="font-medium ml-1">{rule.avgExecutionTime}ms</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="mt-6">
            <ScrollArea className="h-[500px] pr-4">
              {templatesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {templates?.map((template) => (
                    <div
                      key={template.id}
                      className="p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="text-2xl">{template.icon}</div>
                          <div>
                            <h4 className="font-medium text-sm">{template.name}</h4>
                            <Badge variant="outline" className="text-xs mt-1">
                              {template.category}
                            </Badge>
                          </div>
                        </div>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{template.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {template.popularity} uses
                        </span>
                        <Button size="sm" variant="outline">
                          Use Template
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-6">
            <ScrollArea className="h-[500px] pr-4">
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-2">
                  {history?.map((execution) => (
                    <div
                      key={execution.id}
                      className="p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{execution.ruleName}</span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                execution.status === "success"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              )}
                            >
                              {execution.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(execution.timestamp).toLocaleString()} • {execution.duration}ms
                          </div>
                          {execution.error && (
                            <div className="text-xs text-red-600 mt-1">{execution.error}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

