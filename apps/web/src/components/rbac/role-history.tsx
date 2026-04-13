/**
 * 📜 Role History Component
 * 
 * Displays audit log of role-related changes.
 * 
 * @phase Phase-3-Week-9
 */

import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL, API_URL } from '@/constants/urls';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, UserPlus, UserMinus, Shield, AlertCircle } from 'lucide-react';

// ==========================================
// TYPES
// ==========================================

interface HistoryEntry {
  action: string;
  roleId: string;
  roleName?: string;
  timestamp: Date;
  changedBy: string;
  reason: string | null;
}

interface RoleHistoryProps {
  roleId: string;
}

// ==========================================
// HELPERS
// ==========================================

function getActionIcon(action: string) {
  switch (action) {
    case 'role_assigned':
      return <UserPlus className="h-4 w-4 text-green-500" />;
    case 'role_removed':
      return <UserMinus className="h-4 w-4 text-red-500" />;
    case 'role_created':
    case 'role_updated':
      return <Shield className="h-4 w-4 text-blue-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  }
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    role_created: 'Role Created',
    role_updated: 'Role Updated',
    role_deleted: 'Role Deleted',
    role_assigned: 'Role Assigned',
    role_removed: 'Role Removed',
  };
  return labels[action] || action;
}

function getActionBadgeVariant(action: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (action) {
    case 'role_assigned':
    case 'role_created':
      return 'default';
    case 'role_updated':
      return 'secondary';
    case 'role_removed':
    case 'role_deleted':
      return 'destructive';
    default:
      return 'outline';
  }
}

// ==========================================
// COMPONENT
// ==========================================

export function RoleHistory({ roleId }: RoleHistoryProps) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['role-history', roleId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/roles/${roleId}/history`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch role history');
      }
      const data = await response.json();
      
      // Map API response to HistoryEntry format
      return (data.history || []).map((entry: any) => ({
        id: entry.id,
        action: entry.action,
        performedBy: entry.performedByName || entry.performedByEmail || 'Unknown',
        performedAt: entry.createdAt,
        changes: entry.changes,
        reason: entry.reason,
      })) as HistoryEntry[];
    },
  });
  
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
        <p className="mt-2 text-muted-foreground">Loading history...</p>
      </div>
    );
  }
  
  if (!history || history.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No history yet</h3>
          <p className="text-muted-foreground">
            Role activity will appear here as users are assigned or role settings change
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      {history.map((entry, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="mt-1">
                {getActionIcon(entry.action)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={getActionBadgeVariant(entry.action)}>
                    {getActionLabel(entry.action)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    by {entry.changedBy}
                  </span>
                </div>
                
                {entry.reason && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {entry.reason}
                  </p>
                )}
                
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(entry.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

