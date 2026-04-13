// Clean team role definitions
export interface TeamRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  hierarchy: number;
  isSystemRole: boolean;
}

export const TEAM_ROLES: Record<string, TeamRole> = {
  'team-owner': {
    id: 'team-owner',
    name: 'Team Owner',
    description: 'Full control over team and its resources',
    permissions: ['*'],
    hierarchy: 100,
    isSystemRole: true,
  },
  'team-admin': {
    id: 'team-admin',
    name: 'Team Administrator',
    description: 'Administrative access to team management',
    permissions: ['team.manage', 'members.manage', 'projects.manage'],
    hierarchy: 90,
    isSystemRole: true,
  },
  'team-lead': {
    id: 'team-lead',
    name: 'Team Lead',
    description: 'Leadership role with project oversight',
    permissions: ['projects.manage', 'tasks.manage', 'members.view'],
    hierarchy: 80,
    isSystemRole: true,
  },
  'team-member': {
    id: 'team-member',
    name: 'Team Member',
    description: 'Standard team member with basic access',
    permissions: ['tasks.view', 'tasks.create', 'tasks.update'],
    hierarchy: 50,
    isSystemRole: true,
  },
  'team-viewer': {
    id: 'team-viewer',
    name: 'Team Viewer',
    description: 'Read-only access to team resources',
    permissions: ['tasks.view', 'projects.view'],
    hierarchy: 10,
    isSystemRole: true,
  },
};

export function getRoleById(roleId: string): TeamRole | undefined {
  return TEAM_ROLES[roleId];
}

export function getAllRoles(): TeamRole[] {
  return Object.values(TEAM_ROLES);
}

export function hasPermission(roleId: string, permission: string): boolean {
  const role = getRoleById(roleId);
  if (!role) return false;

  return role.permissions.includes('*') || role.permissions.includes(permission);
}

export default TEAM_ROLES;