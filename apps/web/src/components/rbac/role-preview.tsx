/**
 * 👁️ Role Preview Component
 * 
 * Shows a preview of the role with its permissions.
 * Displays analysis and similar roles.
 * 
 * @phase Phase-3-Week-8
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Check, X, AlertCircle } from 'lucide-react';

// ==========================================
// TYPES
// ==========================================

interface RolePreviewProps {
  name: string;
  description: string;
  color: string;
  permissions: string[];
  allPermissions: string[];
}

// ==========================================
// HELPERS
// ==========================================

function analyzePermissions(selected: string[], all: string[]) {
  const canCreate = selected.some(p => p.includes('create'));
  const canEdit = selected.some(p => p.includes('edit'));
  const canDelete = selected.some(p => p.includes('delete'));
  const canView = selected.some(p => p.includes('view'));
  const canManage = selected.some(p => p.includes('manage'));
  
  const coverage = (selected.length / all.length) * 100;
  
  let level = 'Limited';
  if (coverage > 80) level = 'Administrator';
  else if (coverage > 50) level = 'Manager';
  else if (coverage > 25) level = 'Contributor';
  else if (coverage > 0) level = 'Viewer';
  
  return {
    canCreate,
    canEdit,
    canDelete,
    canView,
    canManage,
    coverage,
    level,
  };
}

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

// ==========================================
// COMPONENT
// ==========================================

export function RolePreview({
  name,
  description,
  color,
  permissions,
  allPermissions,
}: RolePreviewProps) {
  const analysis = analyzePermissions(permissions, allPermissions);
  const categorized = categorizePermissions(permissions);
  
  return (
    <div className="space-y-4">
      {/* Role Card Preview */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <CardTitle className="text-lg">
              {name || 'Untitled Role'}
            </CardTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {description || 'No description'}
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {permissions.length} {permissions.length === 1 ? 'permission' : 'permissions'}
            </span>
          </div>
        </CardContent>
      </Card>
      
      {/* Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permission Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm">
              {analysis.canCreate ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-muted-foreground" />
              )}
              <span>Can create content</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              {analysis.canEdit ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-muted-foreground" />
              )}
              <span>Can edit content</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              {analysis.canDelete ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-muted-foreground" />
              )}
              <span>Can delete content</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              {analysis.canView ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-muted-foreground" />
              )}
              <span>Can view content</span>
            </div>
          </div>
          
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Permission Coverage</span>
              <span className="font-medium">{analysis.coverage.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${analysis.coverage}%` }}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2 pt-2">
            <Badge variant="secondary">{analysis.level} Level</Badge>
            {analysis.coverage > 80 && (
              <div className="flex items-center gap-1 text-xs text-amber-600">
                <AlertCircle className="h-3 w-3" />
                <span>High privilege role</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Permissions by Category */}
      {permissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Permissions by Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categorized.map(([category, perms]) => (
              <div key={category}>
                <p className="text-sm font-medium mb-1 capitalize">{category}</p>
                <div className="flex flex-wrap gap-1">
                  {perms.map(perm => (
                    <Badge key={perm} variant="outline" className="text-xs">
                      {perm.split('.')[1] || perm}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      
      {/* Empty State */}
      {permissions.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No permissions selected</p>
            <p className="text-xs mt-1">Go to the Permissions tab to add permissions</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

