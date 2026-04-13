import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ProjectAnalytics } from "@/components/analytics/project-analytics";
import LazyDashboardLayout from "@/components/performance/lazy-dashboard-layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/dashboard/workspace/$workspaceId/project/$projectId/analytics")({
  component: ProjectAnalyticsPage,
});

function ProjectAnalyticsPage() {
  const { projectId, workspaceId } = Route.useParams();
  const navigate = useNavigate();

  return (
    <LazyDashboardLayout>
      <div className="space-y-6">
        {/* Header with Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ 
                to: "/dashboard/workspace/$workspaceId/project/$projectId", 
                params: { workspaceId, projectId } 
              })}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Project
            </Button>
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold">Project Analytics</h1>
            </div>
          </div>
        </div>

        {/* Analytics Component */}
        <ProjectAnalytics projectId={projectId} />
      </div>
    </LazyDashboardLayout>
  );
} 