/**
 * 🎴 Role Card Component
 * 
 * Displays a role with its information and actions.
 * Supports both system and custom roles.
 * 
 * @phase Phase-3-Week-7
 */

import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Users,
  Eye,
  Crown,
  Shield,
} from 'lucide-react';

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
}

interface RoleCardProps {
  role: Role;
  onEdit?: (role: Role) => void;
  onDelete?: (roleId: string) => void;
  onClone?: (role: Role) => void;
  onViewDetails?: (roleId: string) => void;
}

// ==========================================
// COMPONENT
// ==========================================

export function RoleCard({
  role,
  onEdit,
  onDelete,
  onClone,
  onViewDetails,
}: RoleCardProps) {
  const isSystem = role.type === 'system';
  
  return (
    <Card 
      className="hover:shadow-lg transition-shadow cursor-pointer group"
      onClick={() => onViewDetails?.(role.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1">
            <div
              className="h-3 w-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: role.color }}
            />
            <CardTitle className="text-lg line-clamp-1">
              {role.name}
            </CardTitle>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onViewDetails?.(role.id);
              }}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              
              {!isSystem && onEdit && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onEdit(role);
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Role
                </DropdownMenuItem>
              )}
              
              {onClone && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onClone(role);
                }}>
                  <Copy className="h-4 w-4 mr-2" />
                  Clone Role
                </DropdownMenuItem>
              )}
              
              {!isSystem && onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(role.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Role
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <CardDescription className="line-clamp-2 min-h-[2.5rem]">
          {role.description || 'No description'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Type Badge */}
        <div className="flex items-center gap-2">
          <Badge variant={isSystem ? 'secondary' : 'default'} className="flex items-center gap-1">
            {isSystem ? (
              <>
                <Crown className="h-3 w-3" />
                System
              </>
            ) : (
              <>
                <Shield className="h-3 w-3" />
                Custom
              </>
            )}
          </Badge>
          
          {!role.isActive && (
            <Badge variant="outline" className="text-muted-foreground">
              Inactive
            </Badge>
          )}
        </div>
        
        {/* Users Count */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>
            {role.usersCount === 0 && 'No users assigned'}
            {role.usersCount === 1 && '1 user assigned'}
            {role.usersCount > 1 && `${role.usersCount} users assigned`}
          </span>
        </div>
        
        {/* Last Used */}
        {role.lastUsedAt && (
          <div className="text-xs text-muted-foreground">
            Last used {new Date(role.lastUsedAt).toLocaleDateString()}
          </div>
        )}
        
        {/* System Role Note */}
        {isSystem && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Built-in role • Cannot be deleted
          </div>
        )}
      </CardContent>
    </Card>
  );
}

