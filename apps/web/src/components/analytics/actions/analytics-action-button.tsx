// @epic-2.1-workflow: Action-oriented analytics buttons for seamless task creation
// @persona-sarah: PM needs to create tasks directly from insights
// @persona-david: Team lead needs to assign team members from analytics

import { useState } from "react";
import { Button } from "@/components/ui/button";
import useGetWorkspaceUsers from "@/hooks/queries/workspace-users/use-get-workspace-users";
import useWorkspaceStore from "@/store/workspace";
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
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Users, 
  AlertTriangle, 
  Calendar, 
  Target,
  TrendingUp,
  MessageSquare,
  FileText,
  ChevronDown,
  Search,
  Loader2
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/cn";
import { Input } from "@/components/ui/input";
import { DialogFooter } from "@/components/ui/dialog";
import { toast } from '@/lib/toast';
import { logger } from "../../../lib/logger";

interface AnalyticsActionButtonProps {
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  context: {
    type: "project" | "team_member" | "task" | "insight" | "alert";
    id: string;
    name: string;
    data?: any;
  };
  actions?: AnalyticsAction[];
  className?: string;
  disabled?: boolean;
}

interface AnalyticsAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  priority?: "high" | "medium" | "low";
  category: "create" | "assign" | "navigate" | "alert" | "export";
  onClick: (context: AnalyticsActionButtonProps["context"]) => void;
  disabled?: boolean;
  badge?: string;
}

const DEFAULT_ACTIONS: Record<string, AnalyticsAction[]> = {
  project: [
    {
      id: "create-task",
      label: "Create Task",
      icon: Plus,
      description: "Create a new task for this project",
      priority: "high",
      category: "create",
      onClick: (context) => logger.info("Create task for project:"),
    },
    {
      id: "assign-members",
      label: "Assign Team Members",
      icon: Users,
      description: "Assign team members to this project",
      priority: "medium",
      category: "assign",
      onClick: (context) => logger.info("Assign members to project:"),
    },
    {
      id: "view-details",
      label: "View Project Details",
      icon: Target,
      description: "Navigate to project dashboard",
      priority: "medium",
      category: "navigate",
      onClick: (context) => logger.info("Navigate to project:"),
    },
    {
      id: "schedule-review",
      label: "Schedule Review",
      icon: Calendar,
      description: "Schedule a project review meeting",
      priority: "low",
      category: "create",
      onClick: (context) => logger.info("Schedule review for project:"),
    },
  ],
  team_member: [
    {
      id: "assign-tasks",
      label: "Assign Tasks",
      icon: Plus,
      description: "Assign new tasks to this team member",
      priority: "high",
      category: "assign",
      onClick: (context) => logger.info("Assign tasks to member:"),
    },
    {
      id: "send-message",
      label: "Send Message",
      icon: MessageSquare,
      description: "Send a direct message",
      priority: "medium",
      category: "create",
      onClick: (context) => logger.info("Send message to member:"),
    },
    {
      id: "view-profile",
      label: "View Profile",
      icon: Users,
      description: "View team member profile",
      priority: "low",
      category: "navigate",
      onClick: (context) => logger.info("View profile:"),
    },
  ],
  insight: [
    {
      id: "create-task-from-insight",
      label: "Create Action Item",
      icon: Plus,
      description: "Create a task based on this insight",
      priority: "high",
      category: "create",
      onClick: (context) => logger.info("Create task from insight:"),
    },
    {
      id: "share-insight",
      label: "Share Insight",
      icon: MessageSquare,
      description: "Share this insight with team",
      priority: "medium",
      category: "create",
      onClick: (context) => logger.info("Share insight:"),
    },
    {
      id: "export-report",
      label: "Export Report",
      icon: FileText,
      description: "Export detailed report",
      priority: "low",
      category: "export",
      onClick: (context) => logger.info("Export report:"),
    },
  ],
  alert: [
    {
      id: "resolve-alert",
      label: "Mark Resolved",
      icon: TrendingUp,
      description: "Mark this alert as resolved",
      priority: "high",
      category: "alert",
      onClick: (context) => logger.info("Resolve alert:"),
    },
    {
      id: "assign-alert",
      label: "Assign to Team Member",
      icon: Users,
      description: "Assign this alert to someone",
      priority: "high",
      category: "assign",
      onClick: (context) => logger.info("Assign alert:"),
    },
    {
      id: "create-task-from-alert",
      label: "Create Task",
      icon: Plus,
      description: "Create a task to address this alert",
      priority: "medium",
      category: "create",
      onClick: (context) => logger.info("Create task from alert:"),
    },
  ],
};

