import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Shield,
  Users,
  Key,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  UserCog,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { cn } from "@/lib/cn";

interface RoleDistribution {
  role: string;
  count: number;
  percentage: number;
  color: string;
}

interface PermissionChange {
  id: string;
  userEmail: string;
  userName: string;
  action: string;
  oldRole?: string;
  newRole?: string;
  performedBy: string;
  timestamp: Date;
}

interface AccessStats {
  totalUsers: number;
  activeUsers: number;
  rolesCount: number;
  recentChanges: number;
}

const ROLE_COLORS = {
  "workspace-manager": "#ef4444", // red
  admin: "#f59e0b", // orange
  "department-head": "#eab308", // yellow
  "project-manager": "#10b981", // green
  "team-lead": "#3b82f6", // blue
  member: "#8b5cf6", // purple
  guest: "#6b7280", // gray
  "project-viewer": "#ec4899", // pink
};

const ROLE_LABELS = {
  "workspace-manager": "Workspace Manager",
  admin: "Admin",
  "department-head": "Department Head",
  "project-manager": "Project Manager",
  "team-lead": "Team Lead",
  member: "Member",
  guest: "Guest",
  "project-viewer": "Project Viewer",
};

export function AccessControlMonitor() {
  const [activeTab, setActiveTab] = useState("distribution");

  // Fetch access control stats
  const { data: stats, isLoading: statsLoading } = useQuery<AccessStats>({
    queryKey: ["access-control-stats"],
    queryFn: async () => {
      const response = await fetch("/api/rbac/stats");
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  // Fetch role distribution
  const { data: roleDistribution, isLoading: distributionLoading } = useQuery<RoleDistribution[]>({
    queryKey: ["role-distribution"],
    queryFn: async () => {
      const response = await fetch("/api/rbac/distribution");
      if (!response.ok) throw new Error("Failed to fetch distribution");
      return response.json();
    },
  });

  // Fetch recent permission changes
  const { data: recentChanges, isLoading: changesLoading } = useQuery<PermissionChange[]>({
    queryKey: ["permission-changes"],
    queryFn: async () => {
      const response = await fetch("/api/rbac/recent-changes");
      if (!response.ok) throw new Error("Failed to fetch changes");
      return response.json();
    },
  });

  if (statsLoading || distributionLoading || changesLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-muted-foreground">Loading access control data...</span>
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
            <Shield className="h-5 w-5 text-blue-600" aria-hidden="true" />
            Access Control Monitor
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {stats?.totalUsers || 0} total users
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor role distribution and permission changes
        </p>
      </CardHeader>
      <CardContent>
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 border border-border rounded-lg bg-background/50">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-blue-600" aria-hidden="true" />
              <span className="text-xs text-muted-foreground">Total Users</span>
            </div>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
          </div>

          <div className="p-4 border border-border rounded-lg bg-background/50">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
              <span className="text-xs text-muted-foreground">Active Users</span>
            </div>
            <div className="text-2xl font-bold">{stats?.activeUsers || 0}</div>
          </div>

          <div className="p-4 border border-border rounded-lg bg-background/50">
            <div className="flex items-center gap-2 mb-2">
              <Key className="h-4 w-4 text-purple-600" aria-hidden="true" />
              <span className="text-xs text-muted-foreground">Unique Roles</span>
            </div>
            <div className="text-2xl font-bold">{stats?.rolesCount || 0}</div>
          </div>

          <div className="p-4 border border-border rounded-lg bg-background/50">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-orange-600" aria-hidden="true" />
              <span className="text-xs text-muted-foreground">Recent Changes</span>
            </div>
            <div className="text-2xl font-bold">{stats?.recentChanges || 0}</div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="distribution">Role Distribution</TabsTrigger>
            <TabsTrigger value="matrix">Permission Matrix</TabsTrigger>
            <TabsTrigger value="changes">Recent Changes</TabsTrigger>
          </TabsList>

          {/* Role Distribution Tab */}
          <TabsContent value="distribution" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <div className="h-[300px]">
                <h3 className="text-sm font-medium mb-4">Role Distribution</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={roleDistribution}
                      dataKey="count"
                      nameKey="role"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry) => `${entry.percentage}%`}
                    >
                      {roleDistribution?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Bar Chart */}
              <div className="h-[300px]">
                <h3 className="text-sm font-medium mb-4">User Count by Role</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={roleDistribution}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="role"
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="count" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Role List */}
            <div className="mt-6">
              <h3 className="text-sm font-medium mb-3">Detailed Breakdown</h3>
              <div className="grid gap-3">
                {roleDistribution?.map((role) => (
                  <div
                    key={role.role}
                    className="flex items-center justify-between p-3 border border-border rounded-lg bg-background/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: role.color }}
                        aria-hidden="true"
                      />
                      <span className="font-medium">{ROLE_LABELS[role.role as keyof typeof ROLE_LABELS] || role.role}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        {role.count} users
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {role.percentage}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Permission Matrix Tab */}
          <TabsContent value="matrix" className="space-y-4">
            <div className="rounded-lg border border-border overflow-hidden">
              <ScrollArea className="h-[400px]">
                <table className="w-full">
                  <thead className="bg-muted/50 sticky top-0 z-10">
                    <tr>
                      <th className="text-left p-3 text-xs font-medium">Role</th>
                      <th className="text-center p-3 text-xs font-medium">Projects</th>
                      <th className="text-center p-3 text-xs font-medium">Tasks</th>
                      <th className="text-center p-3 text-xs font-medium">Users</th>
                      <th className="text-center p-3 text-xs font-medium">Settings</th>
                      <th className="text-center p-3 text-xs font-medium">Analytics</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(ROLE_LABELS).map(([roleKey, roleLabel]) => (
                      <tr key={roleKey} className="border-t border-border hover:bg-muted/30">
                        <td className="p-3 text-sm font-medium">{roleLabel}</td>
                        <td className="text-center p-3">
                          {getPermissionIcon(roleKey, "projects")}
                        </td>
                        <td className="text-center p-3">
                          {getPermissionIcon(roleKey, "tasks")}
                        </td>
                        <td className="text-center p-3">
                          {getPermissionIcon(roleKey, "users")}
                        </td>
                        <td className="text-center p-3">
                          {getPermissionIcon(roleKey, "settings")}
                        </td>
                        <td className="text-center p-3">
                          {getPermissionIcon(roleKey, "analytics")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Full Access</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span>Limited Access</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <span className="text-red-600 text-xs">×</span>
                </div>
                <span>No Access</span>
              </div>
            </div>
          </TabsContent>

          {/* Recent Changes Tab */}
          <TabsContent value="changes" className="space-y-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {recentChanges?.map((change) => (
                  <div
                    key={change.id}
                    className="p-4 border border-border rounded-lg bg-background/50 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <UserCog className="h-4 w-4 text-blue-600" aria-hidden="true" />
                          <span className="font-medium text-sm">{change.userName}</span>
                          <Badge variant="outline" className="text-xs">
                            {change.userEmail}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {change.action}
                        </p>
                        
                        {change.oldRole && change.newRole && (
                          <div className="flex items-center gap-2 text-xs">
                            <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                              {ROLE_LABELS[change.oldRole as keyof typeof ROLE_LABELS] || change.oldRole}
                            </Badge>
                            <TrendingUp className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              {ROLE_LABELS[change.newRole as keyof typeof ROLE_LABELS] || change.newRole}
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground mb-1">
                          by {change.performedBy}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(change.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {(!recentChanges || recentChanges.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
                    <p className="text-sm">No recent permission changes</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Helper function to get permission icon
function getPermissionIcon(role: string, resource: string) {
  // Define permission levels
  const permissions: Record<string, Record<string, "full" | "limited" | "none">> = {
    "workspace-manager": {
      projects: "full",
      tasks: "full",
      users: "full",
      settings: "full",
      analytics: "full",
    },
    admin: {
      projects: "full",
      tasks: "full",
      users: "full",
      settings: "full",
      analytics: "full",
    },
    "department-head": {
      projects: "full",
      tasks: "full",
      users: "limited",
      settings: "limited",
      analytics: "full",
    },
    "project-manager": {
      projects: "full",
      tasks: "full",
      users: "limited",
      settings: "limited",
      analytics: "limited",
    },
    "team-lead": {
      projects: "limited",
      tasks: "full",
      users: "limited",
      settings: "none",
      analytics: "limited",
    },
    member: {
      projects: "limited",
      tasks: "limited",
      users: "none",
      settings: "none",
      analytics: "limited",
    },
    guest: {
      projects: "limited",
      tasks: "limited",
      users: "none",
      settings: "none",
      analytics: "none",
    },
    "project-viewer": {
      projects: "limited",
      tasks: "limited",
      users: "none",
      settings: "none",
      analytics: "limited",
    },
  };

  const level = permissions[role]?.[resource] || "none";

  switch (level) {
    case "full":
      return <CheckCircle className="h-4 w-4 text-green-600" aria-label="Full access" />;
    case "limited":
      return <AlertCircle className="h-4 w-4 text-yellow-600" aria-label="Limited access" />;
    case "none":
      return (
        <div className="w-4 h-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
          <span className="text-red-600 text-xs" aria-label="No access">×</span>
        </div>
      );
  }
}

