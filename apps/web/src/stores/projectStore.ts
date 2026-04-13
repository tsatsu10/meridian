import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Types (migrated from Redux slice)
export interface Project {
  id: string;
  name: string;
  description?: string;
  workspaceId: string;
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  progress: number; // 0-100
  startDate?: string;
  endDate?: string;
  dueDate?: string;
  budget?: {
    allocated: number;
    spent: number;
    currency: string;
  };
  settings: {
    visibility: 'public' | 'private' | 'restricted';
    allowComments: boolean;
    requireApproval: boolean;
    autoAssignment: boolean;
    defaultTaskStatus: string;
  };
  metrics: {
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    activeMembers: number;
    avgCompletionTime: number;
    velocity: number;
  };
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  ownerId: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: 'owner' | 'manager' | 'contributor' | 'viewer';
  permissions: string[];
  joinedAt: string;
  lastActiveAt: string;
  addedBy: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tasks: any[];
  settings: any;
  isPublic: boolean;
  createdBy: string;
  usageCount: number;
}

export interface ProjectActivity {
  id: string;
  projectId: string;
  type: 'task_created' | 'task_completed' | 'member_added' | 'member_removed' | 'status_changed' | 'comment_added';
  description: string;
  userId: string;
  userName: string;
  metadata?: any;
  createdAt: string;
}

// State interface
interface ProjectState {
  // Data
  projects: Project[];
  members: ProjectMember[];
  templates: ProjectTemplate[];
  activities: ProjectActivity[];

  // UI State
  loading: {
    projects: boolean;
    project: boolean;
    members: boolean;
    templates: boolean;
    activities: boolean;
  };
  errors: {
    projects: string | null;
    project: string | null;
    members: string | null;
    templates: string | null;
    activities: string | null;
  };

  // Selection state
  selectedProjectId: string | null;
  selectedMemberId: string | null;
  showCreateModal: boolean;
  showSettingsModal: boolean;
  showTemplateModal: boolean;

  // Filters and search
  searchQuery: string;
  statusFilter: string;
  priorityFilter: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// Actions interface
interface ProjectActions {
  // Data actions
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  removeProject: (id: string) => void;
  archiveProject: (id: string) => void; // This was missing in Redux!

  // Member actions
  setMembers: (members: ProjectMember[]) => void;
  addMember: (member: ProjectMember) => void;
  updateMember: (id: string, updates: Partial<ProjectMember>) => void;
  removeMember: (id: string) => void;

  // Template actions
  setTemplates: (templates: ProjectTemplate[]) => void;
  addTemplate: (template: ProjectTemplate) => void;
  updateTemplate: (id: string, updates: Partial<ProjectTemplate>) => void;

  // Activity actions
  setActivities: (activities: ProjectActivity[]) => void;
  addActivity: (activity: ProjectActivity) => void;

  // Loading and error actions
  setLoading: (key: keyof ProjectState['loading'], value: boolean) => void;
  setError: (key: keyof ProjectState['errors'], value: string | null) => void;
  clearErrors: () => void;

  // UI actions
  setSelectedProjectId: (id: string | null) => void;
  setSelectedMemberId: (id: string | null) => void;
  setShowCreateModal: (show: boolean) => void;
  setShowSettingsModal: (show: boolean) => void;
  setShowTemplateModal: (show: boolean) => void;

  // Filter and search actions
  setSearchQuery: (query: string) => void;
  setStatusFilter: (filter: string) => void;
  setPriorityFilter: (filter: string) => void;
  setSortBy: (field: string) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;

  // Computed getters
  getFilteredProjects: () => Project[];
  getSelectedProject: () => Project | undefined;
  getProjectMembers: (projectId: string) => ProjectMember[];
  getProjectActivities: (projectId: string) => ProjectActivity[];
}

// Initial state
const initialState: ProjectState = {
  projects: [],
  members: [],
  templates: [],
  activities: [],

  loading: {
    projects: false,
    project: false,
    members: false,
    templates: false,
    activities: false,
  },

  errors: {
    projects: null,
    project: null,
    members: null,
    templates: null,
    activities: null,
  },

  selectedProjectId: null,
  selectedMemberId: null,
  showCreateModal: false,
  showSettingsModal: false,
  showTemplateModal: false,

  searchQuery: '',
  statusFilter: 'all',
  priorityFilter: 'all',
  sortBy: 'updatedAt',
  sortOrder: 'desc',
};

// Create the Zustand store
export const useProjectStore = create<ProjectState & ProjectActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Data actions
      setProjects: (projects) => set({ projects }),
      addProject: (project) => set((state) => ({
        projects: [...state.projects, project]
      })),
      updateProject: (id, updates) => set((state) => ({
        projects: state.projects.map(p =>
          p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
        )
      })),
      removeProject: (id) => set((state) => ({
        projects: state.projects.filter(p => p.id !== id)
      })),
      archiveProject: (id) => set((state) => ({
        projects: state.projects.map(p =>
          p.id === id ? { ...p, status: 'cancelled' as const, updatedAt: new Date().toISOString() } : p
        )
      })),

