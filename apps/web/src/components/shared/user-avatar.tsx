// @epic-1.1-rbac: Enhanced user avatar with Magic UI integration
// @persona-sarah: PM needs quick profile access and status visibility
// @persona-jennifer: Exec needs executive dashboard shortcuts
// @persona-david: Team lead needs team management access
// @persona-mike: Dev needs development tools and settings
// @persona-lisa: Designer needs design resources and collaboration tools

"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  User, 
  Settings, 
  LogOut, 
  Shield,
  CreditCard,
  Bell,
  Moon,
  Sun,
  Monitor,
  Users,
  FolderOpen,
  BarChart3,
  MessageSquare,
  Calendar,
  HelpCircle,
  Crown,
  Zap,
  Activity,
  Clock
} from "lucide-react";
import { cn } from "@/lib/cn";
import { motion } from "framer-motion";
import { useRBACAuth } from "@/lib/permissions";
import useWorkspaceStore from "@/store/workspace";
import { useTheme } from "next-themes";
import { toast } from "sonner";

// Quick action configurations by persona
const PERSONA_QUICK_ACTIONS = {
  "workspace-manager": [
    { icon: Users, label: "Manage Workspace", action: "/dashboard/workspace-settings" },
    { icon: Shield, label: "Security Settings", action: "/dashboard/security" },
    { icon: BarChart3, label: "Analytics Overview", action: "/dashboard/analytics" },
    { icon: CreditCard, label: "Billing & Plans", action: "/dashboard/billing" }
  ],
  "department-head": [
    { icon: Users, label: "Department Teams", action: "/dashboard/teams" },
    { icon: BarChart3, label: "Department Analytics", action: "/dashboard/analytics?scope=department" },
    { icon: FolderOpen, label: "Department Projects", action: "/dashboard/projects?scope=department" },
    { icon: Calendar, label: "Department Calendar", action: "/dashboard/calendar" }
  ],
  "project-manager": [
    { icon: FolderOpen, label: "My Projects", action: "/dashboard/projects" },
    { icon: Activity, label: "Project Tasks", action: "/dashboard/all-tasks" },
    { icon: Users, label: "Team Management", action: "/dashboard/teams" },
    { icon: BarChart3, label: "Project Analytics", action: "/dashboard/analytics?view=projects" }
  ],
  "team-lead": [
    { icon: Users, label: "Team Dashboard", action: "/dashboard/teams" },
    { icon: Activity, label: "Team Tasks", action: "/dashboard/all-tasks?scope=team" },
    { icon: Clock, label: "Time Tracking", action: "/dashboard/time-tracking" },
    { icon: MessageSquare, label: "Team Chat", action: "/dashboard/communication" }
  ],
  "member": [
    { icon: Activity, label: "My Tasks", action: "/dashboard/all-tasks?assignee=me" },
    { icon: Clock, label: "Time Logs", action: "/dashboard/time-tracking" },
    { icon: FolderOpen, label: "Projects", action: "/dashboard/projects" },
    { icon: MessageSquare, label: "Messages", action: "/dashboard/communication" }
  ],
  "default": [
    { icon: Activity, label: "Dashboard", action: "/dashboard" },
    { icon: User, label: "Profile", action: "/dashboard/settings/profile" },
    { icon: Settings, label: "Settings", action: "/dashboard/settings" },
    { icon: HelpCircle, label: "Help & Support", action: "/help" }
  ]
};

// Status indicators
const STATUS_OPTIONS = [
  { value: "online", label: "Online", color: "bg-green-500", icon: Activity },
  { value: "busy", label: "Busy", color: "bg-red-500", icon: Clock },
  { value: "away", label: "Away", color: "bg-yellow-500", icon: Moon },
  { value: "offline", label: "Offline", color: "bg-gray-500", icon: Monitor }
];

interface UserAvatarProps {
  variant?: "icon" | "button" | "dock";
  className?: string;
  showStatus?: boolean;
  showName?: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
    status?: "online" | "busy" | "away" | "offline";
    plan?: "free" | "pro" | "enterprise";
  };
}

