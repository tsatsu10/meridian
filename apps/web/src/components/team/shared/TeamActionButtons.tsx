import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  UserPlus, 
  Copy, 
  Shield, 
  Layout, 
  Settings,
  RefreshCw,
  Download,
  Upload,
  Filter,
  Search,
  Users,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

interface TeamActionButtonsProps {
  onInviteMember?: () => void;
  onCopyInviteLink?: () => void;
  onManagePermissions?: () => void;
  onManageFeatures?: () => void;
  onRefresh?: () => void;
  onExportData?: () => void;
  onImportData?: () => void;
  onToggleFilters?: () => void;
  onOpenSearch?: () => void;
  onViewTeams?: () => void;
  actions?: 'all' | 'primary' | 'secondary' | 'minimal';
  layout?: 'horizontal' | 'vertical' | 'grid';
  showLabels?: boolean;
  variant?: 'default' | 'compact';
  className?: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  label,
  onClick,
  variant = 'outline',
  size = 'sm',
  disabled = false,
  loading = false,
  className
}) => {
  return (
    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
      <Button
        onClick={onClick}
        variant={variant}
        size={size}
        disabled={disabled || loading}
        className={cn(
          "bg-white border-white/20 dark:border-slate-700/20 hover:bg-gray-50",
          className
        )}
      >
        {loading ? (
          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <>
            {icon}
            <span className="ml-2">{label}</span>
          </>
        )}
      </Button>
    </motion.div>
  );
};

export const TeamActionButtons: React.FC<TeamActionButtonsProps> = ({
  onInviteMember,
  onCopyInviteLink,
  onManagePermissions,
  onManageFeatures,
  onRefresh,
  onExportData,
  onImportData,
  onToggleFilters,
  onOpenSearch,
  onViewTeams,
  actions = 'all',
  layout = 'horizontal',
  showLabels = true,
  variant = 'default',
  className
}) => {
  const isCompact = variant === 'compact';
  
  // Define action groups
  const primaryActions = [
    {
      key: 'invite',
      icon: <UserPlus className="h-4 w-4" />,
      label: 'Invite Member',
      onClick: onInviteMember,
      variant: 'default' as const,
      className: 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white'
    }
  ];

  const secondaryActions = [
    {
      key: 'copy-link',
      icon: <Copy className="h-4 w-4" />,
      label: 'Copy Invite Link',
      onClick: onCopyInviteLink
    },
    {
      key: 'permissions',
      icon: <Shield className="h-4 w-4" />,
      label: 'Manage Permissions',
      onClick: onManagePermissions
    },
    {
      key: 'features',
      icon: <Layout className="h-4 w-4" />,
      label: 'Manage Features',
      onClick: onManageFeatures,
      className: 'border-emerald-200 hover:bg-emerald-50 dark:border-emerald-700 dark:hover:bg-emerald-900/20'
    }
  ];

  const utilityActions = [
    {
      key: 'refresh',
      icon: <RefreshCw className="h-4 w-4" />,
      label: 'Refresh',
      onClick: onRefresh
    },
    {
      key: 'export',
      icon: <Download className="h-4 w-4" />,
      label: 'Export Data',
      onClick: onExportData
    },
    {
      key: 'import',
      icon: <Upload className="h-4 w-4" />,
      label: 'Import Data',
      onClick: onImportData
    },
    {
      key: 'filters',
      icon: <Filter className="h-4 w-4" />,
      label: 'Toggle Filters',
      onClick: onToggleFilters
    },
    {
      key: 'search',
      icon: <Search className="h-4 w-4" />,
      label: 'Search',
      onClick: onOpenSearch
    },
    {
      key: 'teams',
      icon: <Users className="h-4 w-4" />,
      label: 'View Teams',
      onClick: onViewTeams
    }
  ];

  // Determine which actions to show
  let displayActions: any[] = [];
  switch (actions) {
    case 'primary':
      displayActions = primaryActions.filter(action => action.onClick);
      break;
    case 'secondary':
      displayActions = secondaryActions.filter(action => action.onClick);
      break;
    case 'minimal':
      displayActions = [
        ...primaryActions.filter(action => action.onClick),
        ...utilityActions.slice(0, 2).filter(action => action.onClick)
      ];
      break;
    case 'all':
    default:
      displayActions = [
        ...primaryActions.filter(action => action.onClick),
        ...secondaryActions.filter(action => action.onClick),
        ...utilityActions.filter(action => action.onClick)
      ];
  }

  if (displayActions.length === 0) {
    return null;
  }

  const containerClasses = cn(
    "flex gap-3",
    layout === 'vertical' && "flex-col",
    layout === 'grid' && "grid grid-cols-2 md:grid-cols-3 gap-3",
    layout === 'horizontal' && "flex-wrap",
    className
  );

  return (
    <div className={containerClasses}>
      {displayActions.map((action) => (
        <ActionButton
          key={action.key}
          icon={action.icon}
          label={showLabels ? action.label : ''}
          onClick={action.onClick}
          variant={action.variant || 'outline'}
          size={isCompact ? 'sm' : 'default'}
          className={action.className}
        />
      ))}
    </div>
  );
};

