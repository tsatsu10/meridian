/**
 * 🔧 Permission Builder Component
 * 
 * Interactive permission selector with categories.
 * Supports search and bulk selection.
 * 
 * @phase Phase-3-Week-8
 */

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Check, 
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

// ==========================================
// TYPES
// ==========================================

interface PermissionBuilderProps {
  selectedPermissions: string[];
  allPermissions: string[];
  onChange: (permissions: string[]) => void;
  disabled?: boolean;
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
  
  return categories;
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

export function PermissionBuilder({
  selectedPermissions,
  allPermissions,
  onChange,
  disabled = false,
}: PermissionBuilderProps) {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['workspace', 'project', 'task'])
  );
  
  // Categorize permissions
  const categories = useMemo(
    () => categorizePermissions(allPermissions),
    [allPermissions]
  );
  
  // Filter by search
  const filteredCategories = useMemo(() => {
    if (!search) return categories;
    
    const searchLower = search.toLowerCase();
    const filtered: Record<string, string[]> = {};
    
    Object.entries(categories).forEach(([category, perms]) => {
      const matchingPerms = perms.filter(p => 
        p.toLowerCase().includes(searchLower)
      );
      if (matchingPerms.length > 0) {
        filtered[category] = matchingPerms;
      }
    });
    
    return filtered;
  }, [categories, search]);
  
  const handleTogglePermission = (permission: string) => {
    if (disabled) return;
    
    const isSelected = selectedPermissions.includes(permission);
    if (isSelected) {
      onChange(selectedPermissions.filter(p => p !== permission));
    } else {
      onChange([...selectedPermissions, permission]);
    }
  };
  
  const handleToggleCategory = (category: string) => {
    if (disabled) return;
    
    const categoryPerms = categories[category] || [];
    const allSelected = categoryPerms.every(p => selectedPermissions.includes(p));
    
    if (allSelected) {
      // Deselect all in category
      onChange(selectedPermissions.filter(p => !categoryPerms.includes(p)));
    } else {
      // Select all in category
      const newPerms = new Set([...selectedPermissions, ...categoryPerms]);
      onChange(Array.from(newPerms));
    }
  };
  
  const toggleCategoryExpansion = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };
  
  const handleSelectAll = () => {
    if (disabled) return;
    onChange(allPermissions);
  };
  
  const handleClearAll = () => {
    if (disabled) return;
    onChange([]);
  };
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">
            {selectedPermissions.length} of {allPermissions.length} permissions selected
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={disabled}
          >
            <Check className="h-4 w-4 mr-1" />
            Select All
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            disabled={disabled}
          >
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        </div>
      </div>
      
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search permissions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
          disabled={disabled}
        />
      </div>
      
      {/* Permission Categories */}
      <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
        {Object.entries(filteredCategories).map(([category, perms]) => {
          const isExpanded = expandedCategories.has(category);
          const selectedInCategory = perms.filter(p => selectedPermissions.includes(p)).length;
          const allSelected = selectedInCategory === perms.length;
          const someSelected = selectedInCategory > 0 && !allSelected;
          
          return (
            <div key={category} className="p-3">
              {/* Category Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => toggleCategoryExpansion(category)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() => handleToggleCategory(category)}
                    disabled={disabled}
                    className={someSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                  />
                  
                  <Label
                    htmlFor={category}
                    className="font-semibold cursor-pointer flex-1"
                    onClick={() => toggleCategoryExpansion(category)}
                  >
                    {getCategoryLabel(category)}
                  </Label>
                  
                  <Badge variant="secondary">
                    {selectedInCategory}/{perms.length}
                  </Badge>
                </div>
              </div>
              
              {/* Category Permissions */}
              {isExpanded && (
                <div className="ml-8 space-y-2 mt-2">
                  {perms.map((permission) => (
                    <div key={permission} className="flex items-center gap-2">
                      <Checkbox
                        id={permission}
                        checked={selectedPermissions.includes(permission)}
                        onCheckedChange={() => handleTogglePermission(permission)}
                        disabled={disabled}
                      />
                      <Label
                        htmlFor={permission}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {permission}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Empty State */}
      {Object.keys(filteredCategories).length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No permissions found matching "{search}"</p>
        </div>
      )}
    </div>
  );
}

