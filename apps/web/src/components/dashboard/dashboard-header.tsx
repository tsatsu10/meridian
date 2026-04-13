// @epic-3.5-communication: Dashboard header optimized for Magic UI Dock Navigation
// @persona-sarah: PM needs streamlined header with quick access to key actions
// @persona-jennifer: Exec needs executive-focused header controls
// @persona-david: Team lead needs team management access from header
// @persona-mike: Dev needs minimal header interference with dock navigation
// @persona-lisa: Designer needs clean header design with dock system integration

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Plus, 
  Settings, 
  Command,
  LogOut,
  User,
  FolderPlus,
  UserPlus,
  CheckSquare,
  MessageCircle
} from "lucide-react";
import NotificationBell from "@/components/notification/notification-bell";
import PageHeaderActions from "@/components/dashboard/page-header-actions";
import { cn } from "@/lib/cn";
import { useNavigate } from "@tanstack/react-router";
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PerformanceBadge } from "@/components/performance/performance-badge";
import { OfflineStatusIndicator } from "@/components/pwa/OfflineStatusIndicator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import useWorkspaceStore from "@/store/workspace";
import CreateProjectModal from "@/components/shared/modals/create-project-modal";

// Icon wrappers for consistent typing
const SearchIcon = Search as React.FC<{ className?: string }>;
const PlusIcon = Plus as React.FC<{ className?: string }>;
const SettingsIcon = Settings as React.FC<{ className?: string }>;
const CommandIcon = Command as React.FC<{ className?: string }>;
const LogOutIcon = LogOut as React.FC<{ className?: string }>;
const UserIcon = User as React.FC<{ className?: string }>;
const FolderPlusIcon = FolderPlus as React.FC<{ className?: string }>;
const UserPlusIcon = UserPlus as React.FC<{ className?: string }>;
const CheckSquareIcon = CheckSquare as React.FC<{ className?: string }>;
const MessageCircleIcon = MessageCircle as React.FC<{ className?: string }>;

interface DashboardHeaderProps {
  title?: string;
  subtitle?: string;
  showSearch?: boolean;
  className?: string;
  children?: React.ReactNode;
  variant?: "default" | "minimal" | "compact";
}

export default function DashboardHeader({ 
  title,
  subtitle,
  showSearch = false, // Changed default to false since dock handles navigation
  className,
  children,
  variant = "default"
}: DashboardHeaderProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { workspace } = useWorkspaceStore();
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);

  // Enhanced action handlers
  const handleProfile = () => {
    navigate({ to: '/dashboard/settings/profile' });
  };

  const handleSettings = () => {
    navigate({ to: '/dashboard/settings' });
  };

  const handleNotificationSettings = () => {
    navigate({ to: '/dashboard/settings/notifications' });
  };

  const handleCreateProject = () => {
    if (!workspace) {
      toast.error("Please select a workspace first");
      return;
    }
    setIsCreateProjectOpen(true);
  };

  const handleCreateTask = () => {
    navigate({ to: '/dashboard/all-tasks' });
  };

  const handleInviteUser = () => {
    navigate({ to: '/dashboard/teams' });
  };

  const handleCommunication = () => {
    navigate({ to: '/dashboard/communication' });
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate({ to: '/auth/signin' });
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };

  // Variant-based styling
  const headerVariants = {
    default: "flex items-center justify-between p-6 bg-white dark:bg-card border-b border-border glass-card",
    minimal: "flex items-center justify-between px-4 py-3 bg-transparent",
    compact: "flex items-center justify-between px-4 py-2 bg-white/50 dark:bg-card/50 backdrop-blur-sm border-b border-border/50"
  };

  return (
    <header className={cn(headerVariants[variant], className)}>
      {/* Left Section - Title & Subtitle */}
      <div className="flex items-center space-x-4">
        {title && (
          <div>
            <h1 className={cn(
              "font-bold text-foreground gradient-text",
              variant === "compact" ? "text-lg" : "text-2xl"
            )}>
              {title}
            </h1>
            {subtitle && (
              <p className="text-muted-foreground text-sm mt-1">
                {subtitle}
              </p>
            )}
          </div>
        )}
        
        {children && (
          <div className="flex items-center space-x-2">
            {children}
          </div>
        )}
      </div>

      {/* Center Section - Search (Optional) */}
      {showSearch && (
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects, tasks, teams..."
              className="pl-10 bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
            />
            <kbd className="absolute right-3 top-1/2 transform -translate-y-1/2 px-1.5 py-0.5 text-xs font-mono bg-muted rounded border">
              ⌘K
            </kbd>
          </div>
        </div>
      )}

      {/* Right Section - Actions & User Menu */}
      <div className="flex items-center gap-2">
        {/* Performance Badge - Desktop only */}
        {variant !== 'minimal' && (
          <div className="hidden lg:block">
            <PerformanceBadge 
              showDetails={false}
              enableTracking={true}
            />
          </div>
        )}
        
        {/* Offline Indicator */}
        <OfflineStatusIndicator showDetails={false} />
        
        <PageHeaderActions 
          variant={variant}
          onCreateClick={handleCreateProject}
        />
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal 
        isOpen={isCreateProjectOpen} 
        onClose={() => setIsCreateProjectOpen(false)} 
      />
    </header>
  );
} 