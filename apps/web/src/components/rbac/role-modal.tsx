/**
 * 🎭 Role Modal Component
 * 
 * Modal for creating and editing roles.
 * Includes permission builder and template selector.
 * 
 * @phase Phase-3-Week-8
 */

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { API_BASE_URL, API_URL } from '@/constants/urls';
import { toast } from 'sonner';
import { PermissionBuilder } from './permission-builder';
import { RolePreview } from './role-preview';
import { Loader2 } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspace-store';

// ==========================================
// TYPES
// ==========================================

interface Role {
  id: string;
  name: string;
  description: string | null;
  type: 'system' | 'custom';
  color: string;
  permissions?: string[];
}

interface RoleModalProps {
  open: boolean;
  onClose: () => void;
  role?: Role | null;
  onSuccess?: () => void;
}

// Color options
const COLORS = [
  { value: '#EF4444', label: 'Red' },
  { value: '#F97316', label: 'Orange' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#10B981', label: 'Green' },
  { value: '#14B8A6', label: 'Teal' },
  { value: '#3B82F6', label: 'Blue' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#EC4899', label: 'Pink' },
  { value: '#6B7280', label: 'Gray' },
];

// ==========================================
// COMPONENT
// ==========================================

export function RoleModal({ open, onClose, role, onSuccess }: RoleModalProps) {
  const isEditing = !!role;
  const isSystemRole = role?.type === 'system';
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#10B981',
    permissions: [] as string[],
    baseRoleId: '',
  });
  
  // Get workspace ID from context ✅
  const { workspace } = useWorkspaceStore();
  const workspaceId = workspace?.id || '';
  
  // Reset form when role changes
  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name,
        description: role.description || '',
        color: role.color,
        permissions: role.permissions || [],
        baseRoleId: '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        color: '#10B981',
        permissions: [],
        baseRoleId: '',
      });
    }
  }, [role]);
  
  // Fetch all permissions
  const { data: allPermissions } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/roles/permissions/all`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch permissions');
      const data = await response.json();
      return data.permissions as string[];
    },
  });
  
  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = isEditing
        ? `${API_BASE_URL}/roles/${role.id}`
        : `${API_BASE_URL}/roles`;
      
      const method = isEditing ? 'PUT' : 'POST';
      
      const body = isEditing
        ? {
            name: formData.name,
            description: formData.description,
            color: formData.color,
            permissions: formData.permissions,
          }
        : {
            name: formData.name,
            description: formData.description,
            color: formData.color,
            permissions: formData.permissions,
            workspaceId,
          };
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save role');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast.success(isEditing ? 'Role updated successfully' : 'Role created successfully');
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      toast.error('Role name is required');
      return;
    }
    
    if (formData.permissions.length === 0) {
      toast.error('At least one permission is required');
      return;
    }
    
    saveMutation.mutate();
  };
  
  const handlePermissionsChange = (permissions: string[]) => {
    setFormData(prev => ({ ...prev, permissions }));
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Edit Role: ${role.name}` : 'Create New Role'}
          </DialogTitle>
          <DialogDescription>
            {isSystemRole
              ? 'System roles cannot be modified. You can only view their permissions.'
              : isEditing
              ? 'Update the role details and permissions.'
              : 'Create a custom role with specific permissions for your team.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            
            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Role Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Senior Developer"
                  disabled={isSystemRole}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the role's purpose and responsibilities..."
                  rows={3}
                  disabled={isSystemRole}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <div className="flex items-center gap-2">
                  <div
                    className="h-10 w-10 rounded border"
                    style={{ backgroundColor: formData.color }}
                  />
                  <Select
                    value={formData.color}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}
                    disabled={isSystemRole}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLORS.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-4 w-4 rounded border"
                              style={{ backgroundColor: color.value }}
                            />
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {!isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="baseRole">Start from Template (Optional)</Label>
                  <Select
                    value={formData.baseRoleId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, baseRoleId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Start from scratch</SelectItem>
                      <SelectItem value="template-viewer">Viewer Template</SelectItem>
                      <SelectItem value="template-contributor">Contributor Template</SelectItem>
                      <SelectItem value="template-manager">Manager Template</SelectItem>
                      <SelectItem value="template-administrator">Administrator Template</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </TabsContent>
            
            {/* Permissions Tab */}
            <TabsContent value="permissions" className="py-4">
              <PermissionBuilder
                selectedPermissions={formData.permissions}
                allPermissions={allPermissions || []}
                onChange={handlePermissionsChange}
                disabled={isSystemRole}
              />
            </TabsContent>
            
            {/* Preview Tab */}
            <TabsContent value="preview" className="py-4">
              <RolePreview
                name={formData.name}
                description={formData.description}
                color={formData.color}
                permissions={formData.permissions}
                allPermissions={allPermissions || []}
              />
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {!isSystemRole && (
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {isEditing ? 'Update Role' : 'Create Role'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

