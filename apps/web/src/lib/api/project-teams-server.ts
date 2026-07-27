const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3005";

export type UserRole =
  | "workspace-manager"
  | "department-head"
  | "workspace-viewer"
  | "project-manager"
  | "project-viewer"
  | "team-lead"
  | "member"
  | "client"
  | "contractor"
  | "stakeholder"
  | "guest";

export interface TeamMember {
  id: string;
  userEmail: string;
  userName: string;
  role: UserRole;
  avatar?: string;
  joinedAt: string;
}

export interface ProjectTeam {
  id: string;
  name: string;
  description?: string;
  color: string;
  members: TeamMember[];
  createdAt: string;
  leadId: string;
}

// Project teams API client
export const TeamsAPI = {
  baseUrl: API_BASE,

  // The real app authenticates via an HttpOnly session cookie set on
  // sign-in (apps/api/src/user/index.ts), not a Bearer token — nothing
  // in the sign-in flow ever populates localStorage/sessionStorage's
  // "auth-token" key, so that branch never fired. Without
  // credentials: "include" either, the cross-origin request never sent
  // the session cookie, so every call hit the API unauthenticated and
  // 401'd (confirmed live via GET /api/projects/:projectId/teams).
  async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${TeamsAPI.baseUrl}${endpoint}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: response.statusText }));
      throw new Error(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`,
      );
    }

    return response.json();
  },

  async getProjectTeams(projectId: string): Promise<ProjectTeam[]> {
    return await TeamsAPI.request(`/api/projects/${projectId}/teams`);
  },

  async createTeam(
    projectId: string,
    team: Omit<ProjectTeam, "id" | "createdAt">,
  ): Promise<ProjectTeam> {
    return await TeamsAPI.request(`/api/projects/${projectId}/teams`, {
      method: "POST",
      body: JSON.stringify(team),
    });
  },

  async updateTeam(
    projectId: string,
    teamId: string,
    updates: Partial<ProjectTeam>,
  ): Promise<ProjectTeam> {
    return await TeamsAPI.request(
      `/api/projects/${projectId}/teams/${teamId}`,
      {
        method: "PATCH",
        body: JSON.stringify(updates),
      },
    );
  },

  async deleteTeam(projectId: string, teamId: string): Promise<void> {
    await TeamsAPI.request(`/api/projects/${projectId}/teams/${teamId}`, {
      method: "DELETE",
    });
  },

  async addMember(
    projectId: string,
    teamId: string,
    member: Omit<TeamMember, "id" | "joinedAt">,
  ): Promise<TeamMember> {
    return await TeamsAPI.request(
      `/api/projects/${projectId}/teams/${teamId}/members`,
      {
        method: "POST",
        body: JSON.stringify(member),
      },
    );
  },

  async removeMember(
    projectId: string,
    teamId: string,
    memberId: string,
  ): Promise<void> {
    await TeamsAPI.request(
      `/api/projects/${projectId}/teams/${teamId}/members/${memberId}`,
      {
        method: "DELETE",
      },
    );
  },

  async updateMemberRole(
    projectId: string,
    teamId: string,
    memberId: string,
    role: UserRole,
  ): Promise<TeamMember> {
    return await TeamsAPI.request(
      `/api/projects/${projectId}/teams/${teamId}/members/${memberId}/role`,
      {
        method: "PATCH",
        body: JSON.stringify({ role }),
      },
    );
  },
};
