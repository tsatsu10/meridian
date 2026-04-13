/**
 * Executive Dashboard Data Hooks
 * Fetches real data from executive analytics endpoints
 */

import { useQuery } from "@tanstack/react-query";
import useWorkspaceStore from "@/store/workspace";
import { API_BASE_URL } from "@/constants/urls";

// Portfolio Health Hook
export function usePortfolioHealth() {
  const { workspace } = useWorkspaceStore();

  return useQuery({
    queryKey: ["executive", "portfolio", workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) throw new Error("No workspace selected");
      
      const response = await fetch(
        `${API_BASE_URL}/analytics/executive/portfolio/${workspace.id}`,
        { credentials: "include" }
      );
      
      if (!response.ok) throw new Error("Failed to fetch portfolio health");
      
      return response.json();
    },
    enabled: !!workspace?.id,
    staleTime: 60 * 1000, // 1 minute
  });
}

// Financial Overview Hook
export function useFinancialOverview() {
  const { workspace } = useWorkspaceStore();

  return useQuery({
    queryKey: ["executive", "financial", workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) throw new Error("No workspace selected");
      
      const response = await fetch(
        `${API_BASE_URL}/analytics/executive/financial/${workspace.id}`,
        { credentials: "include" }
      );
      
      if (!response.ok) throw new Error("Failed to fetch financial overview");
      
      return response.json();
    },
    enabled: !!workspace?.id,
    staleTime: 60 * 1000,
  });
}

// Team Capacity Hook
export function useTeamCapacity() {
  const { workspace } = useWorkspaceStore();

  return useQuery({
    queryKey: ["executive", "teams", workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) throw new Error("No workspace selected");
      
      const response = await fetch(
        `${API_BASE_URL}/analytics/executive/teams/${workspace.id}`,
        { credentials: "include" }
      );
      
      if (!response.ok) throw new Error("Failed to fetch team capacity");
      
      return response.json();
    },
    enabled: !!workspace?.id,
    staleTime: 60 * 1000,
  });
}

// Risks Hook
export function useRisks() {
  const { workspace } = useWorkspaceStore();

  return useQuery({
    queryKey: ["executive", "risks", workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) throw new Error("No workspace selected");
      
      const response = await fetch(
        `${API_BASE_URL}/analytics/executive/risks/${workspace.id}`,
        { credentials: "include" }
      );
      
      if (!response.ok) throw new Error("Failed to fetch risks");
      
      return response.json();
    },
    enabled: !!workspace?.id,
    staleTime: 60 * 1000,
  });
}

// Milestones Hook
export function useMilestones() {
  const { workspace } = useWorkspaceStore();

  return useQuery({
    queryKey: ["executive", "milestones", workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) throw new Error("No workspace selected");
      
      const response = await fetch(
        `${API_BASE_URL}/analytics/executive/milestones/${workspace.id}`,
        { credentials: "include" }
      );
      
      if (!response.ok) throw new Error("Failed to fetch milestones");
      
      return response.json();
    },
    enabled: !!workspace?.id,
    staleTime: 60 * 1000,
  });
}

// Executive Summary Hook
export function useExecutiveSummary() {
  const { workspace } = useWorkspaceStore();

  return useQuery({
    queryKey: ["executive", "summary", workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) throw new Error("No workspace selected");
      
      const response = await fetch(
        `${API_BASE_URL}/analytics/executive/summary/${workspace.id}`,
        { credentials: "include" }
      );
      
      if (!response.ok) throw new Error("Failed to fetch executive summary");
      
      return response.json();
    },
    enabled: !!workspace?.id,
    staleTime: 60 * 1000,
  });
}

