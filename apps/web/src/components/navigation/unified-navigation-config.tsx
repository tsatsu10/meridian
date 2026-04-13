// @epic-1.1-rbac: Unified navigation configuration system with role-based access control
// @persona-sarah: PM needs comprehensive navigation with project creation capabilities
// @persona-jennifer: Exec needs streamlined navigation with analytics focus
// @persona-david: Team lead needs team management and analytics navigation
// @persona-mike: Dev needs efficient task and project navigation
// @persona-lisa: Designer needs project and file management navigation

"use client";

import { useMemo } from "react";
import { useLocation } from "@tanstack/react-router";
import {
  Home,
  CheckSquare,
  FolderOpen,
  Users,
  BarChart3,
  Calendar,
  MessageSquare,
  Settings,
  Bell,
  Search,
  Plus,
  HelpCircle,
  Layers,
  LayoutGrid,
  Package,
  GitBranch,
  Target,
  Clock,
  Activity,
  Zap,
  Shield,
  Database,
  FileText,
  Layout,
  LayoutDashboard,
  Kanban,
  List,
  TrendingUp,
  FileCode,
  Terminal,
  Globe,
  type LucideIcon
} from "lucide-react";
import { useRBACAuth } from "@/lib/permissions";
import type { AllPermissions } from "@/lib/permissions/types";
import useWorkspaceStore from "@/store/workspace";
import useGetNotifications from "@/hooks/queries/notification/use-get-notifications";
import type { Notification } from "@/types/notification";
import { useState } from "react";
import useGetProjects from "@/hooks/queries/project/use-get-projects";
import type { Project } from "@/types/project";

// Navigation item interface with enhanced properties
export interface NavigationItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  category: "main" | "project" | "workspace" | "utility" | "development";
  badge?: number;
  shortcut?: string;
  color?: string;
  permissions?: (keyof Omit<AllPermissions, "role" | "inheritedFromRole" | "customPermissions" | "restrictions" | "hasTimeLimit" | "expiresAt" | "scopedToProjects" | "scopedToDepartments">)[];
  onClick?: () => void;
  children?: NavigationItem[];
}

// Navigation section interface
export interface NavigationSection {
  id: string;
  title?: string;
  items: NavigationItem[];
}

// Dashboard navigation items with create functionality
export const useDashboardNavigation = (): NavigationItem[] => {
  const { hasPermission } = useRBACAuth();
  const { workspace } = useWorkspaceStore();
  const { data: projects } = useGetProjects({ 
    workspaceId: workspace?.id || '' 
  });

  return useMemo(() => [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: Home,
      href: "/dashboard",
      category: "workspace",
      shortcut: "⌘D",
      color: "bg-gradient-to-br from-blue-500 to-blue-600"
    },
    {
      id: "all-tasks",
      label: "All Tasks",
      icon: CheckSquare,
      href: "/dashboard/all-tasks",
      category: "workspace",
      shortcut: "⌘T",
      color: "bg-gradient-to-br from-green-500 to-green-600"
    },
    {
      id: "projects",
      label: "Projects",
      icon: FolderOpen,
      href: "/dashboard/projects",
      category: "workspace",
      shortcut: "⌘P",
      color: "bg-gradient-to-br from-purple-500 to-purple-600"
    },
    {
      id: "teams",
      label: "Teams",
      icon: Users,
      href: "/dashboard/teams",
      category: "workspace",
      shortcut: "⌘E",
      color: "bg-gradient-to-br from-orange-500 to-orange-600"
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: BarChart3,
      href: "/dashboard/analytics",
      category: "workspace",
      shortcut: "⌘A",
      color: "bg-gradient-to-br from-indigo-500 to-indigo-600",
      permissions: ["canViewAnalytics"]
    },
    {
      id: "chat",
      label: "Chat",
      icon: MessageSquare,
      href: "/chat",
      category: "workspace",
      shortcut: "⌘C",
      color: "bg-gradient-to-br from-green-500 to-emerald-600"
    },
  ], [workspace?.id, projects, hasPermission]);
};

// Utility Navigation Items
export const useUtilityNavigation = (): NavigationItem[] => {
  const { data: notifications } = useGetNotifications();
  const unreadCount = notifications?.filter((n: Notification) => !n.isRead).length || 0;

  return [
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      href: "/dashboard/notifications",
      category: "utility",
      badge: unreadCount,
      color: "bg-gradient-to-br from-yellow-500 to-yellow-600"
    }
  ];
};

