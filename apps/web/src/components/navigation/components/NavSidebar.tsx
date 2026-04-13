// Enterprise navigation sidebar with hierarchical menu structure
import React, { useMemo, useState } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { cn } from '@/lib/cn';
import { useNavigation, NavigationItem } from '../providers/NavigationProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/components/providers/unified-context-provider';
import useWorkspaceStore from '@/store/workspace';
import { useRBACAuth } from '@/lib/permissions';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  MessageSquare,
  BarChart3,
  Settings,
  Calendar,
  Bell,
  FileText,
  Zap,
  ChevronDown,
  ChevronRight,
  Hash,
  Lock,
  Sparkles,
  Target,
  Clock,
  PlusCircle,
  Search,
} from 'lucide-react';

interface NavSidebarProps {
  isCollapsed: boolean;
  isMobile?: boolean;
  footer?: React.ReactNode;
  className?: string;
}

// Navigation menu configuration
const useNavigationItems = (): NavigationItem[] => {
  const { user } = useAuth();
  const { workspace } = useWorkspaceStore();
  const { hasPermission } = useRBACAuth();
  const location = useLocation();
  
  return useMemo(() => {
    const items: NavigationItem[] = [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        href: '/dashboard',
        isActive: location.pathname === '/dashboard',
      },
      
      // Projects section
      {
        id: 'projects',
        label: 'Projects',
        icon: FolderKanban,
        href: '/dashboard/projects',
        isActive: location.pathname.startsWith('/dashboard/projects') || 
                  location.pathname.includes('/project/'),
        badge: '3', // This would come from actual project count
        children: hasPermission('canCreateProjects') ? [
          {
            id: 'create-project',
            label: 'Create Project',
            icon: PlusCircle,
            href: '/dashboard/projects?action=create',
          }
        ] : [],
      },
      
      // Templates section
      {
        id: 'templates',
        label: 'Templates',
        icon: Sparkles,
        href: `/dashboard/workspace/${workspace?.id}/templates`,
        isActive: location.pathname.includes('/templates'),
        badge: undefined,
      },
      
      // Teams section
      {
        id: 'teams',
        label: 'Teams',
        icon: Users,
        href: '/dashboard/teams',
        isActive: location.pathname.startsWith('/dashboard/teams'),
        badge: workspace?.teamCount || undefined,
        permissions: ['canViewTeams'],
      },
      
      // Communication section
      {
        id: 'communication',
        label: 'Communication',
        icon: MessageSquare,
        children: [
          {
            id: 'chat',
            label: 'Team Chat',
            icon: Hash,
            href: '/dashboard/chat',
            isActive: location.pathname.startsWith('/dashboard/chat'),
            badge: '5', // Unread messages count
          },
          {
            id: 'video-calls',
            label: 'Video Calls',
            icon: Calendar,
            href: '/dashboard/video-calls',
            isActive: location.pathname.startsWith('/dashboard/video-calls'),
          },
        ],
      },
      
      // Analytics section
      {
        id: 'analytics',
        label: 'Analytics',
        icon: BarChart3,
        href: '/dashboard/analytics',
        isActive: location.pathname.startsWith('/dashboard/analytics'),
        permissions: ['canViewAnalytics'],
        children: [
          {
            id: 'project-analytics',
            label: 'Project Insights',
            icon: Target,
            href: '/dashboard/analytics/projects',
          },
          {
            id: 'team-analytics',
            label: 'Team Performance',
            icon: Users,
            href: '/dashboard/analytics/teams',
          },
          {
            id: 'workflow-analytics',
            label: 'Workflow Analytics',
            icon: Zap,
            href: '/dashboard/analytics/workflows',
          },
        ],
      },
      
      // Productivity tools
      {
        id: 'productivity',
        label: 'Productivity',
        icon: Zap,
        children: [
          {
            id: 'notifications',
            label: 'Notifications',
            icon: Bell,
            href: '/dashboard/notifications',
            isActive: location.pathname.startsWith('/dashboard/notifications'),
            badge: '12', // Unread notifications
          },
          {
            id: 'time-tracking',
            label: 'Time Tracking',
            icon: Clock,
            href: '/dashboard/time-tracking',
            isActive: location.pathname.startsWith('/dashboard/time-tracking'),
          },
          {
            id: 'documents',
            label: 'Documents',
            icon: FileText,
            href: '/dashboard/documents',
            isActive: location.pathname.startsWith('/dashboard/documents'),
          },
        ],
      },
    ];
    
    // Add settings at the bottom
    items.push({
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      href: '/dashboard/settings',
      isActive: location.pathname.startsWith('/dashboard/settings'),
      children: [
        {
          id: 'profile-settings',
          label: 'Profile',
          href: '/dashboard/settings/profile',
        },
        {
          id: 'workspace-settings',
          label: 'Workspace',
          href: `/dashboard/workspace-settings/${workspace?.id}`,
          permissions: ['canManageWorkspace'],
        },
        {
          id: 'security-settings',
          label: 'Security',
          href: '/dashboard/settings/security',
        },
        {
          id: 'integrations-settings',
          label: 'Integrations',
          href: '/dashboard/settings/integrations',
        },
      ].filter(item => !item.permissions || item.permissions.every(permission => hasPermission(permission))),
    });
    
    // Filter items based on permissions
    return items.filter(item => {
      if (!item.permissions) return true;
      return item.permissions.every(permission => hasPermission(permission));
    });
  }, [location.pathname, workspace, hasPermission, user]);
};

