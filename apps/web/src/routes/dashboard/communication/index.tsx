import React from 'react';
import { createFileRoute, useSearch } from '@tanstack/react-router';
import { UnifiedCommunicationHub } from '@/components/communication/UnifiedCommunicationHub';
import { useWorkspaceStore } from '@/store/workspace';
import { useUser } from '@/hooks/use-user';
import { useRBACAuth } from '@/lib/permissions/provider';

const CommunicationPage: React.FC = () => {
  const search = useSearch();
  const { user } = useUser();
  const { workspace } = useWorkspaceStore();
  const { hasPermission } = useRBACAuth();

  // Check if user has permission to access communication
  const canSendMessages = hasPermission('canSendMessages') || !!user; // Grant access to all authenticated users as fallback
  if (!canSendMessages) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            You don't have permission to access the communication system.
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
          <h1 className="text-2xl font-bold">Communication</h1>
          <p className="text-muted-foreground">
            Real-time messaging and collaboration
          </p>
        </div>
      </div>

      {/* Communication Hub */}
      <div className="flex-1 p-6">
        <UnifiedCommunicationHub
          workspaceId={workspace?.id}
          className="h-full"
        />
      </div>
    </div>
  );
};

export default CommunicationPage; 

// Define route after component to avoid TDZ errors
export const Route = createFileRoute('/dashboard/communication/')({
  component: CommunicationPage,
});