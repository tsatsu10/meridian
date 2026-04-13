/**
 * 👥 Assigned Users List Component
 * 
 * Displays users assigned to a role with management actions.
 * 
 * @phase Phase-3-Week-9
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '@/constants/urls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, MoreVertical, UserMinus, UserPlus, Mail } from 'lucide-react';
import { toast } from 'sonner';

// ==========================================
// TYPES
// ==========================================

interface AssignedUser {
  userId: string;
  assignmentId: string;
  assignedAt: Date;
  assignedBy: string;
}

interface AssignedUsersListProps {
  roleId: string;
  onAssignMore: () => void;
}

// ==========================================
// COMPONENT
// ==========================================

export function AssignedUsersList({ roleId, onAssignMore }: AssignedUsersListProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  
  // Fetch assigned users
  const { data: users, isLoading } = useQuery({
    queryKey: ['role-users', roleId],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/roles/assignments?roleId=${roleId}`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      return data.assignments as AssignedUser[];
    },
  });
  
  // Remove assignment mutation
  const removeAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const response = await fetch(
        `${API_BASE_URL}/roles/assignments/${assignmentId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove assignment');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-users', roleId] });
      queryClient.invalidateQueries({ queryKey: ['role', roleId] });
      toast.success('User removed from role');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
  
  const handleRemoveUser = (assignmentId: string) => {
    if (confirm('Are you sure you want to remove this user from the role?')) {
      removeAssignmentMutation.mutate(assignmentId);
    }
  };
  
  const filteredUsers = users?.filter((user) =>
    search === '' ||
    user.userId.toLowerCase().includes(search.toLowerCase())
  ) || [];
  
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
        <p className="mt-2 text-muted-foreground">Loading users...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Button onClick={onAssignMore}>
          <UserPlus className="h-4 w-4 mr-2" />
          Assign Users
        </Button>
      </div>
      
      {/* Users Table */}
      {filteredUsers.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Assigned Date</TableHead>
                <TableHead>Assigned By</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.assignmentId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {user.userId.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{user.userId}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          user@example.com
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(user.assignedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.assignedBy}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleRemoveUser(user.assignmentId)}
                        >
                          <UserMinus className="h-4 w-4 mr-2" />
                          Remove from Role
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg">
          <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No users assigned</h3>
          <p className="text-muted-foreground mb-4">
            {search ? 'No users match your search' : 'Get started by assigning users to this role'}
          </p>
          {!search && (
            <Button onClick={onAssignMore}>
              <UserPlus className="h-4 w-4 mr-2" />
              Assign Users
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

