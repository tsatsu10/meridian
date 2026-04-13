/**
 * 👥 Edit Role Modal Component
 * 
 * Admin interface for editing user roles and permissions:
 * - Change user role
 * - View/modify custom permissions
 * - Permission matrix display
 * - Role hierarchy validation
 * - Audit trail integration
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Check, X, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

interface EditRoleModalProps {
  open: boolean;
  onClose: () => void;
  member: {
    id: string;
    userEmail: string;
    userName?: string;
    role: string;
    customPermissions?: string[];
  };
  workspaceId: string;
}

// Role definitions with hierarchy
const ROLES = [
  { 
    value: 'workspace-manager', 
    label: 'Workspace Manager', 
    level: 100,
    description: 'Full workspace control, billing, deletion',
    color: 'destructive' as const,
  },
  { 
    value: 'admin', 
    label: 'Admin', 
    level: 70,
    description: 'User management, workspace settings',
    color: 'default' as const,
  },
  { 
    value: 'department-head', 
    label: 'Department Head', 
    level: 80,
    description: 'Multi-project oversight, department management',
    color: 'default' as const,
  },
  { 
    value: 'project-manager', 
    label: 'Project Manager', 
    level: 50,
    description: 'Project-level control, planning',
    color: 'secondary' as const,
  },
  { 
    value: 'team-lead', 
    label: 'Team Lead', 
    level: 40,
    description: 'Team coordination, analytics',
    color: 'secondary' as const,
  },
  { 
    value: 'member', 
    label: 'Member', 
    level: 20,
    description: 'Standard task management',
    color: 'outline' as const,
  },
  { 
    value: 'project-viewer', 
    label: 'Project Viewer', 
    level: 10,
    description: 'Read-only access',
    color: 'outline' as const,
  },
  { 
    value: 'guest', 
    label: 'Guest', 
    level: 5,
    description: 'Limited temporary access',
    color: 'outline' as const,
  },
];

// Permission categories
const PERMISSIONS = {
  tasks: [
    { id: 'tasks.create', label: 'Create tasks' },
    { id: 'tasks.edit', label: 'Edit tasks' },
    { id: 'tasks.delete', label: 'Delete tasks' },
    { id: 'tasks.assign', label: 'Assign tasks' },
  ],
  projects: [
    { id: 'projects.create', label: 'Create projects' },
    { id: 'projects.edit', label: 'Edit projects' },
    { id: 'projects.delete', label: 'Delete projects' },
    { id: 'projects.manage_members', label: 'Manage members' },
  ],
  workspace: [
    { id: 'workspace.settings', label: 'Edit workspace settings' },
    { id: 'workspace.billing', label: 'Manage billing' },
    { id: 'workspace.delete', label: 'Delete workspace' },
  ],
  users: [
    { id: 'users.invite', label: 'Invite users' },
    { id: 'users.remove', label: 'Remove users' },
    { id: 'users.manage_roles', label: 'Manage roles' },
  ],
};

// Default permissions per role
const ROLE_PERMISSIONS: Record<string, string[]> = {
  'workspace-manager': ['*'], // All permissions
  'admin': [
    'users.*', 'projects.*', 'workspace.settings',
    'tasks.*', 'projects.manage_members',
  ],
  'department-head': [
    'projects.*', 'tasks.*', 'users.invite',
  ],
  'project-manager': [
    'projects.edit', 'projects.manage_members',
    'tasks.*', 'users.invite',
  ],
  'team-lead': [
    'tasks.*', 'projects.edit',
  ],
  'member': [
    'tasks.create', 'tasks.edit', 'tasks.assign',
  ],
  'project-viewer': [
    'tasks.view', 'projects.view',
  ],
  'guest': [
    'tasks.view',
  ],
};

export function EditRoleModal({
  open,
  onClose,
  member,
  workspaceId,
}: EditRoleModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedRole, setSelectedRole] = useState(member.role);
  const [customPermissions, setCustomPermissions] = useState<string[]>(
    member.customPermissions || []
  );

  const currentUserRole = ROLES.find(r => r.value === user?.role);
  const targetRole = ROLES.find(r => r.value === selectedRole);
  const canAssignRole = (currentUserRole?.level || 0) > (targetRole?.level || 0);

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/workspace-members/${member.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          role: selectedRole,
          customPermissions: customPermissions.length > 0 ? customPermissions : undefined,
        }),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: '✓ Role Updated',
        description: `${member.userName || member.userEmail} is now a ${targetRole?.label}`,
      });
      queryClient.invalidateQueries({ queryKey: ['workspace-members'] });
      onClose();
    },
    onError: () => {
      toast({
        title: 'Update Failed',
        description: 'Failed to update user role',
        variant: 'destructive',
      });
    },
  });

  const togglePermission = (permissionId: string) => {
    setCustomPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(p => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const hasPermission = (permissionId: string) => {
    // Check if role has permission by default
    const rolePerms = ROLE_PERMISSIONS[selectedRole] || [];
    if (rolePerms.includes('*')) return true;
    if (rolePerms.includes(permissionId)) return true;
    
    // Check wildcard permissions
    const category = permissionId.split('.')[0];
    if (rolePerms.includes(`${category}.*`)) return true;
    
    // Check custom permissions
    return customPermissions.includes(permissionId);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Edit Role & Permissions
          </DialogTitle>
          <DialogDescription>
            Manage role and custom permissions for {member.userName || member.userEmail}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Role Badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Current role:</span>
            <Badge variant={ROLES.find(r => r.value === member.role)?.color || 'outline'}>
              {ROLES.find(r => r.value === member.role)?.label || member.role}
            </Badge>
          </div>

          <Separator />

          {/* Role Selection */}
          <div className="space-y-2">
            <Label>Select New Role</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map(role => (
                  <SelectItem 
                    key={role.value} 
                    value={role.value}
                    disabled={!canAssignRole && role.value !== member.role}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <div className="font-medium">{role.label}</div>
                        <div className="text-xs text-muted-foreground">{role.description}</div>
                      </div>
                      {!canAssignRole && role.value !== member.role && (
                        <Badge variant="outline" className="ml-2">Locked</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {!canAssignRole && (
              <div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-500">
                <AlertTriangle className="h-4 w-4 mt-0.5" />
                <span>You cannot assign a role at or above your own level</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Permissions Matrix */}
          <div className="space-y-4">
            <Label>Permissions Matrix</Label>
            <p className="text-sm text-muted-foreground">
              Default permissions are inherited from the role. Check boxes to add custom permissions.
            </p>

            {/* Tasks Permissions */}
            <div>
              <h4 className="font-medium mb-2">📋 Task Permissions</h4>
              <div className="space-y-2 pl-4">
                {PERMISSIONS.tasks.map(perm => (
                  <div key={perm.id} className="flex items-center gap-2">
                    <Checkbox
                      id={perm.id}
                      checked={hasPermission(perm.id)}
                      onCheckedChange={() => togglePermission(perm.id)}
                      disabled={ROLE_PERMISSIONS[selectedRole]?.includes('*') || 
                               ROLE_PERMISSIONS[selectedRole]?.includes('tasks.*')}
                    />
                    <label
                      htmlFor={perm.id}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {perm.label}
                    </label>
                    {ROLE_PERMISSIONS[selectedRole]?.includes(perm.id) && (
                      <Badge variant="outline" className="text-xs">Default</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Projects Permissions */}
            <div>
              <h4 className="font-medium mb-2">📁 Project Permissions</h4>
              <div className="space-y-2 pl-4">
                {PERMISSIONS.projects.map(perm => (
                  <div key={perm.id} className="flex items-center gap-2">
                    <Checkbox
                      id={perm.id}
                      checked={hasPermission(perm.id)}
                      onCheckedChange={() => togglePermission(perm.id)}
                      disabled={ROLE_PERMISSIONS[selectedRole]?.includes('*') || 
                               ROLE_PERMISSIONS[selectedRole]?.includes('projects.*')}
                    />
                    <label
                      htmlFor={perm.id}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {perm.label}
                    </label>
                    {ROLE_PERMISSIONS[selectedRole]?.includes(perm.id) && (
                      <Badge variant="outline" className="text-xs">Default</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Workspace Permissions */}
            <div>
              <h4 className="font-medium mb-2">🏢 Workspace Permissions</h4>
              <div className="space-y-2 pl-4">
                {PERMISSIONS.workspace.map(perm => (
                  <div key={perm.id} className="flex items-center gap-2">
                    <Checkbox
                      id={perm.id}
                      checked={hasPermission(perm.id)}
                      onCheckedChange={() => togglePermission(perm.id)}
                      disabled={ROLE_PERMISSIONS[selectedRole]?.includes('*')}
                    />
                    <label
                      htmlFor={perm.id}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {perm.label}
                    </label>
                    {ROLE_PERMISSIONS[selectedRole]?.includes(perm.id) && (
                      <Badge variant="outline" className="text-xs">Default</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* User Permissions */}
            <div>
              <h4 className="font-medium mb-2">👤 User Permissions</h4>
              <div className="space-y-2 pl-4">
                {PERMISSIONS.users.map(perm => (
                  <div key={perm.id} className="flex items-center gap-2">
                    <Checkbox
                      id={perm.id}
                      checked={hasPermission(perm.id)}
                      onCheckedChange={() => togglePermission(perm.id)}
                      disabled={ROLE_PERMISSIONS[selectedRole]?.includes('*') || 
                               ROLE_PERMISSIONS[selectedRole]?.includes('users.*')}
                    />
                    <label
                      htmlFor={perm.id}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {perm.label}
                    </label>
                    {ROLE_PERMISSIONS[selectedRole]?.includes(perm.id) && (
                      <Badge variant="outline" className="text-xs">Default</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-md">
            <h4 className="font-medium mb-2">📊 Permission Summary</h4>
            <div className="text-sm space-y-1">
              <p>
                <strong>Role:</strong> {targetRole?.label}
              </p>
              <p>
                <strong>Default Permissions:</strong>{' '}
                {ROLE_PERMISSIONS[selectedRole]?.join(', ') || 'None'}
              </p>
              {customPermissions.length > 0 && (
                <p>
                  <strong>Custom Permissions:</strong>{' '}
                  {customPermissions.join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => updateRoleMutation.mutate()}
            disabled={
              updateRoleMutation.isPending ||
              !canAssignRole ||
              selectedRole === member.role
            }
          >
            {updateRoleMutation.isPending ? (
              <>
                <X className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Update Role
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