      // Member actions
      setMembers: (members) => set({ members }),
      addMember: (member) => set((state) => ({
        members: [...state.members, member]
      })),
      updateMember: (id, updates) => set((state) => ({
        members: state.members.map(m =>
          m.id === id ? { ...m, ...updates } : m
        )
      })),
      removeMember: (id) => set((state) => ({
        members: state.members.filter(m => m.id !== id)
      })),

      // Template actions
      setTemplates: (templates) => set({ templates }),
      addTemplate: (template) => set((state) => ({
        templates: [...state.templates, template]
      })),
      updateTemplate: (id, updates) => set((state) => ({
        templates: state.templates.map(t =>
          t.id === id ? { ...t, ...updates } : t
        )
      })),

      // Activity actions
      setActivities: (activities) => set({ activities }),
      addActivity: (activity) => set((state) => ({
        activities: [activity, ...state.activities]
      })),

      // Loading and error actions
      setLoading: (key, value) => set((state) => ({
        loading: { ...state.loading, [key]: value }
      })),
      setError: (key, value) => set((state) => ({
        errors: { ...state.errors, [key]: value }
      })),
      clearErrors: () => set({
        errors: {
          projects: null,
          project: null,
          members: null,
          templates: null,
          activities: null,
        }
      }),

      // UI actions
      setSelectedProjectId: (id) => set({ selectedProjectId: id }),
      setSelectedMemberId: (id) => set({ selectedMemberId: id }),
      setShowCreateModal: (show) => set({ showCreateModal: show }),
      setShowSettingsModal: (show) => set({ showSettingsModal: show }),
      setShowTemplateModal: (show) => set({ showTemplateModal: show }),

      // Filter and search actions
      setSearchQuery: (query) => set({ searchQuery: query }),
      setStatusFilter: (filter) => set({ statusFilter: filter }),
      setPriorityFilter: (filter) => set({ priorityFilter: filter }),
      setSortBy: (field) => set({ sortBy: field }),
      setSortOrder: (order) => set({ sortOrder: order }),

      // Computed getters
      getFilteredProjects: () => {
        const state = get();
        let filtered = state.projects;

        // Apply search filter
        if (state.searchQuery) {
          filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
            p.description?.toLowerCase().includes(state.searchQuery.toLowerCase())
          );
        }

        // Apply status filter
        if (state.statusFilter !== 'all') {
          filtered = filtered.filter(p => p.status === state.statusFilter);
        }

        // Apply priority filter
        if (state.priorityFilter !== 'all') {
          filtered = filtered.filter(p => p.priority === state.priorityFilter);
        }

        // Apply sorting
        filtered.sort((a, b) => {
          const aValue = a[state.sortBy as keyof Project] as any;
          const bValue = b[state.sortBy as keyof Project] as any;

          if (state.sortOrder === 'asc') {
            return aValue > bValue ? 1 : -1;
          } else {
            return aValue < bValue ? 1 : -1;
          }
        });

        return filtered;
      },

      getSelectedProject: () => {
        const state = get();
        return state.projects.find(p => p.id === state.selectedProjectId);
      },

      getProjectMembers: (projectId) => {
        const state = get();
        return state.members.filter(m => m.projectId === projectId);
      },

      getProjectActivities: (projectId) => {
        const state = get();
        return state.activities
          .filter(a => a.projectId === projectId)
          .slice(0, 50); // Limit to last 50 activities
      },
    }),
    {
      name: 'meridian-project-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist essential data, not loading states
        projects: state.projects,
        members: state.members,
        templates: state.templates,
        selectedProjectId: state.selectedProjectId,
        searchQuery: state.searchQuery,
        statusFilter: state.statusFilter,
        priorityFilter: state.priorityFilter,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
      }),
    }
  )
);

// Export types for use in components
export type { ProjectState, ProjectActions };
