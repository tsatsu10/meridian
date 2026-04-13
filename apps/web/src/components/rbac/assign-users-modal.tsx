/**
 * 👥 Assign Users Modal Component
 * 
 * Modal for assigning users to a role with bulk support.
 * 
 * @phase Phase-3-Week-9
 */

import { useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { API_BASE_URL, API_URL } from '@/constants/urls';
import { toast } from 'sonner';
import { Search, Users, Loader2 } from 'lucide-react';
import useWorkspaceStore from '@/store/workspace';
import getWorkspaceUsers from '@/fetchers/workspace-user/get-workspace-users';

// ==========================================
// TYPES
// ==========================================

interface AssignUsersModalProps {
  open: boolean;
  onClose: () => void;
  roleId: string;
  roleName: string;
  onSuccess?: () => void;
}

// ==========================================
// COMPONENT
// ==========================================

export function AssignUsersModal({
  open,
  onClose,
  roleId,
  roleName,
  onSuccess,
}: AssignUsersModalProps) {
  const { workspace } = useWorkspaceStore();
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  
  // Fetch real workspace users
  const { data: workspaceUsersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['workspace-users', workspace?.id],
    queryFn: () => getWorkspaceUsers({ param: { workspaceId: workspace!.id } }),
    enabled: !!workspace?.id && open,
  });
  
  // Map API response to user list
  const allUsers = workspaceUsersData?.users || [];
  
  // Assign users mutation
  const assignMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE_URL}/roles/assign/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userIds: selectedUsers,
          roleId,
          reason: reason || undefined,
          notes: notes || undefined,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign users');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      const { successful, failed } = data.result;
      
      if (failed.length === 0) {
        toast.success(`Successfully assigned ${successful.length} user(s) to ${roleName}`);
      } else {
        toast.warning(
          `Assigned ${successful.length} user(s). Failed to assign ${failed.length} user(s).`
        );
      }
      
      onSuccess?.();
      handleClose();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
  
  const handleClose = () => {
    setSelectedUsers([]);
    setSearch('');
    setReason('');
    setNotes('');
    onClose();
  };
  
  const handleToggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };
  
  const handleSelectAll = () => {
    const filtered = filteredUsers.map(u => u.id);
    setSelectedUsers(filtered);
  };
  
  const handleClearAll = () => {
    setSelectedUsers([]);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one user');
      return;
    }
    
    assignMutation.mutate();
  };
  
  const filteredUsers = allUsers.filter((user: any) =>
    search === '' ||
    user.name.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase())
  );
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assign Users to {roleName}</DialogTitle>
          <DialogDescription>
            Select users to assign this role to. Selected users will gain all permissions associated with this role.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Search */}
            <div className="space-y-2">
              <Label>Search Users</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* User Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Select Users ({selectedUsers.length} selected)</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAll}
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                  >
                    Clear
                  </Button>
                </div>
              </div>
              
              <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                {isLoadingUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading users...</span>
                  </div>
                ) : filteredUsers.map((user: any) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                    onClick={() => handleToggleUser(user.id)}
                  >
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={() => handleToggleUser(user.id)}
                    />
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium">
                        {user.name.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{user.name}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {user.email}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {filteredUsers.length === 0 && (
                <div className="text-center py-8 border rounded-lg">
                  <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No users found matching "{search}"
                  </p>
                </div>
              )}
            </div>
            
            {/* Selected Users Preview */}
            {selectedUsers.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Users</Label>
                <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/50">
                  {selectedUsers.map((userId) => {
                    const user = allUsers.find((u: any) => u.id === userId);
                    return (
                      <Badge key={userId} variant="secondary">
                        {user?.name}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Input
                id="reason"
                placeholder="e.g., New team member onboarding"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            
            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about this assignment..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={assignMutation.isPending || selectedUsers.length === 0}
            >
              {assignMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Assign {selectedUsers.length} User{selectedUsers.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

