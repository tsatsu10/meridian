import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Target, Plus, ArrowLeft, BarChart3, Filter, Settings, Download } from 'lucide-react';
import MilestoneList from '@/components/milestones/milestone-list';
import CreateMilestoneModal from '@/components/shared/modals/create-milestone-modal';
import DashboardPopup from '@/components/dashboard/dashboard-popup';
import { useMilestones } from '@/hooks/use-milestones';
import { toast } from 'sonner';
import useGetProject from '@/hooks/queries/project/use-get-project';
import LazyDashboardLayout from '@/components/performance/lazy-dashboard-layout';
import { AlertCircle } from 'lucide-react';
import UniversalHeader from '@/components/dashboard/universal-header';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// @epic-1.3-milestones: Sarah (PM) needs comprehensive milestone management
// @persona-sarah: PM needs dedicated milestone tracking interface

export const Route = createFileRoute('/dashboard/workspace/$workspaceId/project/$projectId/milestones')({
  component: ProjectMilestones,
});

function ProjectMilestones() {
  const { projectId, workspaceId } = Route.useParams();
  const { data: projectData, isLoading: isProjectLoading, error: projectError } = useGetProject({ id: projectId, workspaceId });
  const { createMilestone, updateMilestone, deleteMilestone } = useMilestones(projectId);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<any | null>(null);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleBackToOverview = () => {
    navigate({ 
      to: '/dashboard/workspace/$workspaceId/project/$projectId', 
      params: { workspaceId, projectId } 
    });
  };

  if (isProjectLoading) {
    return (
      <LazyDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-zinc-500 dark:text-zinc-400">Loading milestones...</div>
        </div>
      </LazyDashboardLayout>
    );
  }

  if (projectError) {
    return (
      <LazyDashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <AlertCircle className="h-12 w-12 text-orange-500" />
          <h3 className="text-lg font-semibold">Unable to load milestones</h3>
          <p className="text-muted-foreground">There was an error loading the project milestones.</p>
        </div>
      </LazyDashboardLayout>
    );
  }

  return (
    <LazyDashboardLayout>
      <UniversalHeader 
        title="Project Milestones"
        subtitle="Track and manage project milestones and key deliverables"
        variant="default"
        customActions={
          <div className="flex items-center space-x-2">
            <Button 
              size="sm"
              onClick={() => setIsMilestoneModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Milestone
            </Button>
          </div>
        }
      />
      <div className="space-y-6 p-6">
        {/* Milestone List */}
        <MilestoneList 
          projectId={projectId}
          workspaceId={workspaceId}
          onEditMilestone={(milestone) => {
            setEditingMilestone(milestone);
            setIsMilestoneModalOpen(true);
          }}
        />

        {/* Create/Edit Milestone Modal */}
        <CreateMilestoneModal
          open={isMilestoneModalOpen}
          onClose={() => {
            setIsMilestoneModalOpen(false);
            setEditingMilestone(null);
          }}
          projectId={projectId}
          projectName={projectData?.name}
          editingMilestone={editingMilestone}
          onMilestoneCreated={(milestone) => {
            if (editingMilestone) {
              // Update existing milestone
              updateMilestone(editingMilestone.id, milestone);
              toast.success('Milestone updated successfully');
            } else {
              // Create new milestone
              createMilestone({
                ...milestone,
                projectId: projectId,
              });
              toast.success('Milestone created successfully');
            }
            setIsMilestoneModalOpen(false);
            setEditingMilestone(null);
          }}
        />

        {/* Analytics Dashboard Popup */}
        <DashboardPopup
          open={isDashboardOpen}
          onClose={() => setIsDashboardOpen(false)}
          projectId={projectId}
          projectName={projectData?.name}
          title="Milestone Analytics"
          variant="milestones"
        />
      </div>
    </LazyDashboardLayout>
  );
} 