export function AnalyticsActionButton({
  variant = "default",
  size = "default",
  context,
  actions: customActions,
  className,
  disabled = false,
}: AnalyticsActionButtonProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<AnalyticsAction | null>(null);
  const [showTeamMemberModal, setShowTeamMemberModal] = useState(false);

  // Fetch real workspace data
  const { workspace } = useWorkspaceStore();
  const { data: workspaceUsers = [], isLoading: usersLoading } = useGetWorkspaceUsers({
    workspaceId: workspace?.id || ''
  });

  const actions = customActions || DEFAULT_ACTIONS[context.type] || [];
  const primaryAction = actions.find(a => a.priority === "high") || actions[0];

  if (actions.length === 0) {
    return null;
  }

  const handleActionClick = (action: AnalyticsAction) => {
    if (action.disabled) return;
    
    setSelectedAction(action);
    action.onClick(context);
    setIsDropdownOpen(false);
  };

  // TODO: Implement team member assignment modal
  const handleTeamMemberAssignment = () => {
    // Open team member assignment modal
    setShowTeamMemberModal(true);
  };

  // Team member assignment modal
  const TeamMemberAssignmentModal = () => {
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(false);

    const handleAssignMembers = async () => {
      if (selectedMembers.length === 0) return;
      
      setLoading(true);
      try {
        // TODO: Implement actual team member assignment
        logger.info("Assigning members to team:");
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        toast.success(`${selectedMembers.length} members assigned successfully`);
        setShowTeamMemberModal(false);
        setSelectedMembers([]);
      } catch (error) {
        toast.error("Failed to assign members");
      } finally {
        setLoading(false);
      }
    };

    return (
      <Dialog open={showTeamMemberModal} onOpenChange={setShowTeamMemberModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Team Members</DialogTitle>
            <DialogDescription>
              Select team members to assign to this project or task.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="max-h-60 overflow-y-auto space-y-2">
              {/* Real team members data from API */}
              {workspaceUsers.map((member, index) => (
                <div
                  key={member.id || member.email || `member-${index}`}
                  className={`flex items-center space-x-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                    selectedMembers.includes(member.id)
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => {
                    setSelectedMembers(prev =>
                      prev.includes(member.id)
                        ? prev.filter(id => id !== member.id)
                        : [...prev, member.id]
                    );
                  }}
                >
                  <Checkbox
                    checked={selectedMembers.includes(member.id)}
                    onChange={() => {}}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                  <Badge variant="secondary">{member.role}</Badge>
                </div>
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTeamMemberModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignMembers}
              disabled={selectedMembers.length === 0 || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                `Assign ${selectedMembers.length} Member${selectedMembers.length !== 1 ? 's' : ''}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "h-8 px-2 text-xs";
      case "lg":
        return "h-12 px-6 text-base";
      default:
        return "h-10 px-4 text-sm";
    }
  };

  const getIconSize = () => {
    switch (size) {
      case "sm":
        return "h-3 w-3";
      case "lg":
        return "h-5 w-5";
      default:
        return "h-4 w-4";
    }
  };

  // Single action button
  if (actions.length === 1) {
    const action = actions[0];
    const Icon = action.icon;
    
    return (
      <Button
        variant={variant}
        size={size}
        disabled={disabled || action.disabled}
        onClick={() => handleActionClick(action)}
        className={cn(getSizeClasses(), className)}
        title={action.description}
      >
        <Icon className={cn(getIconSize(), "mr-2")} />
        {action.label}
        {action.badge && (
          <Badge variant="secondary" className="ml-2 text-xs">
            {action.badge}
          </Badge>
        )}
      </Button>
    );
  }

  // Multiple actions - dropdown menu
  return (
    <div className="flex">
      {/* Primary action button */}
      {primaryAction && (
        <Button
          variant={variant}
          disabled={disabled || primaryAction.disabled}
          onClick={() => handleActionClick(primaryAction)}
          className={cn(getSizeClasses(), "rounded-r-none border-r-0", className)}
          title={primaryAction.description}
        >
          <primaryAction.icon className={cn(getIconSize(), "mr-2")} />
          {primaryAction.label}
        </Button>
      )}

      {/* Dropdown trigger */}
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            disabled={disabled}
            className={cn(
              "rounded-l-none border-l-0 px-2",
              size === "sm" && "h-8",
              size === "lg" && "h-12",
              size === "default" && "h-10"
            )}
          >
            <ChevronDown className={getIconSize()} />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-xs font-medium text-gray-500">
            Actions for {context.name}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {actions.map((action) => {
            const Icon = action.icon;
            const isDisabled = disabled || action.disabled;
            
            return (
              <DropdownMenuItem
                key={action.id}
                disabled={isDisabled}
                onClick={() => handleActionClick(action)}
                className={cn(
                  "flex items-center gap-3 p-3 cursor-pointer",
                  isDisabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md",
                  action.priority === "high" && "bg-blue-100 text-blue-600",
                  action.priority === "medium" && "bg-yellow-100 text-yellow-600",
                  action.priority === "low" && "bg-gray-100 text-gray-600"
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{action.label}</span>
                    {action.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {action.badge}
                      </Badge>
                    )}
                  </div>
                  {action.description && (
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {action.description}
                    </p>
                  )}
                </div>
                
                {action.priority === "high" && (
                  <AlertTriangle className="h-3 w-3 text-orange-500" />
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      <TeamMemberAssignmentModal />
    </div>
  );
}

// Pre-configured action buttons for common use cases
export function CreateTaskFromInsightButton({ context, ...props }: Omit<AnalyticsActionButtonProps, "actions">) {
  return (
    <AnalyticsActionButton
      {...props}
      context={context}
      actions={[
        {
          id: "create-task",
          label: "Create Task",
          icon: Plus,
          description: "Create a task based on this insight",
          priority: "high",
          category: "create",
          onClick: (ctx) => {
            // TODO: Implement task creation modal
            logger.info("Creating task from insight:");
          },
        },
      ]}
    />
  );
}

export function AssignTeamMemberButton({ context, ...props }: Omit<AnalyticsActionButtonProps, "actions">) {
  return (
    <AnalyticsActionButton
      {...props}
      context={context}
      actions={[
        {
          id: "assign-member",
          label: "Assign Member",
          icon: Users,
          description: "Assign a team member to this item",
          priority: "high",
          category: "assign",
          onClick: (ctx) => {
            // TODO: Implement team member assignment modal
            logger.info("Assigning team member:");
          },
        },
      ]}
    />
  );
}

export function DrillDownButton({ context, ...props }: Omit<AnalyticsActionButtonProps, "actions">) {
  return (
    <AnalyticsActionButton
      {...props}
      context={context}
      actions={[
        {
          id: "drill-down",
          label: "View Details",
          icon: Target,
          description: "Navigate to detailed view",
          priority: "high",
          category: "navigate",
          onClick: (ctx) => {
            // TODO: Implement navigation logic
            logger.info("Drilling down to:");
          },
        },
      ]}
    />
  );
}

export type { AnalyticsActionButtonProps, AnalyticsAction };