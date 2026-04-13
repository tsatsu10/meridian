/**
 * 📋 Permissions List Component
 * 
 * Displays permissions grouped by category.
 * 
 * @phase Phase-3-Week-9
 */

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Shield, Lock } from 'lucide-react';

// ==========================================
// TYPES
// ==========================================

interface PermissionsListProps {
  permissions: string[];
  isSystem: boolean;
}

// ==========================================
// HELPERS
// ==========================================

function categorizePermissions(permissions: string[]) {
  const categories: Record<string, string[]> = {};
  
  permissions.forEach(permission => {
    const parts = permission.split('.');
    const category = parts[0] || 'other';
    
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(permission);
  });
  
  return Object.entries(categories).sort((a, b) => a[0].localeCompare(b[0]));
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    workspace: 'Workspace',
    project: 'Projects',
    task: 'Tasks',
    user: 'Users',
    file: 'Files',
    report: 'Reports',
    settings: 'Settings',
    role: 'Roles',
    other: 'Other',
  };
  return labels[category] || category.charAt(0).toUpperCase() + category.slice(1);
}

// ==========================================
// COMPONENT
// ==========================================

export function PermissionsList({ permissions, isSystem }: PermissionsListProps) {
  const categorized = categorizePermissions(permissions);
  
  if (permissions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No permissions</h3>
          <p className="text-muted-foreground">
            This role has no permissions assigned
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      {isSystem && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-600" />
              <CardTitle className="text-base text-amber-900 dark:text-amber-100">
                System Role
              </CardTitle>
            </div>
            <CardDescription className="text-amber-700 dark:text-amber-200">
              Permissions for system roles are managed by the application and cannot be modified.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categorized.map(([category, perms]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {getCategoryLabel(category)}
              </CardTitle>
              <CardDescription>
                {perms.length} permission{perms.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {perms.map((perm) => (
                  <div
                    key={perm}
                    className="flex items-center justify-between p-2 rounded border bg-card"
                  >
                    <span className="text-sm font-mono">{perm}</span>
                    <Badge variant="outline" className="text-xs">
                      {perm.split('.')[1] || 'all'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permission Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold">{permissions.length}</div>
              <div className="text-sm text-muted-foreground">Total Permissions</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{categorized.length}</div>
              <div className="text-sm text-muted-foreground">Categories</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {permissions.filter(p => p.includes('view')).length}
              </div>
              <div className="text-sm text-muted-foreground">View Permissions</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {permissions.filter(p => p.includes('edit') || p.includes('create') || p.includes('delete')).length}
              </div>
              <div className="text-sm text-muted-foreground">Modify Permissions</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

