import React, { Suspense, lazy } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Shield, Lock, Users, Eye, FileCheck } from "lucide-react";
import UniversalHeader from "@/components/dashboard/universal-header";
import { useRBACAuth } from "@/lib/permissions";
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";

// Import Security Dashboard Components
import { SecurityDashboardWidget } from "@/components/dashboard/security/security-dashboard-widget";
import { AccessControlMonitor } from "@/components/dashboard/security/access-control-monitor";
import { TwoFactorStatusWidget } from "@/components/dashboard/security/tfa-status-widget";
import { GDPRComplianceWidget } from "@/components/dashboard/security/gdpr-compliance-widget";
import { SessionManagementWidget } from "@/components/dashboard/security/session-management-widget";

// Lazy load components for better performance
const BlurFade = lazy(() => import("@/components/magicui/blur-fade").then(m => ({ default: m.BlurFade })));

export const Route = createFileRoute("/dashboard/security")({
  component: SecurityDashboardPage,
  beforeLoad: ({ context }) => {
    // Check if user has access to security dashboard
    const user = context.auth?.user;
    if (!user?.role || !["workspace-manager", "admin"].includes(user.role)) {
      throw new Error("Unauthorized: Security dashboard access restricted to admins and workspace managers");
    }
  },
});

function SecurityDashboardPage() {
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

  // Security role check - only admins and workspace managers can access
  if (!user?.role || !["workspace-manager", "admin"].includes(user.role)) {
    return (
      <div className="flex-1 p-6 bg-gray-50/50 dark:bg-gradient-dark">
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <Shield className="h-12 w-12 text-red-500" />
          <div className="text-center">
            <h3 className="text-lg font-medium text-foreground">Access Restricted</h3>
            <p className="text-sm text-muted-foreground mt-1">Security dashboard is only available to workspace managers and administrators.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 bg-gray-50/50 dark:bg-gradient-dark">
      <UniversalHeader 
        title="Security Dashboard"
        subtitle="Monitor security, compliance, and access controls across your workspace"
        variant="default"
        customActions={
          <div className="flex items-center space-x-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg glass-card">
              <Shield className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-700 dark:text-red-300">Security Center</span>
            </div>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Security Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <Shield className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Security Status</p>
                  <p className="text-xs text-muted-foreground">Active monitoring</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Lock className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Access Control</p>
                  <p className="text-xs text-muted-foreground">User permissions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Users className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Session Management</p>
                  <p className="text-xs text-muted-foreground">Active sessions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <FileCheck className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Compliance</p>
                  <p className="text-xs text-muted-foreground">GDPR status</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Security Dashboard Widgets */}
        <div className="space-y-6">
          <Suspense fallback={<Card className="glass-card"><CardContent className="h-64 animate-pulse bg-gray-100 dark:bg-muted"></CardContent></Card>}>
            <BlurFade delay={0.1} inView>
              <SecurityDashboardWidget />
            </BlurFade>
          </Suspense>
          
          <Suspense fallback={<Card className="glass-card"><CardContent className="h-64 animate-pulse bg-gray-100 dark:bg-muted"></CardContent></Card>}>
            <BlurFade delay={0.2} inView>
              <AccessControlMonitor />
            </BlurFade>
          </Suspense>
          
          <Suspense fallback={<Card className="glass-card"><CardContent className="h-64 animate-pulse bg-gray-100 dark:bg-muted"></CardContent></Card>}>
            <BlurFade delay={0.3} inView>
              <TwoFactorStatusWidget />
            </BlurFade>
          </Suspense>
          
          <Suspense fallback={<Card className="glass-card"><CardContent className="h-64 animate-pulse bg-gray-100 dark:bg-muted"></CardContent></Card>}>
            <BlurFade delay={0.4} inView>
              <GDPRComplianceWidget />
            </BlurFade>
          </Suspense>
          
          <Suspense fallback={<Card className="glass-card"><CardContent className="h-64 animate-pulse bg-gray-100 dark:bg-muted"></CardContent></Card>}>
            <BlurFade delay={0.5} inView>
              <SessionManagementWidget />
            </BlurFade>
          </Suspense>
        </div>
      </div>
    </div>
  );
}