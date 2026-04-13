import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Crown, 
  Shield, 
  Settings, 
  Users, 
  UserCheck, 
  User,
  CheckCircle
} from 'lucide-react';
import { TeamRole } from '@/types/unified-team';
import { cn } from '@/lib/utils';

interface TeamRoleSelectorProps {
  value: TeamRole;
  onValueChange: (role: TeamRole) => void;
  disabled?: boolean;
  variant?: 'default' | 'badge' | 'compact';
  showIcon?: boolean;
  showPermissions?: boolean;
  excludeRoles?: TeamRole[];
  className?: string;
}

const ROLE_DEFINITIONS = {
  "workspace-manager": {
    label: "Workspace Manager",
    icon: <Crown className="h-4 w-4" />,
    color: "from-yellow-500 to-orange-500",
    textColor: "text-yellow-600",
    permissions: ["All permissions", "Billing access", "Delete workspace"],
    level: 10
  },
  "department-head": {
    label: "Department Head",
    icon: <Shield className="h-4 w-4" />,
    color: "from-blue-500 to-indigo-500",
    textColor: "text-blue-600",
    permissions: ["Manage department", "Project oversight", "View analytics"],
    level: 8
  },
  "project-manager": {
    label: "Project Manager",
    icon: <Settings className="h-4 w-4" />,
    color: "from-purple-500 to-pink-500",
    textColor: "text-purple-600",
    permissions: ["Manage projects", "Project settings", "View reports"],
    level: 7
  },
  "team-lead": {
    label: "Team Lead",
    icon: <Users className="h-4 w-4" />,
    color: "from-green-500 to-emerald-500",
    textColor: "text-green-600",
    permissions: ["Lead team", "Manage tasks", "View team reports"],
    level: 6
  },
  "member": {
    label: "Member",
    icon: <UserCheck className="h-4 w-4" />,
    color: "from-green-500 to-emerald-500",
    textColor: "text-green-600",
    permissions: ["Create projects", "Manage tasks", "View reports"],
    level: 5
  },
  "client": {
    label: "Client",
    icon: <User className="h-4 w-4" />,
    color: "from-blue-400 to-blue-600",
    textColor: "text-blue-500",
    permissions: ["View projects", "Comment on tasks", "Basic access"],
    level: 3
  },
  "contractor": {
    label: "Contractor",
    icon: <Settings className="h-4 w-4" />,
    color: "from-orange-500 to-red-500",
    textColor: "text-orange-600",
    permissions: ["View assigned tasks", "Track time", "Submit reports"],
    level: 4
  },
  "stakeholder": {
    label: "Stakeholder",
    icon: <User className="h-4 w-4" />,
    color: "from-purple-400 to-purple-600",
    textColor: "text-purple-500",
    permissions: ["View projects", "View reports", "Readonly access"],
    level: 3
  },
  "workspace-viewer": {
    label: "Workspace Viewer",
    icon: <User className="h-4 w-4" />,
    color: "from-gray-500 to-slate-500",
    textColor: "text-gray-600",
    permissions: ["View workspace", "Basic access"],
    level: 2
  },
  "project-viewer": {
    label: "Project Viewer",
    icon: <User className="h-4 w-4" />,
    color: "from-gray-500 to-slate-500",
    textColor: "text-gray-600",
    permissions: ["View projects", "Comment on tasks", "Basic access"],
    level: 2
  },
  "guest": {
    label: "Guest",
    icon: <User className="h-4 w-4" />,
    color: "from-gray-400 to-gray-600",
    textColor: "text-gray-500",
    permissions: ["View projects", "Comment", "Limited access"],
    level: 1
  }
} as const;

