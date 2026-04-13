/**
 * Dashboard Templates Settings Page - Phase 4.6
 * Allows users to manage dashboard layout templates
 */

import { createFileRoute } from '@tanstack/react-router';
import { TemplateGallery } from '@/components/dashboard/template-gallery';
import { useWorkspaceStore } from '@/store/workspace';
import { toast } from 'sonner';
import { withErrorBoundary } from "@/components/dashboard/universal-error-boundary";

export const Route = createFileRoute('/dashboard/settings/templates')({
  component: withErrorBoundary(DashboardTemplatesPage, "Dashboard Templates"),
});

function DashboardTemplatesPage() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const workspaceId = workspace?.id;

  if (!workspaceId) {
    return (
      <div className="p-8">
        <div className="text-center">
          <p className="text-muted-foreground">No workspace selected</p>
        </div>
      </div>
    );
  }

  const handleApplyTemplate = (template: any) => {
    // In a real implementation, this would apply the template to the current dashboard
    // For now, we just show a success message
    toast.success(`Template "${template.name}" will be applied to your dashboard`, {
      description: 'Dashboard layout will be updated with the selected template',
    });
  };

  return (
    <div className="p-8">
      <TemplateGallery
        workspaceId={workspaceId}
        onApplyTemplate={handleApplyTemplate}
      />
    </div>
  );
}
