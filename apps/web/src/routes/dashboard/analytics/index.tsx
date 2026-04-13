import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AnalyticsDashboard } from '@/components/analytics/dashboard/AnalyticsDashboard';
import { useWorkspaceStore } from '@/store/workspace';
import { useUser } from '@/hooks/use-user';
import { useRBACAuth } from '@/lib/permissions/provider';

const AnalyticsPage: React.FC = () => {
  const { user } = useUser();
  const { workspace } = useWorkspaceStore();
  const { hasPermission } = useRBACAuth();

  // Check if user has permission to access analytics
  const canViewAnalytics = hasPermission('canViewAnalytics') || !!user; // Grant access to all authenticated users as fallback
  if (!canViewAnalytics) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            You don't have permission to access analytics data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Data-driven insights into your workspace performance
          </p>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="flex-1 p-6 overflow-auto">
        <AnalyticsDashboard
          workspaceId={workspace?.id}
          className="h-full"
        />
      </div>
    </div>
  );
};

export default AnalyticsPage; 

// Define route after component to avoid TDZ errors
import { withErrorBoundary } from "@/components/dashboard/universal-error-boundary";

export const Route = createFileRoute('/dashboard/analytics/')({
  component: withErrorBoundary(AnalyticsPage, "Analytics"),
});