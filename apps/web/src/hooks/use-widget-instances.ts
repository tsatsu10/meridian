/**
 * 🎨 Widget Instances Hook
 * 
 * Manages user's installed widgets - fetch, install, configure, remove
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import useAuth from '@/components/providers/auth-provider/hooks/use-auth';
import useWorkspaceStore from '@/store/workspace';

export function useWidgetInstances(dashboardId?: string) {
  const { user } = useAuth();
  const { workspace } = useWorkspaceStore();
  const queryClient = useQueryClient();
  
  // Fetch user's installed widgets
  const { data, isLoading, error } = useQuery({
    queryKey: ['user-widgets', user?.email, workspace?.id, dashboardId],
    queryFn: async () => {
      const params = dashboardId ? `?dashboardId=${dashboardId}` : '';
      const response = await api.get(
        `/api/settings/widget-instances/${user?.email}/${workspace?.id}${params}`
      );
      return response?.data || response;
    },
    enabled: !!user?.email && !!workspace?.id,
    staleTime: 30000, // Cache for 30 seconds
  });
  
  // Install widget
  const installMutation = useMutation({
    mutationFn: async (params: {
      widgetId: string;
      position?: { x: number; y: number };
      size?: { width: number; height: number };
      config?: any;
      dashboardId?: string;
    }) => {
      if (!workspace?.id) {
        throw new Error('Workspace not loaded. Please refresh the page.');
      }

      console.log('Installing widget:', {
        widgetId: params.widgetId,
        workspaceId: workspace.id,
        dashboardId: params.dashboardId
      });

      const response = await api.post('/api/settings/widget-instances/install', {
        workspaceId: workspace.id,
        ...params,
      });
      return response?.data || response;
    },
    onSuccess: () => {
      toast.success('Widget installed successfully!');
      queryClient.invalidateQueries({ queryKey: ['user-widgets'] });
    },
    onError: (error: any) => {
      toast.error('Failed to install widget', {
        description: error.message,
      });
    },
  });
  
  // Uninstall widget
  const uninstallMutation = useMutation({
    mutationFn: async (instanceId: string) => {
      const response = await api.delete(`/api/settings/widget-instances/${instanceId}`);
      return response?.data || response;
    },
    onSuccess: () => {
      toast.success('Widget removed');
      queryClient.invalidateQueries({ queryKey: ['user-widgets'] });
    },
    onError: () => {
      toast.error('Failed to remove widget');
    },
  });
  
  // Update widget configuration
  const updateConfigMutation = useMutation({
    mutationFn: async (params: { instanceId: string; config: any }) => {
      const response = await api.put(`/api/settings/widget-instances/${params.instanceId}`, {
        config: params.config,
      });
      return response?.data || response;
    },
    onSuccess: () => {
      toast.success('Configuration saved!');
      queryClient.invalidateQueries({ queryKey: ['user-widgets'] });
    },
    onError: () => {
      toast.error('Failed to save configuration');
    },
  });
  
  // Update widget position/size
  const updateLayoutMutation = useMutation({
    mutationFn: async (updates: Array<{
      instanceId: string;
      position: { x: number; y: number };
      size: { width: number; height: number };
    }>) => {
      const response = await api.post('/api/settings/widget-instances/batch-update', {
        workspaceId: workspace?.id,
        updates,
      });
      return response?.data || response;
    },
    onSuccess: () => {
      toast.success('Layout saved!');
      queryClient.invalidateQueries({ queryKey: ['user-widgets'] });
    },
    onError: () => {
      toast.error('Failed to save layout');
    },
  });
  
  // Toggle widget visibility
  const toggleVisibilityMutation = useMutation({
    mutationFn: async (params: { instanceId: string; isVisible: boolean }) => {
      const response = await api.put(`/api/settings/widget-instances/${params.instanceId}`, {
        isVisible: params.isVisible,
      });
      return response?.data || response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-widgets'] });
    },
  });
  
  const instances = data?.data || data || [];
  
  return {
    instances,
    isLoading,
    error,
    installWidget: installMutation.mutate,
    uninstallWidget: uninstallMutation.mutate,
    updateConfig: updateConfigMutation.mutate,
    updateLayout: updateLayoutMutation.mutate,
    toggleVisibility: toggleVisibilityMutation.mutate,
    isInstalling: installMutation.isPending,
    isUninstalling: uninstallMutation.isPending,
    isUpdating: updateConfigMutation.isPending || updateLayoutMutation.isPending,
  };
}

