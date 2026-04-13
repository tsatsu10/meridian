import { useKeyboardNavigationItem } from "@/hooks/useKeyboardNavigation";
import AnimatedStatsCard from "@/components/dashboard/animated-stats-card";
import { CheckCircle, FolderOpen, Shield, Bell } from "lucide-react";

interface DashboardStatsProps {
  dashboardData: any;
  riskData: any;
  allNotifications: any[];
  keyboardNavigation?: ReturnType<typeof import("@/hooks/useKeyboardNavigation").useKeyboardNavigation>;
}

export default function DashboardStats({
  dashboardData,
  riskData,
  allNotifications,
  keyboardNavigation
}: DashboardStatsProps) {
  // Only register keyboard navigation if it's provided
  const tasksCard = keyboardNavigation ? useKeyboardNavigationItem(
    'stats-total-tasks',
    keyboardNavigation,
    {
      priority: 1,
      group: 'stats',
      ariaLabel: 'Total Tasks Statistics',
      onActivate: () => {
        keyboardNavigation?.announceToScreenReader(
          `Total tasks: ${dashboardData?.stats?.totalTasks || 0}, ${dashboardData?.stats?.completedTasks || 0} completed`
        );
      }
    }
  ) : { ref: { current: null }, isActive: false, focus: () => {}, activate: () => {} };

  const projectsCard = keyboardNavigation ? useKeyboardNavigationItem(
    'stats-active-projects',
    keyboardNavigation,
    {
      priority: 2,
      group: 'stats',
      ariaLabel: 'Active Projects Statistics',
      onActivate: () => {
        const activeCount = dashboardData?.projects?.filter((p: any) => p.status !== 'completed').length || 0;
        keyboardNavigation?.announceToScreenReader(
          `Active projects: ${dashboardData?.projects?.length || 0} total, ${activeCount} in progress`
        );
      }
    }
  ) : { ref: { current: null }, isActive: false, focus: () => {}, activate: () => {} };

  const riskCard = keyboardNavigation ? useKeyboardNavigationItem(
    'stats-risk-score',
    keyboardNavigation,
    {
      priority: 3,
      group: 'stats',
      ariaLabel: 'Risk Score Analysis',
      onActivate: () => {
        const riskScore = riskData?.data?.overallRiskScore || 0;
        const riskLevel = riskScore > 70 ? 'high' : riskScore > 40 ? 'medium' : 'low';
        keyboardNavigation?.announceToScreenReader(
          `Risk score: ${riskScore} out of 100, ${riskLevel} risk level`
        );
      }
    }
  ) : { ref: { current: null }, isActive: false, focus: () => {}, activate: () => {} };

  const notificationsCard = keyboardNavigation ? useKeyboardNavigationItem(
    'stats-notifications',
    keyboardNavigation,
    {
      priority: 4,
      group: 'stats',
      ariaLabel: 'Notifications Summary',
      onActivate: () => {
        const unreadCount = allNotifications?.filter(n => !n.isRead).length || 0;
        keyboardNavigation?.announceToScreenReader(
          `Notifications: ${allNotifications?.length || 0} total, ${unreadCount} unread`
        );
      }
    }
  ) : { ref: { current: null }, isActive: false, focus: () => {}, activate: () => {} };
  return (
    <section
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      role="region"
      aria-labelledby="dashboard-stats-heading"
    >
      <h2 id="dashboard-stats-heading" className="sr-only">
        Dashboard Statistics Overview
      </h2>

      {/* Total Tasks */}
      <div
        ref={tasksCard.ref}
        className={tasksCard.isActive ? 'ring-2 ring-primary rounded-lg' : ''}
        role="article"
        aria-labelledby="stats-total-tasks-label"
        aria-describedby="stats-total-tasks-desc"
      >
        <div className="sr-only">
          <h3 id="stats-total-tasks-label">Total Tasks Statistics</h3>
          <p id="stats-total-tasks-desc">
            Shows total task count of {dashboardData?.stats?.totalTasks || 0} with {dashboardData?.stats?.completedTasks || 0} completed tasks. Trending up by 12.5%.
          </p>
        </div>
        <AnimatedStatsCard
          title="Total Tasks"
          value={dashboardData?.stats?.totalTasks || 0}
          icon={CheckCircle}
          description={`${dashboardData?.stats?.completedTasks || 0} completed`}
          delay={0.1}
          colorScheme="success"
          trend="up"
          trendValue={12.5}
        />
      </div>

      {/* Active Projects */}
      <div
        ref={projectsCard.ref}
        className={projectsCard.isActive ? 'ring-2 ring-primary rounded-lg' : ''}
        role="article"
        aria-labelledby="stats-projects-label"
        aria-describedby="stats-projects-desc"
      >
        <div className="sr-only">
          <h3 id="stats-projects-label">Active Projects Statistics</h3>
          <p id="stats-projects-desc">
            Shows {dashboardData?.projects?.length || 0} total projects with {dashboardData?.projects?.filter((p: any) => p.status !== 'completed').length || 0} currently in progress. Trending up by 8.3%.
          </p>
        </div>
        <AnimatedStatsCard
          title="Active Projects"
          value={dashboardData?.projects?.length || 0}
          icon={FolderOpen}
          description={`${dashboardData?.projects?.filter((p: any) => p.status !== 'completed').length || 0} in progress`}
          delay={0.2}
          colorScheme="info"
          trend="up"
          trendValue={8.3}
        />
      </div>

      {/* Risk Analysis */}
      <div
        ref={riskCard.ref}
        className={riskCard.isActive ? 'ring-2 ring-primary rounded-lg' : ''}
        role="article"
        aria-labelledby="stats-risk-label"
        aria-describedby="stats-risk-desc"
      >
        <div className="sr-only">
          <h3 id="stats-risk-label">Risk Score Analysis</h3>
          <p id="stats-risk-desc">
            Current risk score is {riskData?.data?.overallRiskScore || 0} out of 100.
            {riskData?.hasHighRisk
              ? `Warning: ${riskData?.highPriorityRisks?.length || 0} high priority alerts detected.`
              : 'All systems operating normally with no major risks detected.'
            }
          </p>
        </div>
        <AnimatedStatsCard
          title="Risk Score"
          value={riskData?.data?.overallRiskScore || 0}
          icon={Shield}
          description={riskData?.hasHighRisk ? `${riskData?.highPriorityRisks?.length || 0} alerts` : 'All good'}
          delay={0.3}
          colorScheme={
            (riskData?.data?.overallRiskScore || 0) > 70 ? "danger" :
            (riskData?.data?.overallRiskScore || 0) > 40 ? "warning" : "success"
          }
          trend={riskData?.hasHighRisk ? "down" : "neutral"}
          suffix="/100"
        />
      </div>

      {/* Notifications */}
      <div
        ref={notificationsCard.ref}
        className={notificationsCard.isActive ? 'ring-2 ring-primary rounded-lg' : ''}
        role="article"
        aria-labelledby="stats-notifications-label"
        aria-describedby="stats-notifications-desc"
      >
        <div className="sr-only">
          <h3 id="stats-notifications-label">Notifications Summary</h3>
          <p id="stats-notifications-desc">
            You have {allNotifications?.length || 0} total notifications with {allNotifications?.filter(n => !n.isRead).length || 0} unread messages requiring attention.
          </p>
        </div>
        <AnimatedStatsCard
          title="Notifications"
          value={allNotifications?.length || 0}
          icon={Bell}
          description={`${allNotifications?.filter(n => !n.isRead).length || 0} unread`}
          delay={0.4}
          colorScheme="primary"
          trend="up"
          trendValue={5}
        />
      </div>
    </section>
  );
}