// Settings Navigation Items - Comprehensive with 22 pages organized into 5 categories
export const useSettingsNavigation = (): NavigationItem[] => {
  const { hasPermission } = useRBACAuth();

  return useMemo(() => [
    // Personal Settings (6 items)
    {
      id: "profile",
      label: "Profile",
      icon: Layers,
      href: "/dashboard/settings/profile",
      category: "utility" as const
    },
    {
      id: "appearance",
      label: "Appearance",
      icon: Layers,
      href: "/dashboard/settings/appearance",
      category: "utility" as const
    },
    {
      id: "notifications-settings",
      label: "Notifications",
      icon: Bell,
      href: "/dashboard/settings/notifications",
      category: "utility" as const
    },
    {
      id: "shortcuts",
      label: "Keyboard Shortcuts",
      icon: Terminal,
      href: "/dashboard/settings/shortcuts",
      category: "utility" as const
    },
    {
      id: "templates",
      label: "Dashboard Templates",
      icon: LayoutGrid,
      href: "/dashboard/settings/templates",
      category: "utility" as const
    },
    // Security & Privacy (3 items)
    {
      id: "security",
      label: "Security",
      icon: Shield,
      href: "/dashboard/settings/security",
      category: "utility" as const
    },
    {
      id: "api-settings",
      label: "API & Webhooks",
      icon: FileCode,
      href: "/dashboard/settings/api",
      category: "utility" as const,
      permissions: ["canManageAPIAccess"]
    },
    {
      id: "audit-logs",
      label: "Audit Logs",
      icon: FileText,
      href: "/dashboard/settings/audit-logs",
      category: "utility" as const,
      permissions: ["canViewAuditLogs"]
    },
    
    // Workspace Settings (4 items)
    {
      id: "workspace-settings",
      label: "Workspace",
      icon: Layout,
      href: "/dashboard/settings/workspace",
      category: "workspace" as const
    },
    {
      id: "team-management",
      label: "Team Management",
      icon: Users,
      href: "/dashboard/settings/team-management",
      category: "workspace" as const
    },
    {
      id: "roles-unified",
      label: "Roles & Permissions",
      icon: Shield,
      href: "/dashboard/settings/roles-unified",
      category: "workspace" as const,
      permissions: ["canManageRoles"]
    },
    {
      id: "billing",
      label: "Billing & Plans",
      icon: Package,
      href: "/dashboard/settings/billing",
      category: "workspace" as const
    },
    
    // Data & Integration (5 items)
    {
      id: "data-management",
      label: "Data Management",
      icon: Database,
      href: "/dashboard/settings/data-management",
      category: "utility" as const
    },
    {
      id: "integrations",
      label: "Integrations",
      icon: Zap,
      href: "/dashboard/settings/integrations",
      category: "utility" as const
    },
    {
      id: "automation",
      label: "Automation",
      icon: Zap,
      href: "/dashboard/settings/automation",
      category: "utility" as const
    },
    {
      id: "calendar",
      label: "Calendar",
      icon: Calendar,
      href: "/dashboard/settings/calendar",
      category: "utility" as const
    },
    {
      id: "filters",
      label: "Advanced Filters",
      icon: Search,
      href: "/dashboard/settings/filters",
      category: "utility" as const
    },
    
    // Customization & Advanced (4 items)
    {
      id: "email-settings",
      label: "Email & SMTP",
      icon: MessageSquare,
      href: "/dashboard/settings/email",
      category: "utility" as const
    },
    {
      id: "themes",
      label: "Themes & Branding",
      icon: Layers,
      href: "/dashboard/settings/themes",
      category: "utility" as const
    },
    {
      id: "localization",
      label: "Localization",
      icon: Globe,
      href: "/dashboard/settings/localization",
      category: "utility" as const
    },
  ], [hasPermission]);
};

