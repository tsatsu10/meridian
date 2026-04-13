/**
 * 📄 Role Details Page
 * 
 * Detailed view of a role with assigned users and permissions.
 * Supports user assignment and history viewing.
 * 
 * @phase Phase-3-Week-9
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useParams, useNavigate } from '@tanstack/react-router';
import { API_BASE_URL } from '@/constants/urls';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ArrowLeft,
  Users,
  Shield,
  Edit,
  Copy,
  Trash2,
  UserPlus,
  Crown,
  Clock,
  Activity,
} from 'lucide-react';
import { AssignUsersModal } from '@/components/rbac/assign-users-modal';
import { AssignedUsersList } from '@/components/rbac/assigned-users-list';
import { PermissionsList } from '@/components/rbac/permissions-list';
import { RoleHistory } from '@/components/rbac/role-history';
import { toast } from 'sonner';

// ==========================================
// TYPES
// ==========================================

interface Role {
  id: string;
  name: string;
  description: string | null;
  type: 'system' | 'custom';
  color: string;
  permissions: string[] | null;
  usersCount: number;
  lastUsedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
}

// ==========================================
// MAIN COMPONENT
// ==========================================

function RoleDetailsPage() {
  const { roleId } = useParams({ from: '/dashboard/settings/roles-unified/$roleId' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  
  // Fetch role details
  const { data: role, isLoading } = useQuery({
    queryKey: ['role', roleId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/roles/${roleId}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch role');
      const data = await response.json();
      return data.role as Role;
    },
  });
  
  // Fetch role usage stats
  const { data: usageStats } = useQuery({
    queryKey: ['role-usage', roleId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/roles/${roleId}/usage`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch usage');
      const data = await response.json();
      return data.usage;
    },
  });
  
  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE_URL}/roles/${roleId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete role');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('Role deleted successfully');
      navigate({ to: '/dashboard/settings/roles-unified' });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
  
  // Clone role mutation
  const cloneRoleMutation = useMutation({
    mutationFn: async (newName: string) => {
      const response = await fetch(`${API_BASE_URL}/roles/${roleId}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newName }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to clone role');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role cloned successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
  
  const handleEdit = () => {
    // TODO: Open edit modal
    toast.info('Edit functionality coming soon');
  };
  
  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${role?.name}"? This cannot be undone.`)) {
      deleteRoleMutation.mutate();
    }
  };
  
  const handleClone = () => {
    const newName = prompt(`Clone "${role?.name}" as:`, `${role?.name} (Copy)`);
    if (newName) {
      cloneRoleMutation.mutate(newName);
    }
  };
  
  const handleAssignUsers = () => {
    setIsAssignModalOpen(true);
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
        </div>
      </div>
    );
  }
  
  if (!role) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Role not found</h3>
          <Button onClick={() => navigate({ to: '/dashboard/settings/roles-unified' })}>
            Back to Roles
          </Button>
        </div>
      </div>
    );
  }
  
  const isSystem = role.type === 'system';
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate({ to: '/dashboard/settings/roles-unified' })}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Roles
        </Button>
        
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div
              className="h-12 w-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: role.color }}
            >
              {isSystem ? (
                <Crown className="h-6 w-6 text-white" />
              ) : (
                <Shield className="h-6 w-6 text-white" />
              )}
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl font-bold">{role.name}</h1>
                <Badge variant={isSystem ? 'secondary' : 'default'}>
                  {isSystem ? 'System' : 'Custom'}
                </Badge>
                {!role.isActive && (
                  <Badge variant="outline" className="text-muted-foreground">
                    Inactive
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">
                {role.description || 'No description'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button onClick={handleAssignUsers}>
              <UserPlus className="h-4 w-4 mr-2" />
              Assign Users
            </Button>
            
            {!isSystem && (
              <>
                <Button variant="outline" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </>
            )}
            
            <Button variant="outline" onClick={handleClone}>
              <Copy className="h-4 w-4 mr-2" />
              Clone
            </Button>
            
            {!isSystem && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteRoleMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Assigned Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{role.usersCount}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {role.permissions?.length || 0}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Last Used
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {role.lastUsedAt
                  ? new Date(role.lastUsedAt).toLocaleDateString()
                  : 'Never'}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {new Date(role.createdAt).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Assigned Users ({role.usersCount})
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Permissions ({role.permissions?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="mt-6">
          <AssignedUsersList
            roleId={roleId}
            onAssignMore={handleAssignUsers}
          />
        </TabsContent>
        
        <TabsContent value="permissions" className="mt-6">
          <PermissionsList
            permissions={role.permissions || []}
            isSystem={isSystem}
          />
        </TabsContent>
        
        <TabsContent value="history" className="mt-6">
          <RoleHistory roleId={roleId} />
        </TabsContent>
      </Tabs>
      
      {/* Assign Users Modal */}
      <AssignUsersModal
        open={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        roleId={roleId}
        roleName={role.name}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['role', roleId] });
          queryClient.invalidateQueries({ queryKey: ['role-users', roleId] });
          setIsAssignModalOpen(false);
        }}
      />
    </div>
  );
}

export const Route = createFileRoute('/dashboard/settings/roles-unified/$roleId')({
  component: RoleDetailsPage,
});
