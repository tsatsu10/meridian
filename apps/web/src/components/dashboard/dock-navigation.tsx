"use client";

import React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { motion, useMotionValue } from "framer-motion";
import { cn } from "@/lib/cn";
import { Dock, DockIcon } from "@/components/magicui/dock";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Home,
  CheckSquare,
  FolderOpen,
  Users,
  BarChart3,
  MessageSquare,
  Settings
} from "lucide-react";

// Simple static navigation items
const navigationItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: Home,
    href: "/dashboard",
    color: "bg-gradient-to-br from-blue-500 to-blue-600"
  },
  {
    id: "all-tasks",
    label: "All Tasks",
    icon: CheckSquare,
    href: "/dashboard/all-tasks",
    color: "bg-gradient-to-br from-green-500 to-green-600"
  },
  {
    id: "projects",
    label: "Projects",
    icon: FolderOpen,
    href: "/dashboard/projects",
    color: "bg-gradient-to-br from-purple-500 to-purple-600"
  },
  {
    id: "teams",
    label: "Teams",
    icon: Users,
    href: "/dashboard/teams",
    color: "bg-gradient-to-br from-orange-500 to-orange-600"
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    href: "/dashboard/analytics",
    color: "bg-gradient-to-br from-indigo-500 to-indigo-600"
  },
  {
    id: "chat",
    label: "Chat",
    icon: MessageSquare,
    href: "/chat",
    color: "bg-gradient-to-br from-emerald-500 to-teal-600"
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    href: "/dashboard/settings",
    color: "bg-gradient-to-br from-gray-500 to-gray-700"
  }
];

export default function DockNavigation() {
  const location = useLocation();
  const mouseX = useMotionValue(Infinity);

  // Simple active item detection
  const getActiveItem = () => {
    return navigationItems.find(item => 
      location.pathname === item.href || 
      (item.href !== "/dashboard" && location.pathname.startsWith(item.href))
    )?.id || "dashboard";
  };

  const activeItem = getActiveItem();

  return (
    <TooltipProvider>
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 pointer-events-auto">
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.3, duration: 0.8 }}
          className="relative"
        >
          <div className="max-w-screen-lg mx-auto px-4">
            <Dock
              className={cn(
                "glass-card border-border/50 dark:border-border/30",
                "bg-white/80 dark:bg-black/50 backdrop-blur-xl shadow-2xl",
                "max-w-fit mx-auto overflow-hidden"
              )}
              onMouseMove={(e) => mouseX.set(e.pageX)}
              onMouseLeave={() => mouseX.set(Infinity)}
            >
              {navigationItems.map((item) => {
                const isActive = activeItem === item.id;
                return (
                  <Tooltip key={item.id} delayDuration={300}>
                    <TooltipTrigger asChild>
                      <div>
                        <DockIcon
                          mouseX={mouseX}
                          className={cn(
                            "relative group transition-all duration-300 glass-card",
                            item.color,
                            {
                              "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110": isActive,
                              "hover:scale-105": !isActive,
                            }
                          )}
                        >
                          <Link
                            to={item.href}
                            className="flex items-center justify-center w-full h-full text-white"
                          >
                            <item.icon className="w-5 h-5" />
                            {isActive && (
                              <motion.div
                                layoutId="dockActiveIndicator"
                                className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-lg"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                              />
                            )}
                          </Link>
                        </DockIcon>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent 
                      side="top"
                      className="glass-card border border-border/50"
                      sideOffset={8}
                    >
                      <span className="font-medium">{item.label}</span>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </Dock>
          </div>
        </motion.div>
      </div>
    </TooltipProvider>
  );
}