// Project-specific navigation items
export const useProjectNavigation = (workspaceId: string, projectId: string): NavigationItem[] => {
  const { hasPermission } = useRBACAuth();

  // Return empty array if no valid workspace or project ID
  if (!workspaceId || !projectId) {
    return [];
  }

  return [
    {
      id: "project-overview",
      label: "Overview",
      icon: LayoutDashboard,
      href: `/dashboard/workspace/${workspaceId}/project/${projectId}`,
      category: "project",
      color: "bg-gradient-to-br from-blue-500 to-blue-600"
    },
    {
      id: "project-board",
      label: "Board",
      icon: Kanban,
      href: `/dashboard/workspace/${workspaceId}/project/${projectId}/board`,
      category: "project",
      color: "bg-gradient-to-br from-purple-500 to-purple-600"
    },
    // Backlog navigation item
    {
      id: "project-backlog",
      label: "Backlog",
      icon: FolderOpen,
      href: `/dashboard/workspace/${workspaceId}/project/${projectId}/backlog`,
      category: "project",
      color: "bg-gradient-to-br from-yellow-500 to-yellow-600"
    },
    {
      id: "project-list",
      label: "List",
      icon: List,
      href: `/dashboard/workspace/${workspaceId}/project/${projectId}/list`,
      category: "project",
      color: "bg-gradient-to-br from-green-500 to-green-600"
    },
    {
      id: "project-timeline",
      label: "Timeline",
      icon: Clock,
      href: `/dashboard/workspace/${workspaceId}/project/${projectId}/timeline`,
      category: "project",
      color: "bg-gradient-to-br from-orange-500 to-orange-600"
    },
    {
      id: "project-milestones",
      label: "Milestones",
      icon: Target,
      href: `/dashboard/workspace/${workspaceId}/project/${projectId}/milestones`,
      category: "project",
      color: "bg-gradient-to-br from-red-500 to-red-600"
    },
    {
      id: "project-notes",
      label: "Notes",
      icon: FileText,
      href: `/dashboard/workspace/${workspaceId}/project/${projectId}/notes`,
      category: "project",
      color: "bg-gradient-to-br from-yellow-500 to-yellow-600"
    },
    {
      id: "project-analytics",
      label: "Analytics",
      icon: TrendingUp,
      href: `/dashboard/workspace/${workspaceId}/project/${projectId}/analytics`,
      category: "project",
      color: "bg-gradient-to-br from-indigo-500 to-indigo-600",
      permissions: ["canViewProjectAnalytics"]
    },
    {
      id: "project-teams",
      label: "Teams",
      icon: Users,
      href: `/dashboard/workspace/${workspaceId}/project/${projectId}/teams`,
      category: "project",
      color: "bg-gradient-to-br from-indigo-500 to-indigo-600"
    },
    {
      id: "project-settings",
      label: "Settings",
      icon: Settings,
      href: `/dashboard/workspace/${workspaceId}/project/${projectId}/settings`,
      category: "project",
      color: "bg-gradient-to-br from-gray-500 to-gray-700"
    }
  ];
};

// Hook to get navigation sections
export const useNavigationSections = (): NavigationSection[] => {
  const location = useLocation();
  const { workspace } = useWorkspaceStore();
  const projectId = location.pathname.split("/project/")[1]?.split("/")[0];

  const dashboardNav = useDashboardNavigation();
  const utilityNav = useUtilityNavigation();
  
  // Always call hooks - they handle empty parameters gracefully
  const projectNav = useProjectNavigation(workspace?.id || "", projectId || "");
  const workspaceNav = useWorkspaceNavigation(workspace?.id || "");

  // Combine main dashboard items with workspace settings under one section
  const allWorkspaceItems = [...dashboardNav, ...workspaceNav];

  return [
    {
      id: "workspace",
      title: "Workspace",
      items: allWorkspaceItems
    },
    {
      id: "project",
      title: projectId ? "Project" : undefined,
      items: projectNav
    },
    {
      id: "utility",
      items: utilityNav
    }
  ];
};

// Hook to detect active navigation item
export const useActiveNavigation = (items: NavigationItem[]): string => {
  const location = useLocation();
  
  return useMemo(() => {
    const activeItem = items.find(item => 
      item.href !== "#" && (
        location.pathname === item.href || 
        (item.href !== "/dashboard" && location.pathname.startsWith(item.href))
      )
    );
    return activeItem?.id || "dashboard";
  }, [location.pathname, items]);
};

// Utility function to get item color classes
export const getNavigationItemStyle = (item: NavigationItem, isActive: boolean) => ({
  base: "relative group transition-all duration-300",
  active: isActive ? [
    "bg-gradient-to-r from-blue-500/20 to-purple-500/20",
    "border border-blue-500/30",
    "shadow-lg shadow-blue-500/10",
    "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1",
    "before:bg-gradient-to-b before:from-blue-400 before:to-purple-500",
    "before:rounded-r-full"
  ] : [],
  hover: !isActive ? "hover:bg-white/10 hover:shadow-lg hover:shadow-black/5" : "",
  focus: "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white/10",
  glass: "glass-card",
  gradient: item.color || "bg-gradient-to-r from-gray-500 to-slate-500"
});

export const useWorkspaceNavigation = (workspaceId: string): NavigationItem[] => {
  // Return empty array if no valid workspace ID
  if (!workspaceId) {
    return [];
  }

  return [
    {
      id: "workspace-settings",
      label: "Workspace Settings",
      icon: Settings,
      href: `/dashboard/workspace-settings/${workspaceId}`,
      category: "workspace",
      color: "bg-gradient-to-br from-gray-500 to-gray-700"
    }
  ];
}; 