// Specialized action button components for specific use cases
export const InviteMemberButton: React.FC<{
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'compact';
  className?: string;
}> = ({ onClick, loading = false, disabled = false, variant = 'default', className }) => {
  const isCompact = variant === 'compact';
  
  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      <Button 
        onClick={onClick}
        disabled={disabled || loading}
        size={isCompact ? 'sm' : 'default'}
        className={cn(
          "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white",
          className
        )}
      >
        {loading ? (
          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <UserPlus className="h-4 w-4 mr-2" />
        )}
        Invite Member
      </Button>
    </motion.div>
  );
};

export const QuickActionMenu: React.FC<{
  onInviteMember?: () => void;
  onCopyInviteLink?: () => void;
  onManagePermissions?: () => void;
  onNavigateToSettings?: () => void;
  className?: string;
}> = ({ 
  onInviteMember, 
  onCopyInviteLink, 
  onManagePermissions, 
  onNavigateToSettings,
  className 
}) => {
  const actions = [
    {
      icon: <Copy className="h-4 w-4" />,
      label: "Copy Invite Link",
      onClick: onCopyInviteLink
    },
    {
      icon: <UserPlus className="h-4 w-4" />,
      label: "Invite Member",
      onClick: onInviteMember
    },
    {
      icon: <Shield className="h-4 w-4" />,
      label: "Manage Permissions",
      onClick: onManagePermissions
    },
    {
      icon: <ExternalLink className="h-4 w-4" />,
      label: "Team Settings",
      onClick: onNavigateToSettings
    }
  ].filter(action => action.onClick);

  return (
    <div className={cn("bg-white border border-gray-200 shadow-sm rounded-2xl p-6", className)}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg">
          <Copy className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Quick Actions
          </h3>
          <p className="text-sm text-gray-500">
            Manage team invitations and permissions
          </p>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-3">
        {actions.map((action, index) => (
          <ActionButton
            key={index}
            icon={action.icon}
            label={action.label}
            onClick={action.onClick}
          />
        ))}
      </div>
    </div>
  );
};

// Navigation buttons for cross-page linking
export const TeamNavigationButtons: React.FC<{
  currentPage: 'teams' | 'settings';
  onNavigateToTeams?: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToPermissions?: () => void;
  onNavigateToFeatures?: () => void;
  className?: string;
}> = ({
  currentPage,
  onNavigateToTeams,
  onNavigateToSettings,
  onNavigateToPermissions,
  onNavigateToFeatures,
  className
}) => {
  const navigationActions = [
    {
      key: 'teams',
      icon: <Users className="h-4 w-4" />,
      label: 'Team Overview',
      onClick: onNavigateToTeams,
      active: currentPage === 'teams'
    },
    {
      key: 'settings',
      icon: <Settings className="h-4 w-4" />,
      label: 'Team Settings',
      onClick: onNavigateToSettings,
      active: currentPage === 'settings'
    },
    {
      key: 'permissions',
      icon: <Shield className="h-4 w-4" />,
      label: 'Role Permissions',
      onClick: onNavigateToPermissions,
      active: false
    },
    {
      key: 'features',
      icon: <Layout className="h-4 w-4" />,
      label: 'Manage Features',
      onClick: onNavigateToFeatures,
      active: false
    }
  ].filter(action => action.onClick);

  return (
    <div className={cn("flex gap-2", className)}>
      {navigationActions.map((action) => (
        <Button
          key={action.key}
          onClick={action.onClick}
          variant={action.active ? 'default' : 'outline'}
          size="sm"
          className={cn(
            action.active && "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
          )}
        >
          {action.icon}
          <span className="ml-2">{action.label}</span>
        </Button>
      ))}
    </div>
  );
};