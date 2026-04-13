/**
 * 🎨 Dashboard Management Hook
 * 
 * Manages multiple dashboards per user with CRUD operations
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";
import useWorkspaceStore from "@/store/workspace";

export interface Dashboard {
  id: string;
  userId: string;
  workspaceId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  icon?: string;
  theme?: string;
  /** Saved dashboard layout JSON from API (widget ids, positions, etc.) */
  layout?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  widgets: string[];
  category: string;
}

const unwrapDashboardResponse = (payload: unknown): unknown => {
  if (payload == null) return undefined;
  if (typeof payload === "object" && payload !== null && "data" in payload) {
    return unwrapDashboardResponse((payload as { data: unknown }).data);
  }
  return payload;
};

export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  {
    id: "blank",
    name: "Blank Dashboard",
    description: "Start from scratch and add your own widgets",
    icon: "Layout",
    widgets: [],
    category: "general"
  },
  {
    id: "analytics",
    name: "Analytics Dashboard",
    description: "Track performance, velocity, and time metrics",
    icon: "BarChart3",
    widgets: [
      "performance-metrics",
      "velocity-tracker",
      "time-tracking-summary",
      "burndown-chart"
    ],
    category: "analytics"
  },
  {
    id: "team",
    name: "Team Dashboard",
    description: "Monitor team health, collaboration, and communication",
    icon: "Users",
    widgets: [
      "team-health-monitor",
      "team-chat-widget",
      "kudos-feed",
      "team-mood-tracker",
      "team-capacity-planner"
    ],
    category: "team"
  },
  {
    id: "personal",
    name: "Personal Dashboard",
    description: "Track your tasks and progress",
    icon: "User",
    widgets: [
      "my-tasks",
    ],
    category: "personal"
  },
  {
    id: "project-manager",
    name: "Project Manager",
    description: "Oversee projects, timelines, and resources",
    icon: "Briefcase",
    widgets: [
      "project-health-monitor",
      "project-timeline",
      "project-budget-tracker",
      "risk-monitor",
      "milestone-tracker",
      "resource-allocation"
    ],
    category: "management"
  },
];

export function useDashboards() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { workspace } = useWorkspaceStore();
  const [selectedDashboardId, setSelectedDashboardId] = useState<string | null>(null);

  // Fetch user's dashboards
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboards', user?.email, workspace?.id],
    queryFn: async () => {
      const response = await api.get(`/api/settings/dashboards/${user?.email}/${workspace?.id}`);
      return response?.data || response;
    },
    enabled: !!user?.email && !!workspace?.id,
    staleTime: 30000,
  });

  const dashboards = useMemo((): Dashboard[] => {
    const raw = data?.data ?? data;
    if (Array.isArray(raw)) return raw as Dashboard[];
    return [];
  }, [data]);

  useEffect(() => {
    setSelectedDashboardId(null);
  }, [user?.email, workspace?.id]);

  useEffect(() => {
    if (!dashboards.length) {
      if (selectedDashboardId !== null) {
        setSelectedDashboardId(null);
      }
      return;
    }

    const exists = selectedDashboardId
      ? dashboards.some((dashboard) => dashboard.id === selectedDashboardId)
      : false;

    if (!exists) {
      const fallback = dashboards.find((dashboard) => dashboard.isDefault) || dashboards[0];
      if (fallback && fallback.id !== selectedDashboardId) {
        setSelectedDashboardId(fallback.id);
      }
    }
  }, [dashboards, selectedDashboardId]);

  const activeDashboard =
    dashboards.find((dashboard) => dashboard.id === selectedDashboardId) ||
    dashboards.find((dashboard) => dashboard.isDefault) ||
    dashboards[0] ||
    null;

  const selectDashboard = useCallback((dashboardId: string) => {
    setSelectedDashboardId(dashboardId);
  }, []);

  // Create new dashboard
  const createMutation = useMutation({
    mutationFn: async (params: { 
      name: string; 
      description?: string; 
      templateId?: string;
      icon?: string;
    }) => {
      const response = await api.post('/api/settings/dashboards', {
        userId: user?.id,
        userEmail: user?.email,
        workspaceId: workspace?.id,
        ...params,
      });
      return response?.data || response;
    },
    onSuccess: (result) => {
      const createdDashboard = unwrapDashboardResponse(result) as Dashboard | undefined;
      const createdId = createdDashboard?.id;
      if (createdId) {
        setSelectedDashboardId(createdId);
      }
      toast.success("Dashboard created successfully!");
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to create dashboard");
    },
  });

  // Update dashboard
  const updateMutation = useMutation({
    mutationFn: async (params: { 
      dashboardId: string; 
      name?: string; 
      description?: string;
      icon?: string;
      layout?: Record<string, unknown> | null;
    }) => {
      const response = await api.put(`/api/settings/dashboards/${params.dashboardId}`, params);
      return response?.data || response;
    },
    onSuccess: () => {
      toast.success("Dashboard updated!");
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to update dashboard");
    },
  });

  // Delete dashboard
  const deleteMutation = useMutation({
    mutationFn: async (dashboardId: string) => {
      const response = await api.delete(`/api/settings/dashboards/${dashboardId}`);
      return response?.data || response;
    },
    onSuccess: (_, dashboardId) => {
      if (selectedDashboardId === dashboardId) {
        setSelectedDashboardId(null);
      }
      toast.success("Dashboard deleted!");
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete dashboard");
    },
  });

  // Set default dashboard
  const setDefaultMutation = useMutation({
    mutationFn: async (dashboardId: string) => {
      const response = await api.post(`/api/settings/dashboards/${dashboardId}/set-default`);
      return response?.data || response;
    },
    onSuccess: (result) => {
      const updatedDashboard = unwrapDashboardResponse(result) as Dashboard | undefined;
      const updatedId = updatedDashboard?.id;
      if (updatedId) {
        setSelectedDashboardId(updatedId);
      }
      toast.success("Default dashboard updated!");
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to set default dashboard");
    },
  });

  // Duplicate dashboard
  const duplicateMutation = useMutation({
    mutationFn: async (dashboardId: string) => {
      const response = await api.post(`/api/settings/dashboards/${dashboardId}/duplicate`);
      return response?.data || response;
    },
    onSuccess: (result) => {
      const duplicatedDashboard = unwrapDashboardResponse(result) as Dashboard | undefined;
      const duplicatedId = duplicatedDashboard?.id;
      if (duplicatedId) {
        setSelectedDashboardId(duplicatedId);
      }
      toast.success("Dashboard duplicated!");
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to duplicate dashboard");
    },
  });

  return {
    dashboards,
    activeDashboard,
    selectedDashboardId,
    isLoading,
    error,
    createDashboard: createMutation.mutate,
    updateDashboard: updateMutation.mutate,
    deleteDashboard: deleteMutation.mutate,
    setDefaultDashboard: setDefaultMutation.mutate,
    duplicateDashboard: duplicateMutation.mutate,
    selectDashboard,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    templates: DASHBOARD_TEMPLATES,
  };
}

