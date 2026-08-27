import { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Lock, Users, FileCheck } from "lucide-react";
import UniversalHeader from "@/components/dashboard/universal-header";
import { useRBACAuth } from "@/lib/permissions/context";

// Import Security Dashboard Components
import { SecurityDashboardWidget } from "@/components/dashboard/security/security-dashboard-widget";
import { AccessControlMonitor } from "@/components/dashboard/security/access-control-monitor";
import { TwoFactorStatusWidget } from "@/components/dashboard/security/tfa-status-widget";
import { GDPRComplianceWidget } from "@/components/dashboard/security/gdpr-compliance-widget";
import { SessionManagementWidget } from "@/components/dashboard/security/session-management-widget";
import { BlurFade } from "@/components/magicui/blur-fade";

export const Route = createFileRoute("/dashboard/security")({
  component: SecurityDashboardPage,
  // No beforeLoad guard. There was one, and it made this page unreachable for
  // everybody: it threw when `context.user.role` was not "workspace-manager" or
  // "admin", but `context.user` is the /api/users/me record, whose `role` is the
  // GLOBAL users.role — "member" even for the person who owns the workspace.
  // Workspace authority lives in workspace_members.role, so comparing a global
  // role against workspace role names is a category error that can essentially
  // never match. Worse, throwing from beforeLoad escapes to the dashboard error
  // boundary ("There was an error loading the dashboard"), so the denial was not
  // even legible — this same file already renders a proper "Access Restricted"
  // panel below. Authorization belongs in the component, where it can be shown.
});

function SecurityDashboardPage() {
  // The workspace-scoped RBAC permission is the authority here, not any role
  // string: definitions.ts composes from backend-matrix.generated.ts, which is
  // generated from apps/api/src/constants/rbac.ts — what the server actually
  // enforces. In that matrix `canViewSecurityLogs` is held by workspace-manager
  // alone, which is exactly what the old role list was reaching for.
  //
  // Note this gate is UX, not enforcement: the widgets below call
  // /api/security/*, which is currently guarded by authMiddleware() only, with
  // no permission check. Tightening that is a separate server-side change.
  const { hasPermission, isLoading } = useRBACAuth();

  if (isLoading) {
    return (
      <div className="flex-1 p-6 bg-gray-50/50 dark:bg-gradient-dark">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  if (!hasPermission("canViewSecurityLogs")) {
    return (
      <div className="flex-1 p-6 bg-gray-50/50 dark:bg-gradient-dark">
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <Shield className="h-12 w-12 text-red-500" />
          <div className="text-center">
            <h3 className="text-lg font-medium text-foreground">
              Access Restricted
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Security dashboard is only available to workspace managers.
            </p>
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
              <span className="text-sm font-medium text-red-700 dark:text-red-300">
                Security Center
              </span>
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
                  <p className="text-xs text-muted-foreground">
                    Active monitoring
                  </p>
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
                  <p className="text-xs text-muted-foreground">
                    User permissions
                  </p>
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
                  <p className="text-xs text-muted-foreground">
                    Active sessions
                  </p>
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
          <Suspense
            fallback={
              <Card className="glass-card">
                <CardContent className="h-64 animate-pulse bg-gray-100 dark:bg-muted" />
              </Card>
            }
          >
            <BlurFade delay={0.1} inView>
              <SecurityDashboardWidget />
            </BlurFade>
          </Suspense>

          <Suspense
            fallback={
              <Card className="glass-card">
                <CardContent className="h-64 animate-pulse bg-gray-100 dark:bg-muted" />
              </Card>
            }
          >
            <BlurFade delay={0.2} inView>
              <AccessControlMonitor />
            </BlurFade>
          </Suspense>

          <Suspense
            fallback={
              <Card className="glass-card">
                <CardContent className="h-64 animate-pulse bg-gray-100 dark:bg-muted" />
              </Card>
            }
          >
            <BlurFade delay={0.3} inView>
              <TwoFactorStatusWidget />
            </BlurFade>
          </Suspense>

          <Suspense
            fallback={
              <Card className="glass-card">
                <CardContent className="h-64 animate-pulse bg-gray-100 dark:bg-muted" />
              </Card>
            }
          >
            <BlurFade delay={0.4} inView>
              <GDPRComplianceWidget />
            </BlurFade>
          </Suspense>

          <Suspense
            fallback={
              <Card className="glass-card">
                <CardContent className="h-64 animate-pulse bg-gray-100 dark:bg-muted" />
              </Card>
            }
          >
            <BlurFade delay={0.5} inView>
              <SessionManagementWidget />
            </BlurFade>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
