/**
 * Consolidated Workspace Store - Phase 3 Implementation
 * 
 * Single source of truth for workspace, projects, and organizational structure
 * Replaces: workspaceSlice.ts, workspace.ts (Zustand)
 * Handles: 104 imports across codebase
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { API_BASE_URL, API_URL } from '@/constants/urls';

// ===== TYPES =====

export interface WorkspaceData {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  settings?: {
    isPublic: boolean;
    allowInvitations: boolean;
    defaultRole: string;
  };
}

export interface ProjectData {
  id: string;
  name: string;
  description?: string;
  workspaceId: string;
  status: 'active' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  members: ProjectMember[];
}

export interface ProjectMember {
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: string;
  permissions: string[];
}

export interface WorkspaceMember {
  userId: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  isActive: boolean;
  avatar?: string;
}

interface WorkspaceStore {
  // ===== STATE =====
  current: WorkspaceData | null;
  workspaces: WorkspaceData[];
  projects: ProjectData[];
  members: WorkspaceMember[];
  
  // ===== LOADING STATES =====
  isLoading: boolean;
  isProjectsLoading: boolean;
  isMembersLoading: boolean;
  error: string | null;
  
  // ===== CURRENT CONTEXT =====
  currentProjectId: string | null;
  
  // ===== ACTIONS =====
  // Workspace management
  setWorkspace: (workspace: WorkspaceData | null) => void;
  loadWorkspaces: () => Promise<void>;
  createWorkspace: (data: Omit<WorkspaceData, 'id' | 'createdAt' | 'updatedAt'>) => Promise<WorkspaceData>;
  updateWorkspace: (id: string, updates: Partial<WorkspaceData>) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  
  // Project management
  loadProjects: (workspaceId?: string) => Promise<void>;
  createProject: (data: Omit<ProjectData, 'id' | 'createdAt' | 'updatedAt' | 'members'>) => Promise<ProjectData>;
  updateProject: (id: string, updates: Partial<ProjectData>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (projectId: string | null) => void;
  
  // Member management
  loadMembers: (workspaceId?: string) => Promise<void>;
  inviteMember: (email: string, role: WorkspaceMember['role']) => Promise<void>;
  updateMemberRole: (userId: string, role: WorkspaceMember['role']) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  
  // Project member management
  addProjectMember: (projectId: string, userId: string, role: ProjectMember['role']) => Promise<void>;
  removeProjectMember: (projectId: string, userId: string) => Promise<void>;
  updateProjectMemberRole: (projectId: string, userId: string, role: ProjectMember['role']) => Promise<void>;
  
  // Utilities
  clearError: () => void;
  reset: () => void;
  
  // Getters
  getCurrentProject: () => ProjectData | null;
  getProjectsByStatus: (status: ProjectData['status']) => ProjectData[];
  getMembersByRole: (role: WorkspaceMember['role']) => WorkspaceMember[];
}

// ===== STORE IMPLEMENTATION =====

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      // ===== INITIAL STATE =====
      current: null,
      workspaces: [],
      projects: [],
      members: [],
      isLoading: false,
      isProjectsLoading: false,
      isMembersLoading: false,
      error: null,
      currentProjectId: null,

      // ===== WORKSPACE ACTIONS =====
      
      setWorkspace: (workspace) => {
        set({ current: workspace });
        if (workspace) {
          // Auto-load projects and members for the new workspace
          get().loadProjects(workspace.id);
          get().loadMembers(workspace.id);
        }
      },

      loadWorkspaces: async () => {
        try {
          set({ isLoading: true, error: null });

          const response = await fetch(`${API_BASE_URL}/workspaces`, {});

          if (!response.ok) {
            throw new Error('Failed to load workspaces');
          }

          const data = await response.json();
          set({ workspaces: data.workspaces || [] });

          // Auto-select first workspace if none selected
          const { current } = get();
          if (!current && data.workspaces.length > 0) {
            get().setWorkspace(data.workspaces[0]);
          }
        } catch (error) {
          console.error('Failed to load workspaces:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to load workspaces' });
        } finally {
          set({ isLoading: false });
        }
      },

      createWorkspace: async (data) => {
        try {
          set({ isLoading: true, error: null });

          const response = await fetch(`${API_BASE_URL}/workspace`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });

          if (!response.ok) {
            throw new Error('Failed to create workspace');
          }

          const newWorkspace = await response.json();
          
          set(state => ({
            workspaces: [...state.workspaces, newWorkspace],
            current: newWorkspace, // Auto-select new workspace
          }));

          return newWorkspace;
        } catch (error) {
          console.error('Failed to create workspace:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to create workspace' });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      updateWorkspace: async (id, updates) => {
        try {
          const response = await fetch(`${API_BASE_URL}/workspaces/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
          });

          if (!response.ok) {
            throw new Error('Failed to update workspace');
          }

          const updatedWorkspace = await response.json();

          set(state => ({
            workspaces: state.workspaces.map(w => w.id === id ? updatedWorkspace : w),
            current: state.current?.id === id ? updatedWorkspace : state.current
          }));
        } catch (error) {
          console.error('Failed to update workspace:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to update workspace' });
          throw error;
        }
      },

      deleteWorkspace: async (id) => {
        try {
          const response = await fetch(`${API_BASE_URL}/workspaces/${id}`, {
            method: 'DELETE'
          });

          if (!response.ok) {
            throw new Error('Failed to delete workspace');
          }

          set(state => {
            const remainingWorkspaces = state.workspaces.filter(w => w.id !== id);
            return {
              workspaces: remainingWorkspaces,
              current: state.current?.id === id 
                ? (remainingWorkspaces[0] || null) 
                : state.current,
              projects: state.current?.id === id ? [] : state.projects,
              members: state.current?.id === id ? [] : state.members
            };
          });
        } catch (error) {
          console.error('Failed to delete workspace:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to delete workspace' });
          throw error;
        }
      },

      // ===== PROJECT ACTIONS =====

      loadProjects: async (workspaceId) => {
        const targetWorkspaceId = workspaceId || get().current?.id;
        if (!targetWorkspaceId) return;

        try {
          set({ isProjectsLoading: true, error: null });

          const response = await fetch(`${API_BASE_URL}/projects?workspaceId=${targetWorkspaceId}`, {});

          if (!response.ok) {
            throw new Error('Failed to load projects');
          }

          const data = await response.json();
          set({ projects: data.projects || [] });
        } catch (error) {
          console.error('Failed to load projects:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to load projects' });
        } finally {
          set({ isProjectsLoading: false });
        }
      },

      createProject: async (data) => {
        try {
          set({ isProjectsLoading: true, error: null });

          const response = await fetch(`${API_BASE_URL}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });

          if (!response.ok) {
            throw new Error('Failed to create project');
          }

          const newProject = await response.json();
          
          set(state => ({
            projects: [...state.projects, newProject]
          }));

          return newProject;
        } catch (error) {
          console.error('Failed to create project:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to create project' });
          throw error;
        } finally {
          set({ isProjectsLoading: false });
        }
      },

      updateProject: async (id, updates) => {
        try {
          const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
          });

          if (!response.ok) {
            throw new Error('Failed to update project');
          }

          const updatedProject = await response.json();

          set(state => ({
            projects: state.projects.map(p => p.id === id ? updatedProject : p)
          }));
        } catch (error) {
          console.error('Failed to update project:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to update project' });
          throw error;
        }
      },

      deleteProject: async (id) => {
        try {
          const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
            method: 'DELETE'
          });

          if (!response.ok) {
            throw new Error('Failed to delete project');
          }

          set(state => ({
            projects: state.projects.filter(p => p.id !== id),
            currentProjectId: state.currentProjectId === id ? null : state.currentProjectId
          }));
        } catch (error) {
          console.error('Failed to delete project:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to delete project' });
          throw error;
        }
      },

      setCurrentProject: (projectId) => {
        set({ currentProjectId: projectId });
      },

      // ===== MEMBER ACTIONS =====

      loadMembers: async (workspaceId) => {
        const targetWorkspaceId = workspaceId || get().current?.id;
        if (!targetWorkspaceId) return;

        try {
          set({ isMembersLoading: true, error: null });

          const response = await fetch(`${API_BASE_URL}/workspaces/${targetWorkspaceId}/members`, {});

          if (!response.ok) {
            throw new Error('Failed to load members');
          }

          const data = await response.json();
          set({ members: data.members || [] });
        } catch (error) {
          console.error('Failed to load members:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to load members' });
        } finally {
          set({ isMembersLoading: false });
        }
      },

      inviteMember: async (email, role) => {
        const { current } = get();
        if (!current) throw new Error('No workspace selected');

        try {
          const response = await fetch(`${API_BASE_URL}/workspaces/${current.id}/invite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, role })
          });

          if (!response.ok) {
            throw new Error('Failed to invite member');
          }

          // Reload members to get updated list
          await get().loadMembers();
        } catch (error) {
          console.error('Failed to invite member:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to invite member' });
          throw error;
        }
      },

      updateMemberRole: async (userId, role) => {
        const { current } = get();
        if (!current) throw new Error('No workspace selected');

        try {
          const response = await fetch(`${API_BASE_URL}/workspaces/${current.id}/members/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role })
          });

          if (!response.ok) {
            throw new Error('Failed to update member role');
          }

          set(state => ({
            members: state.members.map(m => 
              m.userId === userId ? { ...m, role } : m
            )
          }));
        } catch (error) {
          console.error('Failed to update member role:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to update member role' });
          throw error;
        }
      },

      removeMember: async (userId) => {
        const { current } = get();
        if (!current) throw new Error('No workspace selected');

        try {
          const response = await fetch(`${API_BASE_URL}/workspaces/${current.id}/members/${userId}`, {
            method: 'DELETE'
          });

          if (!response.ok) {
            throw new Error('Failed to remove member');
          }

          set(state => ({
            members: state.members.filter(m => m.userId !== userId)
          }));
        } catch (error) {
          console.error('Failed to remove member:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to remove member' });
          throw error;
        }
      },

      // ===== PROJECT MEMBER ACTIONS =====

      addProjectMember: async (projectId, userId, role) => {
        try {
          const response = await fetch(`${API_BASE_URL}/projects/${projectId}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, role })
          });

          if (!response.ok) {
            throw new Error('Failed to add project member');
          }

          // Reload projects to get updated member lists
          await get().loadProjects();
        } catch (error) {
          console.error('Failed to add project member:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to add project member' });
          throw error;
        }
      },

      removeProjectMember: async (projectId, userId) => {
        try {
          const response = await fetch(`${API_BASE_URL}/projects/${projectId}/members/${userId}`, {
            method: 'DELETE'
          });

          if (!response.ok) {
            throw new Error('Failed to remove project member');
          }

          // Reload projects to get updated member lists
          await get().loadProjects();
        } catch (error) {
          console.error('Failed to remove project member:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to remove project member' });
          throw error;
        }
      },

      updateProjectMemberRole: async (projectId, userId, role) => {
        try {
          const response = await fetch(`${API_BASE_URL}/projects/${projectId}/members/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role })
          });

          if (!response.ok) {
            throw new Error('Failed to update project member role');
          }

          // Reload projects to get updated member lists
          await get().loadProjects();
        } catch (error) {
          console.error('Failed to update project member role:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to update project member role' });
          throw error;
        }
      },

      // ===== UTILITIES =====

      clearError: () => {
        set({ error: null });
      },

      reset: () => {
        set({
          current: null,
          workspaces: [],
          projects: [],
          members: [],
          isLoading: false,
          isProjectsLoading: false,
          isMembersLoading: false,
          error: null,
          currentProjectId: null
        });
      },

      // ===== GETTERS =====

      getCurrentProject: () => {
        const { projects, currentProjectId } = get();
        return projects.find(p => p.id === currentProjectId) || null;
      },

      getProjectsByStatus: (status) => {
        const { projects } = get();
        return projects.filter(p => p.status === status);
      },

      getMembersByRole: (role) => {
        const { members } = get();
        return members.filter(m => m.role === role);
      }
    }),
    {
      name: 'meridian-workspace',
      partialize: (state) => ({
        current: state.current,
        workspaces: state.workspaces,
        currentProjectId: state.currentProjectId,
        // Don't persist projects and members - they'll be reloaded
      })
    }
  )
);

// ===== CONVENIENCE HOOKS =====

export const useWorkspace = () => {
  const store = useWorkspaceStore();
  return {
    workspace: store.current,
    workspaces: store.workspaces,
    isLoading: store.isLoading,
    setWorkspace: store.setWorkspace,
    loadWorkspaces: store.loadWorkspaces,
    createWorkspace: store.createWorkspace,
    updateWorkspace: store.updateWorkspace,
    deleteWorkspace: store.deleteWorkspace
  };
};

export const useProjects = () => {
  const store = useWorkspaceStore();
  return {
    projects: store.projects,
    currentProject: store.getCurrentProject(),
    isLoading: store.isProjectsLoading,
    loadProjects: store.loadProjects,
    createProject: store.createProject,
    updateProject: store.updateProject,
    deleteProject: store.deleteProject,
    setCurrentProject: store.setCurrentProject,
    getProjectsByStatus: store.getProjectsByStatus
  };
};

export const useWorkspaceMembers = () => {
  const store = useWorkspaceStore();
  return {
    members: store.members,
    isLoading: store.isMembersLoading,
    loadMembers: store.loadMembers,
    inviteMember: store.inviteMember,
    updateMemberRole: store.updateMemberRole,
    removeMember: store.removeMember,
    getMembersByRole: store.getMembersByRole
  };
};

export default useWorkspaceStore;