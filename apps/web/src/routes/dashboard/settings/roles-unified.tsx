/**
 * 🛡️ Unified Roles & Permissions Page
 * 
 * Main page for managing both system and custom roles.
 * Replaces old team-management.tsx and role-permissions.tsx.
 * 
 * @phase Phase-3-Week-7
 */

import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '@/constants/urls';
import { withErrorBoundary } from "@/components/dashboard/universal-error-boundary";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  Filter,
  Users,
  Shield,
  Crown,
  Eye,
} from 'lucide-react';
import { RoleCard } from '@/components/rbac/role-card';
import { RoleModal } from '@/components/rbac/role-modal';
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
  usersCount: number;
  lastUsedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
}

interface RoleFilters {
  type: 'all' | 'system' | 'custom';
  search: string;
  status: 'all' | 'active' | 'inactive';
}

// ==========================================
// MAIN COMPONENT
// ==========================================

function UnifiedRolesPage() {
  const queryClient = useQueryClient();
  
  // State
  const [filters, setFilters] = useState<RoleFilters>({
    type: 'all',
    search: '',
    status: 'active',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  
  // Fetch roles
  const { data: rolesData, isLoading } = useQuery({
    queryKey: ['roles', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.type !== 'all') params.append('type', filters.type);
      if (filters.status === 'active') params.append('isActive', 'true');
      if (filters.status === 'inactive') params.append('isActive', 'false');
      
      const response = await fetch(
        `${API_BASE_URL}/roles?${params.toString()}`,
        { credentials: 'include' }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch roles');
      }
      
      const data = await response.json();
      return data.roles as Role[];
    },
  });
  
  // Filter roles client-side for search
  const filteredRoles = rolesData?.filter(role =>
    filters.search === '' ||
    role.name.toLowerCase().includes(filters.search.toLowerCase()) ||
    role.description?.toLowerCase().includes(filters.search.toLowerCase())
  ) || [];
  
  // Separate system and custom roles
  const systemRoles = filteredRoles.filter(r => r.type === 'system');
  const customRoles = filteredRoles.filter(r => r.type === 'custom');
  
  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
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
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
  
  // Clone role mutation
  const cloneRoleMutation = useMutation({
    mutationFn: async ({ roleId, newName }: { roleId: string; newName: string }) => {
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
  
  // Handlers
  const handleCreateRole = () => {
    setSelectedRole(null);
    setIsModalOpen(true);
  };
  
  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setIsModalOpen(true);
  };
  
  const handleDeleteRole = (roleId: string) => {
    if (confirm('Are you sure you want to delete this role?')) {
      deleteRoleMutation.mutate(roleId);
    }
  };
  
  const handleCloneRole = (role: Role) => {
    const newName = prompt(`Clone "${role.name}" as:`, `${role.name} (Copy)`);
    if (newName) {
      cloneRoleMutation.mutate({ roleId: role.id, newName });
    }
  };
  
  const handleViewDetails = (roleId: string) => {
    window.location.href = `/dashboard/settings/roles/${roleId}`;
  };
  
  // Stats
  const stats = {
    total: filteredRoles.length,
    system: systemRoles.length,
    custom: customRoles.length,
    totalUsers: filteredRoles.reduce((sum, role) => sum + role.usersCount, 0),
  };
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Roles & Permissions
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage system roles and create custom roles for your organization
          </p>
        </div>
        
        <Button onClick={handleCreateRole} size="lg">
          <Plus className="h-4 w-4 mr-2" />
          Create Role
        </Button>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Shield className="h-4 w-4" />
            <span className="text-sm">Total Roles</span>
          </div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Crown className="h-4 w-4" />
            <span className="text-sm">System Roles</span>
          </div>
          <div className="text-2xl font-bold">{stats.system}</div>
        </div>
        
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Eye className="h-4 w-4" />
            <span className="text-sm">Custom Roles</span>
          </div>
          <div className="text-2xl font-bold">{stats.custom}</div>
        </div>
        
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="h-4 w-4" />
            <span className="text-sm">Total Assignments</span>
          </div>
          <div className="text-2xl font-bold">{stats.totalUsers}</div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search roles..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="pl-10"
          />
        </div>
        
        <Select
          value={filters.type}
          onValueChange={(value) => setFilters(prev => ({ ...prev, type: value as any }))}
        >
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="system">System Roles</SelectItem>
            <SelectItem value="custom">Custom Roles</SelectItem>
          </SelectContent>
        </Select>
        
        <Select
          value={filters.status}
          onValueChange={(value) => setFilters(prev => ({ ...prev, status: value as any }))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-2 text-muted-foreground">Loading roles...</p>
        </div>
      )}
      
      {/* System Roles Section */}
      {!isLoading && systemRoles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-purple-500" />
            <h2 className="text-xl font-semibold">System Roles</h2>
            <span className="text-sm text-muted-foreground">
              ({systemRoles.length} roles)
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemRoles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                onEdit={handleEditRole}
                onDelete={handleDeleteRole}
                onClone={handleCloneRole}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Custom Roles Section */}
      {!isLoading && customRoles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            <h2 className="text-xl font-semibold">Custom Roles</h2>
            <span className="text-sm text-muted-foreground">
              ({customRoles.length} roles)
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customRoles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                onEdit={handleEditRole}
                onDelete={handleDeleteRole}
                onClone={handleCloneRole}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Empty State */}
      {!isLoading && filteredRoles.length === 0 && (
        <div className="text-center py-12">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No roles found</h3>
          <p className="text-muted-foreground mb-4">
            {filters.search ? 'Try adjusting your search criteria' : 'Get started by creating your first custom role'}
          </p>
          {!filters.search && (
            <Button onClick={handleCreateRole}>
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          )}
        </div>
      )}
      
      {/* Role Modal */}
      <RoleModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRole(null);
        }}
        role={selectedRole}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['roles'] });
          setIsModalOpen(false);
          setSelectedRole(null);
        }}
      />
    </div>
  );
}

export const Route = createFileRoute('/dashboard/settings/roles-unified')({
  component: withErrorBoundary(UnifiedRolesPage, "Roles & Permissions"),
});
