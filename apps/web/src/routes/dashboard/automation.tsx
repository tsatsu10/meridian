import React, { Suspense, lazy } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Target, Zap, BarChart3, Clock, Settings } from "lucide-react";
import UniversalHeader from "@/components/dashboard/universal-header";
import { useRBACAuth } from "@/lib/permissions";
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";

// Import Automation Dashboard Components
import { AutomationRulesDashboard } from "@/components/dashboard/automation/automation-rules-dashboard";
import { APIUsageMonitor } from "@/components/dashboard/automation/api-usage-monitor";
import { ScheduledReportsWidget } from "@/components/dashboard/automation/scheduled-reports-widget";

// Lazy load components for better performance
const BlurFade = lazy(() => import("@/components/magicui/blur-fade").then(m => ({ default: m.BlurFade })));

export const Route = createFileRoute("/dashboard/automation")({
  component: AutomationDashboardPage,
  beforeLoad: ({ context }) => {
    // Check if user has access to automation dashboard
    const user = context.auth?.user;
    if (!user?.role || !["workspace-manager", "admin"].includes(user.role)) {
      throw new Error("Unauthorized: Automation dashboard access restricted to admins and workspace managers");
    }
  },
});

function AutomationDashboardPage() {
  const { user } = useAuth();
  
  // Safe RBAC hook usage with fallback
  let rbacAuth;
  let hasPermission = (action: string, context?: any) => false;
  
  try {
    rbacAuth = useRBACAuth();
    hasPermission = rbacAuth?.hasPermission || ((action: string, context?: any) => false);
  } catch (error) {
    console.warn("RBAC context not available, using fallback permissions");
  }

  // Automation role check - only admins and workspace managers can access
  if (!user?.role || !["workspace-manager", "admin"].includes(user.role)) {
    return (
      <div className="flex-1 p-6 bg-gray-50/50 dark:bg-gradient-dark">
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <Target className="h-12 w-12 text-blue-500" />
          <div className="text-center">
            <h3 className="text-lg font-medium text-foreground">Access Restricted</h3>
            <p className="text-sm text-muted-foreground mt-1">Automation dashboard is only available to workspace managers and administrators.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 bg-gray-50/50 dark:bg-gradient-dark">
      <UniversalHeader 
        title="Automation Hub"
        subtitle="Manage automation rules, monitor API usage, and configure scheduled reports"
        variant="default"
        customActions={
          <div className="flex items-center space-x-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-lg glass-card">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Automation Center</span>
            </div>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Automation Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Target className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Automation Rules</p>
                  <p className="text-xs text-muted-foreground">Active workflows</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Zap className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">API Usage</p>
                  <p className="text-xs text-muted-foreground">Real-time monitoring</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <BarChart3 className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Scheduled Reports</p>
                  <p className="text-xs text-muted-foreground">Automated insights</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Clock className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Performance</p>
                  <p className="text-xs text-muted-foreground">System efficiency</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Automation Dashboard Widgets */}
        <div className="space-y-6">
          <Suspense fallback={<Card className="glass-card"><CardContent className="h-64 animate-pulse bg-gray-100 dark:bg-muted"></CardContent></Card>}>
            <BlurFade delay={0.1} inView>
              <AutomationRulesDashboard />
            </BlurFade>
          </Suspense>
          
          <Suspense fallback={<Card className="glass-card"><CardContent className="h-64 animate-pulse bg-gray-100 dark:bg-muted"></CardContent></Card>}>
            <BlurFade delay={0.2} inView>
              <APIUsageMonitor />
            </BlurFade>
          </Suspense>
          
          <Suspense fallback={<Card className="glass-card"><CardContent className="h-64 animate-pulse bg-gray-100 dark:bg-muted"></CardContent></Card>}>
            <BlurFade delay={0.3} inView>
              <ScheduledReportsWidget />
            </BlurFade>
          </Suspense>
        </div>

        {/* Additional Automation Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 border border-border rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Create New Rule</p>
                    <p className="text-xs text-muted-foreground">Set up automation workflows</p>
                  </div>
                  <Target className="h-4 w-4 text-blue-500" />
                </div>
              </div>
              
              <div className="p-3 border border-border rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Schedule Report</p>
                    <p className="text-xs text-muted-foreground">Configure automated reports</p>
                  </div>
                  <BarChart3 className="h-4 w-4 text-purple-500" />
                </div>
              </div>
              
              <div className="p-3 border border-border rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">API Settings</p>
                    <p className="text-xs text-muted-foreground">Manage API configuration</p>
                  </div>
                  <Zap className="h-4 w-4 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Automation rule "Project Status Updates" executed successfully</span>
                </div>
                
                <div className="flex items-center gap-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Weekly report generated and sent to stakeholders</span>
                </div>
                
                <div className="flex items-center gap-3 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>API usage threshold alert configured</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}