// @epic-3.5-communication: Standardized page header actions component
// @persona-sarah: PM needs consistent quick access to creation and notification features
// @persona-jennifer: Exec needs streamlined header controls
// @persona-david: Team lead needs team management access from header
// @persona-mike: Dev needs minimal header interference
// @persona-lisa: Designer needs clean header design

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { 
  Bell, 
  LogOut, 
  Settings, 
  User, 
  Plus, 
  Command,
  FolderPlus,
  CheckSquare,
  UserPlus
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";
import { useRBACAuth } from "@/lib/permissions";
import { cn } from "@/lib/cn";
import { useState } from "react";
import { toast } from "sonner";
import NotificationCenter from "@/components/shared/notifications/notification-center";
import useWorkspaceStore from "@/store/workspace";
import useProjectStore from "@/store/project";
import useGetProjects from "@/hooks/queries/project/use-get-projects";
import type { Project } from "@/types/project";
import CreateProjectModal from "@/components/shared/modals/create-project-modal";
import CreateTaskModal from "@/components/shared/modals/create-task-modal";
import InviteTeamMemberModal from "@/components/team/invite-team-member-modal";

interface PageHeaderActionsProps {
  unreadNotifications?: number;
  showChat?: boolean;
}

export default function PageHeaderActions({
  unreadNotifications = 3,
  showChat = true,
}: PageHeaderActionsProps) {
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isInviteTeamMemberOpen, setIsInviteTeamMemberOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const { workspace } = useWorkspaceStore();
  const { project } = useProjectStore();
  const { data: projects } = useGetProjects({ workspaceId: workspace?.id ?? "" });
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { hasPermission } = useRBACAuth();
  const { workspace: workspaceStore } = useWorkspaceStore();
  
  // Modal states
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

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
    setIsCreateProjectModalOpen(true);
  };

  const handleCreateTask = () => {
    if (!workspace) {
      toast.error("Please select a workspace first");
      return;
    }
    setIsCreateTaskModalOpen(true);
  };

  const handleInviteUser = () => {
    if (!workspace) {
      toast.error("Please select a workspace first");
      return;
    }
    setIsInviteModalOpen(true);
  };

  const handleLogout = async () => {
    try {
      // Note: signOut method should be implemented in auth provider
      // For now, just navigate to sign-in page
      navigate({ to: '/auth/sign-in' });
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };

  const handleCreateClick = () => {
    // Default create action - show dropdown or navigate
  };

  return (
    <>
      <div className={cn("flex items-center space-x-3")}>
        {/* Quick Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="default"
              className="flex items-center space-x-2 glass-card hover:bg-accent"
              title="Quick Actions"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 glass-card">
            <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleCreateProject} className="cursor-pointer">
              <FolderPlus className="h-4 w-4 mr-2" />
              New Project
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCreateTask} className="cursor-pointer">
              <CheckSquare className="h-4 w-4 mr-2" />
              New Task
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleInviteUser} className="cursor-pointer">
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications - Using NotificationCenter component */}
        <NotificationCenter 
          variant="icon" 
          className={cn(
            "glass-card",
            "h-9 w-9"
          )}
        />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className={cn(
                "relative glass-card hover:bg-accent",
                "h-9 w-9 p-0"
              )} 
              title="User Menu"
            >
              <Avatar className={cn("h-8 w-8")}>
                <AvatarFallback className="text-xs">
                  {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 glass-card">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
                {workspace && (
                  <p className="text-xs leading-none text-muted-foreground">
                    {workspace.name}
                  </p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleProfile} className="cursor-pointer">
              <User className="h-4 w-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSettings} className="cursor-pointer">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleNotificationSettings} className="cursor-pointer">
              <Command className="h-4 w-4 mr-2" />
              Preferences
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400 cursor-pointer">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Modals */}
      <CreateProjectModal 
        open={isCreateProjectModalOpen} 
        onClose={() => setIsCreateProjectModalOpen(false)} 
      />

      <CreateTaskModal
        open={isCreateTaskModalOpen}
        onOpenChange={setIsCreateTaskModalOpen}
        projectContext={project}
        hideProjectSelection={false}
        filterOptions={{
          projects: projects,
        }}
      />

      {workspace && (
        <InviteTeamMemberModal
          open={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          workspaceId={workspace.id}
        />
      )}
    </>
  );
} 