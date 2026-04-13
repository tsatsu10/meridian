import { TeamRole } from "@/hooks/useTeamPermissions";

/**
 * Team Management API - Handles team operations and permissions
 * @epic-3.4-teams: Team management backend integration
 */

// Team data interfaces
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  avatar?: string;
  department?: string;
  title?: string;
  status: "active" | "inactive" | "pending";
  joinDate: Date;
  lastActive: Date;
  permissions: string[];
  reportsTo?: string;
  directReports: string[];
}

export interface GuestAccessSettings {
  enabled: boolean;
  expiryDate?: Date;
  accessLevel: "read-only" | "limited" | "collaborate";
  allowedProjects: string[];
  restrictions: string[];
}

export interface ApprovalWorkflow {
  id: string;
  name: string;
  description: string;
  triggerEvent: "project_creation" | "team_invitation" | "role_change" | "budget_approval" | "task_completion";
  approvers: string[];
  requiredApprovals: number;
  timeoutHours: number;
  escalationRules: EscalationRule[];
  enabled: boolean;
}

export interface EscalationRule {
  id: string;
  condition: "timeout" | "rejection" | "no_response";
  action: "escalate" | "auto_approve" | "auto_reject";
  escalateTo: string[];
  delayHours: number;
}

export interface TeamHierarchy {
  id: string;
  name: string;
  level: number;
  parentId?: string;
  leaderId: string;
  members: string[];
  description: string;
  color: string;
}

export interface OnboardingTemplate {
  id: string;
  name: string;
  description: string;
  role: TeamRole;
  tasks: OnboardingTask[];
  duration: number; // days
  autoAssignMentor: boolean;
  mentorRole: TeamRole;
  enabled: boolean;
}

export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  type: "action" | "training" | "meeting" | "document";
  dayOffset: number;
  assigneeType: "new_member" | "mentor" | "manager" | "hr";
  autoComplete: boolean;
  required: boolean;
}

// Permission management
export interface PermissionMatrix {
  [permission: string]: {
    [role in TeamRole]: boolean;
  };
}

// Team API implementation
export class TeamManagementAPI {
  private static storageKey = "meridian-team-management";

  // Get current workspace's team data
  static async getWorkspaceTeamData(workspaceId: string): Promise<{
    members: TeamMember[];
    permissionMatrix: PermissionMatrix;
    workflows: ApprovalWorkflow[];
    hierarchy: TeamHierarchy[];
    onboardingTemplates: OnboardingTemplate[];
    guestSettings: {
      allowGuestAccess: boolean;
      defaultGuestRole: TeamRole;
      maxGuestDuration: number;
      requireApprovalForGuests: boolean;
      allowGuestInvites: boolean;
      guestDomainRestrictions: string[];
    };
  }> {
    await this.delay(300);

    const stored = this.getStoredData();
    const workspaceData = stored[workspaceId];

    if (workspaceData) {
      return workspaceData;
    }

    // Return default data for new workspaces
    const defaultData = this.createDefaultTeamData();
    this.saveWorkspaceData(workspaceId, defaultData);
    return defaultData;
  }

  // Update permission matrix
  static async updatePermissionMatrix(
    workspaceId: string,
    permissionMatrix: PermissionMatrix
  ): Promise<PermissionMatrix> {
    await this.delay(200);

    const stored = this.getStoredData();
    if (!stored[workspaceId]) {
      stored[workspaceId] = this.createDefaultTeamData();
    }

    stored[workspaceId].permissionMatrix = permissionMatrix;
    this.saveStoredData(stored);

    return permissionMatrix;
  }