// Individual navigation item component
interface NavItemProps {
  item: NavigationItem;
  isCollapsed: boolean;
  level?: number;
  onItemClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ 
  item, 
  isCollapsed, 
  level = 0,
  onItemClick 
}) => {
  const [isOpen, setIsOpen] = useState(item.isActive || false);
  const hasChildren = item.children && item.children.length > 0;
  const Icon = item.icon;
  const isNested = level > 0;
  
  const itemClasses = cn(
    'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
    'hover:bg-accent hover:text-accent-foreground',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    item.isActive && 'bg-accent text-accent-foreground shadow-sm',
    isNested && 'ml-6 px-2 py-1.5',
    isCollapsed && !isNested && 'justify-center px-2'
  );
  
  const content = (
    <>
      {Icon && (
        <Icon className={cn(
          'flex-shrink-0 transition-transform duration-200',
          isCollapsed && !isNested ? 'h-5 w-5' : 'h-4 w-4',
          item.isActive && 'text-accent-foreground'
        )} />
      )}
      
      {!isCollapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          
          {/* Badge */}
          {item.badge && (
            <Badge 
              variant={item.isActive ? "secondary" : "outline"} 
              className="h-5 px-1.5 text-xs"
            >
              {item.badge}
            </Badge>
          )}
          
          {/* Expand/collapse icon */}
          {hasChildren && (
            <ChevronDown className={cn(
              'h-3 w-3 transition-transform duration-200',
              isOpen && 'rotate-180'
            )} />
          )}
        </>
      )}
    </>
  );
  
  // Handle click for items with children
  const handleClick = () => {
    if (hasChildren && !isCollapsed) {
      setIsOpen(!isOpen);
    }
    onItemClick?.();
  };
  
  const itemElement = item.href ? (
    <Link
      to={item.href}
      className={itemClasses}
      onClick={onItemClick}
      aria-current={item.isActive ? 'page' : undefined}
    >
      {content}
    </Link>
  ) : (
    <button
      onClick={handleClick}
      className={itemClasses}
      aria-expanded={hasChildren ? isOpen : undefined}
      aria-haspopup={hasChildren ? 'menu' : undefined}
    >
      {content}
    </button>
  );
  
  // Wrap in tooltip if collapsed
  const wrappedElement = isCollapsed && !isNested ? (
    <Tooltip>
      <TooltipTrigger asChild>
        {itemElement}
      </TooltipTrigger>
      <TooltipContent side="right" className="flex items-center gap-2">
        {item.label}
        {item.badge && (
          <Badge variant="outline" className="h-4 px-1 text-xs">
            {item.badge}
          </Badge>
        )}
      </TooltipContent>
    </Tooltip>
  ) : itemElement;
  
  return (
    <div>
      {wrappedElement}
      
      {/* Children */}
      {hasChildren && !isCollapsed && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleContent className="space-y-1 mt-1">
            {item.children?.map((child) => (
              <NavItem
                key={child.id}
                item={child}
                isCollapsed={false}
                level={level + 1}
                onItemClick={onItemClick}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};

// Workspace selector component
const WorkspaceSelector: React.FC<{ isCollapsed: boolean }> = ({ isCollapsed }) => {
  const { workspace } = useWorkspaceStore();
  
  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary text-primary-foreground font-semibold text-lg">
            {workspace?.name?.charAt(0)?.toUpperCase() || 'W'}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          {workspace?.name || 'Workspace'}
        </TooltipContent>
      </Tooltip>
    );
  }
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
      <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary text-primary-foreground font-semibold">
        {workspace?.name?.charAt(0)?.toUpperCase() || 'W'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">
          {workspace?.name || 'Default Workspace'}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {workspace?.description || 'No description'}
        </p>
      </div>
    </div>
  );
};

// Main sidebar component
export const NavSidebar: React.FC<NavSidebarProps> = ({
  isCollapsed,
  isMobile = false,
  footer,
  className,
}) => {
  const navigationItems = useNavigationItems();
  const { setMobileOpen } = useNavigation();
  
  const handleItemClick = () => {
    if (isMobile) {
      setMobileOpen(false);
    }
  };
  
  return (
    <TooltipProvider>
      <div className={cn('flex flex-col h-full bg-background', className)}>
        {/* Workspace Header */}
        <div className={cn('p-4 border-b border-border', isCollapsed && 'px-2')}>
          <WorkspaceSelector isCollapsed={isCollapsed} />
        </div>
        
        {/* Navigation Menu */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1" role="navigation" aria-label="Main navigation">
            {navigationItems.map((item) => (
              <NavItem
                key={item.id}
                item={item}
                isCollapsed={isCollapsed}
                onItemClick={handleItemClick}
              />
            ))}
          </nav>
        </ScrollArea>
        
        {/* Footer */}
        {footer && (
          <>
            <Separator />
            <div className="p-4">
              {footer}
            </div>
          </>
        )}
        
        {/* Default Footer */}
        {!footer && !isCollapsed && (
          <>
            <Separator />
            <div className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                <span>Meridian v2.0</span>
              </div>
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  );
};

export default NavSidebar;