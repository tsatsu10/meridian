/**
 * useProjectFilters Hook
 * Manages project filtering with URL sync and localStorage persistence
 */

import { useState, useCallback, useEffect } from "react";

export interface ProjectFilters {
  status: string[];
  priority: string[];
  health: string[];
  owner: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  } | null;
  teamMembers: string[];
  searchQuery: string;
  sortBy: "name" | "status" | "priority" | "progress" | "dueDate";
  sortOrder: "asc" | "desc";
}

const DEFAULT_FILTERS: ProjectFilters = {
  status: [],
  priority: [],
  health: [],
  owner: [],
  dateRange: null,
  teamMembers: [],
  searchQuery: "",
  sortBy: "name",
  sortOrder: "asc",
};

const STORAGE_KEY = "meridian_project_filters";



/**
 * Convert filters to URL query string
 */
function filtersToUrlParams(filters: ProjectFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.status.length > 0) {
    params.set("status", filters.status.join(","));
  }
  if (filters.priority.length > 0) {
    params.set("priority", filters.priority.join(","));
  }
  if (filters.health.length > 0) {
    params.set("health", filters.health.join(","));
  }
  if (filters.owner.length > 0) {
    params.set("owner", filters.owner.join(","));
  }
  if (filters.teamMembers.length > 0) {
    params.set("members", filters.teamMembers.join(","));
  }
  if (filters.searchQuery) {
    params.set("q", filters.searchQuery);
  }
  if (filters.sortBy !== "name") {
    params.set("sortBy", filters.sortBy);
  }
  if (filters.sortOrder !== "asc") {
    params.set("sortOrder", filters.sortOrder);
  }

  return params;
}

/**
 * Main hook for project filtering
 */
export function useProjectFilters() {
  const [filters, setFilters] = useState<ProjectFilters>(DEFAULT_FILTERS);
  const [isLoadedFromStorage, setIsLoadedFromStorage] = useState(false);

  // Load filters from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedFilters = JSON.parse(stored);
        setFilters((prev) => ({
          ...prev,
          ...parsedFilters,
        }));}
    } catch (error) {
      console.error("Error loading filters from localStorage:", error);
    }
    setIsLoadedFromStorage(true);
  }, []);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    if (isLoadedFromStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));}
  }, [filters, isLoadedFromStorage]);

  // Update status filter
  const setStatusFilter = useCallback(
    (statuses: string[]) => {
      setFilters((prev) => ({
        ...prev,
        status: statuses,
      }));
    },
    []
  );

  // Update priority filter
  const setPriorityFilter = useCallback(
    (priorities: string[]) => {
      setFilters((prev) => ({
        ...prev,
        priority: priorities,
      }));
    },
    []
  );

  // Update health filter
  const setHealthFilter = useCallback(
    (health: string[]) => {
      setFilters((prev) => ({
        ...prev,
        health,
      }));
    },
    []
  );

  // Update owner filter
  const setOwnerFilter = useCallback(
    (owners: string[]) => {
      setFilters((prev) => ({
        ...prev,
        owner: owners,
      }));
    },
    []
  );

  // Update team members filter
  const setTeamMembersFilter = useCallback(
    (members: string[]) => {
      setFilters((prev) => ({
        ...prev,
        teamMembers: members,
      }));
    },
    []
  );

  // Update date range filter
  const setDateRangeFilter = useCallback(
    (start: Date | null, end: Date | null) => {
      setFilters((prev) => ({
        ...prev,
        dateRange: start || end ? { start, end } : null,
      }));
    },
    []
  );

  // Update search query
  const setSearchQuery = useCallback(
    (query: string) => {
      setFilters((prev) => ({
        ...prev,
        searchQuery: query,
      }));
    },
    []
  );

  // Update sort
  const setSort = useCallback(
    (
      sortBy: "name" | "status" | "priority" | "progress" | "dueDate",
      sortOrder: "asc" | "desc"
    ) => {
      setFilters((prev) => ({
        ...prev,
        sortBy,
        sortOrder,
      }));
    },
    []
  );

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    localStorage.removeItem(STORAGE_KEY);}, []);

  // Get active filter count
  const getActiveFilterCount = useCallback(() => {
    let count = 0;
    if (filters.status.length > 0) count++;
    if (filters.priority.length > 0) count++;
    if (filters.health.length > 0) count++;
    if (filters.owner.length > 0) count++;
    if (filters.dateRange) count++;
    if (filters.teamMembers.length > 0) count++;
    if (filters.searchQuery) count++;
    return count;
  }, [filters]);

  // Get URL params
  const getUrlParams = useCallback(() => {
    return filtersToUrlParams(filters).toString();
  }, [filters]);

  // Check if any filters are active
  const hasActiveFilters = useCallback(() => {
    return getActiveFilterCount() > 0;
  }, [getActiveFilterCount]);

  return {
    filters,
    setStatusFilter,
    setPriorityFilter,
    setHealthFilter,
    setOwnerFilter,
    setTeamMembersFilter,
    setDateRangeFilter,
    setSearchQuery,
    setSort,
    resetFilters,
    getActiveFilterCount,
    getUrlParams,
    hasActiveFilters,
  };
}

export default useProjectFilters;