  // Create approval workflow
  static async createApprovalWorkflow(
    workspaceId: string,
    workflow: Omit<ApprovalWorkflow, "id">
  ): Promise<ApprovalWorkflow> {
    await this.delay(300);

    const newWorkflow: ApprovalWorkflow = {
      ...workflow,
      id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    const stored = this.getStoredData();
    if (!stored[workspaceId]) {
      stored[workspaceId] = this.createDefaultTeamData();
    }

    stored[workspaceId].workflows.push(newWorkflow);
    this.saveStoredData(stored);

    return newWorkflow;
  }

  // Update workflow
  static async updateApprovalWorkflow(
    workspaceId: string,
    workflowId: string,
    updates: Partial<ApprovalWorkflow>
  ): Promise<ApprovalWorkflow> {
    await this.delay(200);

    const stored = this.getStoredData();
    if (!stored[workspaceId]) {
      throw new Error("Workspace not found");
    }

    const workflowIndex = stored[workspaceId].workflows.findIndex(w => w.id === workflowId);
    if (workflowIndex === -1) {
      throw new Error("Workflow not found");
    }

    stored[workspaceId].workflows[workflowIndex] = {
      ...stored[workspaceId].workflows[workflowIndex],
      ...updates,
    };

    this.saveStoredData(stored);
    return stored[workspaceId].workflows[workflowIndex];
  }

  // Delete workflow
  static async deleteApprovalWorkflow(workspaceId: string, workflowId: string): Promise<void> {
    await this.delay(200);

    const stored = this.getStoredData();
    if (!stored[workspaceId]) {
      throw new Error("Workspace not found");
    }

    stored[workspaceId].workflows = stored[workspaceId].workflows.filter(w => w.id !== workflowId);
    this.saveStoredData(stored);
  }

  // Update guest settings
  static async updateGuestSettings(
    workspaceId: string,
    guestSettings: any
  ): Promise<any> {
    await this.delay(200);

    const stored = this.getStoredData();
    if (!stored[workspaceId]) {
      stored[workspaceId] = this.createDefaultTeamData();
    }

    stored[workspaceId].guestSettings = { ...stored[workspaceId].guestSettings, ...guestSettings };
    this.saveStoredData(stored);

    return stored[workspaceId].guestSettings;
  }

  // Create hierarchy node
  static async createHierarchyNode(
    workspaceId: string,
    node: Omit<TeamHierarchy, "id">
  ): Promise<TeamHierarchy> {
    await this.delay(300);

    const newNode: TeamHierarchy = {
      ...node,
      id: `hierarchy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    const stored = this.getStoredData();
    if (!stored[workspaceId]) {
      stored[workspaceId] = this.createDefaultTeamData();
    }

    stored[workspaceId].hierarchy.push(newNode);
    this.saveStoredData(stored);

    return newNode;
  }

  // Create onboarding template
  static async createOnboardingTemplate(
    workspaceId: string,
    template: Omit<OnboardingTemplate, "id">
  ): Promise<OnboardingTemplate> {
    await this.delay(300);

    const newTemplate: OnboardingTemplate = {
      ...template,
      id: `onboarding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    const stored = this.getStoredData();
    if (!stored[workspaceId]) {
      stored[workspaceId] = this.createDefaultTeamData();
    }

    stored[workspaceId].onboardingTemplates.push(newTemplate);
    this.saveStoredData(stored);

    return newTemplate;
  }

  // Private helper methods
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private static getStoredData(): Record<string, any> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  private static saveStoredData(data: Record<string, any>): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save team data:", error);
    }
  }

  private static saveWorkspaceData(workspaceId: string, data: any): void {
    const stored = this.getStoredData();
    stored[workspaceId] = data;
    this.saveStoredData(stored);
  }

  private static createDefaultTeamData() {
    return {
      members: [
        {
          id: "demo-user-1",
          name: "Demo User",
          email: "demo@meridian.app",
          role: "owner" as TeamRole,
          avatar: "",
          department: "Engineering",
          title: "Product Manager",
          status: "active",
          joinDate: new Date(),
          lastActive: new Date(),
          permissions: [],
          directReports: [],
        },
      ],
      permissionMatrix: this.createDefaultPermissionMatrix(),
      workflows: [],
      hierarchy: [],
      onboardingTemplates: [],
      guestSettings: {
        allowGuestAccess: true,
        defaultGuestRole: "viewer" as TeamRole,
        maxGuestDuration: 30,
        requireApprovalForGuests: true,
        allowGuestInvites: false,
        guestDomainRestrictions: [],
      },
    };
  }

  private static createDefaultPermissionMatrix(): PermissionMatrix {
    const permissions = [
      "canCreateTeam", "canEditTeam", "canDeleteTeam", "canAddMembers", "canRemoveMembers", "canChangeRoles",
      "canCreateProjects", "canEditProjects", "canDeleteProjects", "canManageProjectSettings", "canAssignProjectLead",
      "canCreateTasks", "canEditTasks", "canDeleteTasks", "canAssignTasks", "canSetPriority", "canSetDeadlines",
      "canViewAnalytics", "canCreateReports", "canExportData", "canViewTimeReports", "canScheduleReports",
      "canAccessSettings", "canManageWorkspace", "canManageBilling", "canInviteUsers", "canManageRoles"
    ];

    const matrix: PermissionMatrix = {};
    
    permissions.forEach(permission => {
      matrix[permission] = {
        owner: true,
        admin: permission !== "canManageBilling" && permission !== "canManageWorkspace",
        member: permission.includes("canCreate") || permission.includes("canEdit") || permission.includes("canView"),
        viewer: permission.includes("canView"),
        guest: permission === "canViewAnalytics" || permission === "canViewTimeReports",
      };
    });

    return matrix;
  }

  // Utility: Clear all team data
  static clearAllData(): void {
    localStorage.removeItem(this.storageKey);
  }

  // Utility: Export team data
  static exportData(): Record<string, any> {
    return this.getStoredData();
  }
} 