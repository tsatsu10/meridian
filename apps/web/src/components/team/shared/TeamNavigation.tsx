import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Settings, 
  Shield, 
  Layout, 
  BarChart3,
  UserPlus,
  ArrowLeft,
  ExternalLink,
  ChevronRight,
  Home
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationItem {
  key: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  href: string;
  badge?: string | number;
  external?: boolean;
  disabled?: boolean;
}

interface TeamNavigationProps {
  currentPage?: 'teams' | 'team-management' | 'role-permissions' | 'components-features' | 'analytics';
  workspaceId?: string;
  showBreadcrumbs?: boolean;
  showDescriptions?: boolean;
  variant?: 'tabs' | 'buttons' | 'breadcrumbs' | 'sidebar';
  className?: string;
}

interface BreadcrumbsProps {
  items: Array<{
    label: string;
    href?: string;
    current?: boolean;
  }>;
  className?: string;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className }) => {
  const navigate = useNavigate();

  return (
    <nav className={cn("flex items-center space-x-2 text-sm", className)}>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
          {item.current ? (
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {item.label}
            </span>
          ) : (
            <button
              onClick={() => item.href && navigate({ to: item.href })}
              className="text-gray-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              disabled={!item.href}
            >
              {item.label}
            </button>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export const TeamNavigation: React.FC<TeamNavigationProps> = ({
  currentPage,
  workspaceId,
  showBreadcrumbs = true,
  showDescriptions = false,
  variant = 'tabs',
  className
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Define navigation items
  const navigationItems: NavigationItem[] = [
    {
      key: 'teams',
      label: 'Team Overview',
      description: 'View team members, performance, and collaboration',
      icon: <Users className="h-4 w-4" />,
      href: '/dashboard/teams',
      badge: undefined
    },
    {
      key: 'team-management',
      label: 'Team Management',
      description: 'Manage members, roles, and team settings',
      icon: <Settings className="h-4 w-4" />,
      href: '/dashboard/settings/team-management'
    },
    {
      key: 'role-permissions',
      label: 'Role Permissions',
      description: 'Configure roles and permission levels',
      icon: <Shield className="h-4 w-4" />,
      href: '/dashboard/settings/role-permissions'
    },
    {
      key: 'components-features',
      label: 'Components & Features',
      description: 'Manage page components and feature settings',
      icon: <Layout className="h-4 w-4" />,
      href: '/dashboard/settings/components-features'
    },
    {
      key: 'analytics',
      label: 'Team Analytics',
      description: 'View team performance and productivity insights',
      icon: <BarChart3 className="h-4 w-4" />,
      href: '/dashboard/analytics',
      badge: 'New'
    }
  ];

  // Breadcrumb items based on current page
  const getBreadcrumbs = () => {
    const breadcrumbs = [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Team Management' }
    ];

    switch (currentPage) {
      case 'teams':
        breadcrumbs.push({ label: 'Team Overview', current: true });
        break;
      case 'team-management':
        breadcrumbs.push(
          { label: 'Settings', href: '/dashboard/settings' },
          { label: 'Team Management', current: true }
        );
        break;
      case 'role-permissions':
        breadcrumbs.push(
          { label: 'Settings', href: '/dashboard/settings' },
          { label: 'Role Permissions', current: true }
        );
        break;
      case 'components-features':
        breadcrumbs.push(
          { label: 'Settings', href: '/dashboard/settings' },
          { label: 'Components & Features', current: true }
        );
        break;
      case 'analytics':
        breadcrumbs.push({ label: 'Team Analytics', current: true });
        break;
      default:
        breadcrumbs[breadcrumbs.length - 1].current = true;
    }

    return breadcrumbs;
  };

  const handleNavigation = (item: NavigationItem) => {
    if (item.disabled) return;
    
    if (item.external) {
      window.open(item.href, '_blank');
    } else {
      navigate({ to: item.href });
    }
  };

  // Render breadcrumbs
  if (variant === 'breadcrumbs') {
    return (
      <div className={className}>
        <Breadcrumbs items={getBreadcrumbs()} />
      </div>
    );
  }

  // Render sidebar navigation
  if (variant === 'sidebar') {
    return (
      <div className={cn("space-y-2", className)}>
        {navigationItems.map((item) => {
          const isActive = currentPage === item.key || location.pathname === item.href;
          
          return (
            <motion.div
              key={item.key}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={() => handleNavigation(item)}
                variant={isActive ? 'default' : 'ghost'}
                className={cn(
                  "w-full justify-start",
                  isActive && "bg-gradient-to-r from-emerald-500 to-teal-500 text-white",
                  item.disabled && "opacity-50 cursor-not-allowed"
                )}
                disabled={item.disabled}
              >
                <div className="flex items-center gap-3 w-full">
                  {item.icon}
                  <div className="flex-1 text-left">
                    <div className="font-medium">{item.label}</div>
                    {showDescriptions && item.description && (
                      <div className="text-xs opacity-75 mt-1">
                        {item.description}
                      </div>
                    )}
                  </div>
                  {item.badge && (
                    <Badge variant="secondary" className="text-xs">
                      {item.badge}
                    </Badge>
                  )}
                  {item.external && (
                    <ExternalLink className="h-3 w-3 opacity-50" />
                  )}
                </div>
              </Button>
            </motion.div>
          );
        })}
      </div>
    );
  }

  // Render tab navigation (default)
  return (
    <div className={cn("space-y-4", className)}>
      {showBreadcrumbs && (
        <Breadcrumbs items={getBreadcrumbs()} />
      )}
      
      <div className="flex gap-2 flex-wrap">
        {navigationItems.map((item) => {
          const isActive = currentPage === item.key || location.pathname === item.href;
          
          return (
            <motion.div
              key={item.key}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={() => handleNavigation(item)}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  "relative",
                  isActive && "bg-gradient-to-r from-emerald-500 to-teal-500 text-white",
                  !isActive && "border-emerald-200 hover:bg-emerald-50 dark:border-emerald-700 dark:hover:bg-emerald-900/20",
                  item.disabled && "opacity-50 cursor-not-allowed"
                )}
                disabled={item.disabled}
              >
                <div className="flex items-center gap-2">
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge && (
                    <Badge 
                      variant="secondary" 
                      className="text-xs ml-1 bg-white/20 text-white border-white/20"
                    >
                      {item.badge}
                    </Badge>
                  )}
                  {item.external && (
                    <ExternalLink className="h-3 w-3" />
                  )}
                </div>
              </Button>
            </motion.div>
          );
        })}
      </div>
      
      {showDescriptions && currentPage && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            {navigationItems.find(item => item.key === currentPage)?.description}
          </p>
        </div>
      )}
    </div>
  );
};

// Quick navigation component for action headers
export const QuickTeamNavigation: React.FC<{
  currentPage?: string;
  onNavigateToTeams?: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToPermissions?: () => void;
  onNavigateToFeatures?: () => void;
  showLabels?: boolean;
  className?: string;
}> = ({
  currentPage,
  onNavigateToTeams,
  onNavigateToSettings,
  onNavigateToPermissions,
  onNavigateToFeatures,
  showLabels = true,
  className
}) => {
  const quickActions = [
    {
      key: 'teams',
      icon: <Users className="h-4 w-4" />,
      label: 'Teams',
      onClick: onNavigateToTeams,
      active: currentPage === 'teams'
    },
    {
      key: 'settings',
      icon: <Settings className="h-4 w-4" />,
      label: 'Settings',
      onClick: onNavigateToSettings,
      active: currentPage === 'team-management'
    },
    {
      key: 'permissions',
      icon: <Shield className="h-4 w-4" />,
      label: 'Permissions',
      onClick: onNavigateToPermissions,
      active: currentPage === 'role-permissions'
    },
    {
      key: 'features',
      icon: <Layout className="h-4 w-4" />,
      label: 'Features',
      onClick: onNavigateToFeatures,
      active: currentPage === 'components-features'
    }
  ].filter(action => action.onClick);

  return (
    <div className={cn("flex gap-2", className)}>
      {quickActions.map((action) => (
        <motion.div key={action.key} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={action.onClick}
            variant={action.active ? 'default' : 'outline'}
            size="sm"
            className={cn(
              action.active && "bg-gradient-to-r from-emerald-500 to-teal-500 text-white",
              !action.active && "border-emerald-200 hover:bg-emerald-50 dark:border-emerald-700 dark:hover:bg-emerald-900/20"
            )}
          >
            {action.icon}
            {showLabels && <span className="ml-2">{action.label}</span>}
          </Button>
        </motion.div>
      ))}
    </div>
  );
};

// Back navigation component
export const BackNavigation: React.FC<{
  onBack?: () => void;
  backLabel?: string;
  className?: string;
}> = ({ onBack, backLabel = "Back to Dashboard", className }) => {
  const navigate = useNavigate();
  
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate({ to: '/dashboard' });
    }
  };

  return (
    <motion.div 
      className={cn("mb-6", className)}
      whileHover={{ x: -2 }}
    >
      <Button
        onClick={handleBack}
        variant="ghost"
        size="sm"
        className="text-gray-500 hover:text-slate-900 dark:hover:text-slate-100"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {backLabel}
      </Button>
    </motion.div>
  );
};