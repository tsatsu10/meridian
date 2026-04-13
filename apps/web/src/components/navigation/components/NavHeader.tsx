// User profile header with workspace context and quick actions
import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuShortcut,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/components/providers/unified-context-provider';
import useWorkspaceStore from '@/store/workspace';
import { useNavigation } from '../providers/NavigationProvider';
import {
  User,
  Settings,
  LogOut,
  Bell,
  Palette,
  Shield,
  CreditCard,
  Keyboard,
  Moon,
  Sun,
  Monitor,
  ChevronDown,
  Zap,
  HelpCircle,
  Users,
  Building,
} from 'lucide-react';

interface NavHeaderProps {
  showNotifications?: boolean;
  showQuickActions?: boolean;
  showThemeToggle?: boolean;
  className?: string;
}

export const NavHeader: React.FC<NavHeaderProps> = ({
  showNotifications = true,
  showQuickActions = true,
  showThemeToggle = true,
  className,
}) => {
  const { user, signOut } = useAuth();
  const { workspace } = useWorkspaceStore();
  const { state, updatePreferences } = useNavigation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    updatePreferences({ theme });
    // Apply theme change to document
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  };

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const unreadNotifications = 3; // This would come from your notification system

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Notifications */}
      {showNotifications && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="relative"
              asChild
            >
              <Link to="/dashboard/notifications">
                <Bell className="h-4 w-4" />
                {unreadNotifications > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </Badge>
                )}
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Notifications {unreadNotifications > 0 && `(${unreadNotifications} unread)`}</p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Quick Actions */}
      {showQuickActions && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Quick</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/dashboard/projects?action=create">
                <Building className="h-4 w-4 mr-2" />
                New Project
                <DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/dashboard/teams?action=create">
                <Users className="h-4 w-4 mr-2" />
                Create Team
                <DropdownMenuShortcut>⌘T</DropdownMenuShortcut>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Theme Toggle */}
      {showThemeToggle && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              {state.preferences.theme === 'light' && <Sun className="h-4 w-4" />}
              {state.preferences.theme === 'dark' && <Moon className="h-4 w-4" />}
              {state.preferences.theme === 'system' && <Monitor className="h-4 w-4" />}
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleThemeChange('light')}>
              <Sun className="h-4 w-4 mr-2" />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleThemeChange('dark')}>
              <Moon className="h-4 w-4 mr-2" />
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleThemeChange('system')}>
              <Monitor className="h-4 w-4 mr-2" />
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* User Profile Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage 
                src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.email}`} 
                alt={user?.name || 'User avatar'} 
              />
              <AvatarFallback className="text-xs">
                {getInitials(user?.name)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="end" forceMount>
          {/* User Info */}
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {user?.name || 'Anonymous User'}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user?.email}
              </p>
              {workspace && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-6 w-6 rounded bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                    {workspace.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <span className="text-xs text-muted-foreground truncate">
                    {workspace.name}
                  </span>
                </div>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* Profile & Settings */}
          <DropdownMenuItem asChild>
            <Link to="/dashboard/settings/profile">
              <User className="h-4 w-4 mr-2" />
              Profile
              <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
            <Link to="/dashboard/settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
              <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
            </Link>
          </DropdownMenuItem>
          
          {/* Workspace Settings (if admin) */}
          {workspace && (
            <DropdownMenuItem asChild>
              <Link to={`/dashboard/workspace-settings/${workspace.id}`}>
                <Building className="h-4 w-4 mr-2" />
                Workspace Settings
              </Link>
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          {/* Quick Settings */}
          <DropdownMenuItem asChild>
            <Link to="/dashboard/settings/appearance">
              <Palette className="h-4 w-4 mr-2" />
              Appearance
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
            <Link to="/dashboard/settings/security">
              <Shield className="h-4 w-4 mr-2" />
              Security
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
            <Link to="/dashboard/settings/billing">
              <CreditCard className="h-4 w-4 mr-2" />
              Billing
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* Help & Support */}
          <DropdownMenuItem asChild>
            <Link to="/help">
              <HelpCircle className="h-4 w-4 mr-2" />
              Help & Support
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuItem>
            <Keyboard className="h-4 w-4 mr-2" />
            Keyboard Shortcuts
            <DropdownMenuShortcut>?</DropdownMenuShortcut>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* Sign Out */}
          <DropdownMenuItem 
            onClick={handleSignOut}
            disabled={isLoggingOut}
            className="text-red-600 focus:text-red-600 focus:bg-red-50"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {isLoggingOut ? 'Signing out...' : 'Sign out'}
            <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

// Compact version for smaller spaces
export const CompactNavHeader: React.FC<Omit<NavHeaderProps, 'showQuickActions'>> = (props) => {
  return (
    <NavHeader
      {...props}
      showQuickActions={false}
      className={cn('gap-2', props.className)}
    />
  );
};

export default NavHeader;