export default function UserAvatar({ 
  variant = "icon",
  className,
  showStatus = true,
  showName = false,
  user = {
    id: "current-user",
    name: "Alex Thompson",
    email: "alex@meridian.io",
    avatar: "/avatars/alex.jpg",
    role: "project-manager",
    status: "online",
    plan: "pro"
  }
}: UserAvatarProps) {
  const { role, hasPermission, logout } = useRBACAuth();
  const { workspace } = useWorkspaceStore();
  const { theme, setTheme } = useTheme();
  const [status, setStatus] = useState(user.status || "online");

  // Get quick actions based on current role
  const quickActions = PERSONA_QUICK_ACTIONS[role as keyof typeof PERSONA_QUICK_ACTIONS] || PERSONA_QUICK_ACTIONS.default;

  // Handle status change
  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus as any);
    toast.success(`Status updated to ${newStatus}`);
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
  };

  // Handle theme change
  const cycleTheme = () => {
    const themes = ["light", "dark", "system"];
    const currentIndex = themes.indexOf(theme || "system");
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const getButtonStyling = () => {
    switch (variant) {
      case "button":
        return "glass-card border-border/50 hover:bg-primary/10";
      case "dock":
        return "glass-card bg-primary/10 hover:bg-primary/20 border-primary/20";
      default:
        return "ghost";
    }
  };

  const currentStatus = STATUS_OPTIONS.find(s => s.value === status);
  const StatusIcon = currentStatus?.icon || Activity;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant === "icon" ? "ghost" : "outline"}
          size={variant === "dock" ? "default" : "icon"}
          className={cn(
            "relative transition-all duration-200",
            getButtonStyling(),
            showName && "px-3",
            className
          )}
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center space-x-2"
          >
            <div className="relative">
              <Avatar className={cn(
                variant === "dock" ? "h-8 w-8" : "h-6 w-6",
                "border-2 border-primary/20"
              )}>
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-primary/20 to-primary/10">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              
              {showStatus && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
                    currentStatus?.color
                  )}
                />
              )}
            </div>
            
            {showName && (
              <div className="text-left">
                <p className="text-sm font-medium">{user.name}</p>
                {user.plan && (
                  <Badge variant="secondary" className="text-xs">
                    {user.plan}
                  </Badge>
                )}
              </div>
            )}
          </motion.div>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent 
        align="end" 
        className={cn(
          "w-72 glass-card border-border/50 p-0",
          "backdrop-blur-xl bg-white/90 dark:bg-black/90"
        )}
      >
        {/* User Info Header */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Avatar className="h-12 w-12 border-2 border-primary/20">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="text-sm font-medium bg-gradient-to-br from-primary/20 to-primary/10">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className={cn(
                "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background",
                currentStatus?.color
              )} />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">{user.name}</h3>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline" className="text-xs capitalize">
                  {role.replace('-', ' ')}
                </Badge>
                {user.plan && (
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "text-xs",
                      user.plan === "enterprise" && "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300",
                      user.plan === "pro" && "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                    )}
                  >
                    {user.plan === "enterprise" && <Crown className="h-3 w-3 mr-1" />}
                    {user.plan === "pro" && <Zap className="h-3 w-3 mr-1" />}
                    {user.plan}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Status Selector */}
          <div className="mt-3">
            <p className="text-xs text-muted-foreground mb-2">Status</p>
            <div className="flex items-center space-x-1">
              {STATUS_OPTIONS.map((option) => {
                const OptionIcon = option.icon;
                return (
                  <Button
                    key={option.value}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "flex-1 h-8 text-xs",
                      status === option.value && "bg-primary/10 text-primary"
                    )}
                    onClick={() => handleStatusChange(option.value)}
                  >
                    <OptionIcon className="h-3 w-3 mr-1" />
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-2">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Quick Actions</DropdownMenuLabel>
          {quickActions.map((action) => {
            const ActionIcon = action.icon;
            return (
              <DropdownMenuItem 
                key={action.label}
                className="flex items-center space-x-2 cursor-pointer"
                onClick={() =>})}
        </div>

        <DropdownMenuSeparator />

        {/* Settings & System */}
        <div className="p-2">
          <DropdownMenuItem 
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() =>} 