/**
 * Main overview layout for `/dashboard`. Custom analytics and widget builder live under
 * `/dashboard/analytics/*` — new overview features belong here, not in the analytics builder.
 */
import { lazy, Suspense, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  CheckCircle,
  FolderOpen,
  ArrowRight,
  RefreshCw,
  Target,
  Shield,
  AlertTriangle,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { RBACAuthContextType } from "@/lib/permissions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DashboardRecentActivity, type DashboardActivityFeedItem } from "@/components/dashboard/dashboard-recent-activity";
import UniversalHeader from "@/components/dashboard/universal-header";
import { StaleDataIndicator } from "@/components/dashboard/loading-states";
import { QuickCaptureFAB } from "@/components/mobile/quick-capture-fab";
import { useRiskMonitor } from "@/hooks/queries/risk/use-risk-detection";
import type { ValidatedDashboardData } from "@/schemas/dashboard";
import { ModalChunkFallback, RiskSectionChunkFallback } from "./dashboard-overview-suspense-fallbacks";

const CreateProjectModal = lazy(() => import("@/components/shared/modals/create-project-modal"));
const AnimatedStatsCard = lazy(() => import("@/components/dashboard/animated-stats-card"));
const BlurFade = lazy(() => import("@/components/magicui/blur-fade").then((m) => ({ default: m.BlurFade })));

type ProjectRow = NonNullable<ValidatedDashboardData["projects"]>[number];

export interface DashboardOverviewLoadedProps {
  dashboardData: ValidatedDashboardData;
  workspaceId: string;
  hasPermission: RBACAuthContextType["hasPermission"];
  activityFeedWindow: DashboardActivityFeedItem[];
  currentTime: Date;
  /** Shown in header for support clarity (server default dashboard name). */
  activeDashboardLabel: string | null;
  lastDataFetch: Date;
  riskData: ReturnType<typeof useRiskMonitor>;
  handleRefresh: () => void | Promise<void>;
  isRefreshing: boolean;
  /** Client rate-limit countdown for dashboard refresh (seconds). */
  refreshCooldownSeconds: number;
}

export function DashboardOverviewLoaded({
  dashboardData,
  workspaceId,
  hasPermission,
  activityFeedWindow,
  currentTime,
  activeDashboardLabel,
  lastDataFetch,
  riskData,
  handleRefresh,
  isRefreshing,
  refreshCooldownSeconds,
}: DashboardOverviewLoadedProps) {
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);

  const refreshDisabled = isRefreshing || refreshCooldownSeconds > 0;
  const refreshLabel =
    refreshCooldownSeconds > 0
      ? `Refresh available in ${refreshCooldownSeconds}s`
      : isRefreshing
        ? "Refreshing…"
        : "Refresh dashboard";

  return (
    <main id="dashboard-overview-main" className="min-w-0 space-y-8">
      <UniversalHeader
        title="Dashboard"
        subtitle="Welcome back! Here's what's happening with your projects."
        variant="default"
        meta={
          activeDashboardLabel ? (
            <span className="text-muted-foreground text-xs">{activeDashboardLabel}</span>
          ) : undefined
        }
        customActions={
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <StaleDataIndicator lastUpdated={lastDataFetch} threshold={5 * 60 * 1000} />
            {riskData.hasHighRisk && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg glass-card">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                <span className="text-sm font-medium text-red-700 dark:text-red-300">Risks</span>
                <Badge variant="secondary" className="text-xs bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200">
                  {riskData.highPriorityRisks.length}
                </Badge>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleRefresh()}
              disabled={refreshDisabled}
              title={refreshLabel}
              aria-label={refreshLabel}
              className="flex items-center gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              <span>
                {refreshCooldownSeconds > 0 ? `Wait ${refreshCooldownSeconds}s` : "Refresh"}
              </span>
            </Button>
          </div>
        }
      />
      <div className="space-y-8">
        <Suspense
          fallback={
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" aria-busy="true" aria-label="Loading statistics">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded animate-pulse" />
              ))}
            </div>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <AnimatedStatsCard
              title="Total Tasks"
              value={dashboardData?.stats?.totalTasks || 0}
              icon={CheckCircle}
              description={`${dashboardData?.stats?.completedTasks || 0} completed`}
              delay={0.1}
              colorScheme="success"
            />

            <AnimatedStatsCard
              title="Active Projects"
              value={dashboardData?.projects?.length || 0}
              icon={FolderOpen}
              description={`${dashboardData?.projects?.filter((p) => p.status !== "completed").length || 0} in progress`}
              delay={0.2}
              colorScheme="info"
            />

            <AnimatedStatsCard
              title="Progress"
              value={dashboardData?.stats?.completedTasks || 0}
              icon={Target}
              description={`${Math.round(((dashboardData?.stats?.completedTasks || 0) / (dashboardData?.stats?.totalTasks || 1)) * 100)}% complete`}
              delay={0.3}
              colorScheme="primary"
            />

            <AnimatedStatsCard
              title="Team Members"
              value={dashboardData?.stats?.teamMembers || 0}
              icon={Users}
              description="Active collaborators"
              delay={0.4}
              colorScheme="info"
              trend="neutral"
            />
          </div>
        </Suspense>

        {riskData.data?.alerts && riskData.data.alerts.length > 0 && (
          <Suspense fallback={<RiskSectionChunkFallback />}>
            <BlurFade delay={0.5} inView>
              <Card className="border-red-200 dark:border-red-800/30 bg-red-50/50 dark:bg-red-900/10 glass-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2 text-red-700 dark:text-red-300">
                      <AlertTriangle className="h-5 w-5" />
                      Risk Detection System
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200">
                      {riskData.data.summary?.totalRisks} risks
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {riskData.data.alerts.slice(0, 3).map((risk) => (
                    <div
                      key={risk.id}
                      className="flex items-start gap-3 p-3 bg-white dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg glass-card"
                    >
                      <Shield className="h-4 w-4 text-red-500 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-red-800 dark:text-red-200">{risk.title}</h4>
                        <p className="text-xs text-red-600 dark:text-red-300 mt-1">{risk.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {risk.severity}
                          </Badge>
                          <span className="text-xs text-red-500 dark:text-red-400">
                            {risk.affectedTasks.length} tasks affected
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </BlurFade>
          </Suspense>
        )}

        <div className="space-y-6 max-w-5xl">
          <div className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-primary" />
                    Projects
                  </CardTitle>
                  {hasPermission("canCreateProjects", {}) && (
                    <Button size="sm" onClick={() => setIsCreateProjectOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Project
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {!dashboardData?.projects || dashboardData.projects.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No projects yet</p>
                    <p className="text-xs mt-1">Create your first project to get started</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => setIsCreateProjectOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Project
                    </Button>
                  </div>
                ) : (
                  dashboardData.projects.slice(0, 6).map((project: ProjectRow) => {
                    const allProjectTasks = project.tasks || [];
                    const completedTasks = allProjectTasks.filter(
                      (task) => task.status === "done" || task.status === "completed"
                    ).length;
                    const progressPercentage =
                      allProjectTasks.length > 0 ? Math.round((completedTasks / allProjectTasks.length) * 100) : 0;

                    return (
                      <Link
                        key={project.id}
                        to="/dashboard/workspace/$workspaceId/project/$projectId"
                        params={{ workspaceId, projectId: project.id }}
                        className="block group"
                      >
                        <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className="w-10 h-10 bg-primary/10 dark:bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                              <span className="text-primary font-semibold text-sm">
                                {project.icon || project.name?.charAt(0)?.toUpperCase() || "P"}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                                {project.name}
                              </h3>
                              <p className="text-xs text-muted-foreground">
                                {allProjectTasks.length} tasks • {completedTasks} completed
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 flex-shrink-0">
                            <div className="text-right">
                              <div className="text-sm font-semibold mb-1">{progressPercentage}%</div>
                              <div className="w-20 bg-secondary dark:bg-secondary-hover rounded-full h-1.5">
                                <div
                                  className="bg-primary h-1.5 rounded-full transition-all duration-300"
                                  style={{ width: `${progressPercentage}%` }}
                                />
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>
                      </Link>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <DashboardRecentActivity
              feedWindow={activityFeedWindow}
              currentTime={currentTime}
              workspaceId={workspaceId}
            />
          </div>
        </div>

        <Suspense fallback={<ModalChunkFallback />}>
          <CreateProjectModal open={isCreateProjectOpen} onClose={() => setIsCreateProjectOpen(false)} />
        </Suspense>

        <QuickCaptureFAB />
      </div>
    </main>
  );
}
