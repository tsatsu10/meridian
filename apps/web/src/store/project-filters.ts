/**
 * Project Filters Zustand Store
 * Centralized state management for project filters across the dashboard
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface FilterState {
  status: string[];
  priority: string[];
  health: string[];
  owner: string[];
  teamMembers: string[];
  searchQuery: string;
  sortBy: "name" | "status" | "priority" | "progress" | "dueDate";
  sortOrder: "asc" | "desc";
}

interface FilterStore extends FilterState {
  // Setters
  setStatus: (status: string[]) => void;
  setPriority: (priority: string[]) => void;
  setHealth: (health: string[]) => void;
  setOwner: (owner: string[]) => void;
  setTeamMembers: (members: string[]) => void;
  setSearchQuery: (query: string) => void;
  setSort: (sortBy: FilterState["sortBy"], sortOrder: "asc" | "desc") => void;

  // Batch setters
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;

  // Getters
  getActiveFilterCount: () => number;
  hasActiveFilters: () => boolean;
}

const DEFAULT_STATE: FilterState = {
  status: [],
  priority: [],
  health: [],
  owner: [],
  teamMembers: [],
  searchQuery: "",
  sortBy: "name",
  sortOrder: "asc",
};

export const useFilterStore = create<FilterStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,

      // Individual setters
      setStatus: (status) => set({ status }),
      setPriority: (priority) => set({ priority }),
      setHealth: (health) => set({ health }),
      setOwner: (owner) => set({ owner }),
      setTeamMembers: (teamMembers) => set({ teamMembers }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSort: (sortBy, sortOrder) => set({ sortBy, sortOrder }),

      // Batch setter
      setFilters: (filters) => set(filters),

      // Reset all filters
      resetFilters: () => set(DEFAULT_STATE),

      // Get count of active filters
      getActiveFilterCount: () => {
        const state = get();
        let count = 0;
        if (state.status.length > 0) count++;
        if (state.priority.length > 0) count++;
        if (state.health.length > 0) count++;
        if (state.owner.length > 0) count++;
        if (state.teamMembers.length > 0) count++;
        if (state.searchQuery) count++;
        return count;
      },

      // Check if any filters are active
      hasActiveFilters: () => {
        const state = get();
        return (
          state.status.length > 0 ||
          state.priority.length > 0 ||
          state.health.length > 0 ||
          state.owner.length > 0 ||
          state.teamMembers.length > 0 ||
          state.searchQuery !== ""
        );
      },
    }),
    {
      name: "meridian-project-filters", // localStorage key
      version: 1,
      // Optionally serialize/deserialize for complex types
      storage: {
        getItem: (key) => {
          const item = localStorage.getItem(key);
          return item ? JSON.parse(item) : null;
        },
        setItem: (key, value) => {
          localStorage.setItem(key, JSON.stringify(value));
        },
        removeItem: (key) => {
          localStorage.removeItem(key);
        },
      },
    }
  )
);

export default useFilterStore;
