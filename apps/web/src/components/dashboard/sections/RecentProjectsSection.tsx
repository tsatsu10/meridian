import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FolderOpen, ArrowRight } from "lucide-react";
import CreateProjectModal from "@/components/shared/modals/create-project-modal";

interface RecentProjectsSectionProps {
  dashboardData: any;
  workspace: any;
  hasCreatePermission: boolean;
}

export default function RecentProjectsSection({
  dashboardData,
  workspace,
  hasCreatePermission
}: RecentProjectsSectionProps) {
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);

  return (
    <>
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              Recent Projects
            </CardTitle>
            {hasCreatePermission && (
              <Button variant="outline" size="sm" onClick={() => setIsCreateProjectOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!dashboardData?.projects || dashboardData.projects.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No projects yet</p>
              <p className="text-xs">Create your first project to get started</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setIsCreateProjectOpen(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Create Project
              </Button>
            </div>
          ) : (
            dashboardData.projects.slice(0, 5).map((project: any) => {
              const allProjectTasks = project.tasks || [];
              const completedTasks = allProjectTasks.filter((task: any) => task.status === 'done').length;
              const progressPercentage = allProjectTasks.length > 0
                ? Math.round((completedTasks / allProjectTasks.length) * 100)
                : 0;

              return (
                <Link
                  key={project.id}
                  to="/dashboard/workspace/$workspaceId/project/$projectId"
                  params={{ workspaceId: workspace?.id || '', projectId: project.id }}
                  className="block"
                >
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <span className="text-primary font-medium text-sm">
                          {project.icon || project.name?.charAt(0)?.toUpperCase() || 'P'}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">{project.name}</h3>
                        <p className="text-xs text-gray-500">
                          {allProjectTasks.length} tasks • {completedTasks} completed
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className="text-sm font-medium">{progressPercentage}%</div>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>

      <CreateProjectModal
        open={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
      />
    </>
  );
}