export const TeamRoleSelector: React.FC<TeamRoleSelectorProps> = ({
  value,
  onValueChange,
  disabled = false,
  variant = 'default',
  showIcon = true,
  showPermissions = false,
  excludeRoles = [],
  className
}) => {
  const currentRole = ROLE_DEFINITIONS[value];
  const availableRoles = (Object.keys(ROLE_DEFINITIONS) as TeamRole[])
    .filter(role => !excludeRoles.includes(role))
    .sort((a, b) => ROLE_DEFINITIONS[b].level - ROLE_DEFINITIONS[a].level);

  if (variant === 'badge') {
    return (
      <Badge 
        variant="secondary"
        className={cn(
          "bg-gradient-to-r text-white border-0 cursor-pointer",
          currentRole.color,
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <div className="flex items-center gap-1">
          {showIcon && currentRole.icon}
          {currentRole.label}
        </div>
      </Badge>
    );
  }

  if (variant === 'compact') {
    return (
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger className={cn("w-auto h-8 text-xs border-0 bg-transparent", className)}>
          {showIcon && <Settings className="h-3 w-3" />}
        </SelectTrigger>
        <SelectContent>
          {availableRoles.map((role) => {
            const roleInfo = ROLE_DEFINITIONS[role];
            return (
              <SelectItem key={role} value={role}>
                <div className="flex items-center gap-2">
                  {showIcon && roleInfo.icon}
                  <span>{roleInfo.label}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue>
            <div className="flex items-center gap-2">
              {showIcon && currentRole.icon}
              <span>{currentRole.label}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {availableRoles.map((role) => {
            const roleInfo = ROLE_DEFINITIONS[role];
            return (
              <SelectItem key={role} value={role}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    {showIcon && (
                      <span className={roleInfo.textColor}>
                        {roleInfo.icon}
                      </span>
                    )}
                    <span>{roleInfo.label}</span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn("ml-2 text-xs", roleInfo.textColor)}
                  >
                    Level {roleInfo.level}
                  </Badge>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {showPermissions && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-slate-900 mb-2 flex items-center gap-2">
            {showIcon && currentRole.icon}
            {currentRole.label} Permissions
          </h4>
          <ul className="space-y-1">
            {currentRole.permissions.map((permission, index) => (
              <li key={index} className="text-xs text-gray-600 flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                {permission}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// Helper function to get role information
export const getRoleInfo = (role: TeamRole) => {
  return ROLE_DEFINITIONS[role];
};

// Helper function to compare role levels
export const compareRoles = (roleA: TeamRole, roleB: TeamRole): number => {
  return ROLE_DEFINITIONS[roleB].level - ROLE_DEFINITIONS[roleA].level;
};

// Helper function to check if a role can manage another role
export const canManageRole = (managerRole: TeamRole, targetRole: TeamRole): boolean => {
  return ROLE_DEFINITIONS[managerRole].level > ROLE_DEFINITIONS[targetRole].level;
};

// Role display component for read-only use
export const RoleDisplay: React.FC<{
  role: TeamRole;
  showIcon?: boolean;
  showLevel?: boolean;
  variant?: 'badge' | 'text';
  className?: string;
}> = ({ 
  role, 
  showIcon = true, 
  showLevel = false, 
  variant = 'badge',
  className 
}) => {
  const roleInfo = ROLE_DEFINITIONS[role];

  if (variant === 'text') {
    return (
      <span className={cn("flex items-center gap-2", className)}>
        {showIcon && roleInfo.icon}
        <span>{roleInfo.label}</span>
        {showLevel && (
          <Badge variant="outline" className="text-xs">
            Level {roleInfo.level}
          </Badge>
        )}
      </span>
    );
  }

  return (
    <Badge 
      variant="secondary"
      className={cn(
        "bg-gradient-to-r text-white border-0",
        roleInfo.color,
        className
      )}
    >
      <div className="flex items-center gap-1">
        {showIcon && roleInfo.icon}
        {roleInfo.label}
        {showLevel && <span className="ml-1">L{roleInfo.level}</span>}
      </div>
    </Badge>
  );
};