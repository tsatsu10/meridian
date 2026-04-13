// @epic-1.1-rbac: Unified Magic UI Navigation System
// @persona-sarah: PM needs consistent navigation across all layouts
// @persona-jennifer: Exec needs streamlined navigation experience
// @persona-david: Team lead needs efficient navigation patterns
// @persona-mike: Dev needs consistent navigation components
// @persona-lisa: Designer needs beautiful and consistent navigation UI

"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { motion, useMotionValue } from "framer-motion";
import { cn } from "@/lib/cn";
import { Dock, DockIcon } from "@/components/magicui/dock";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, ChevronRight, FolderOpen } from "lucide-react";
import { useRBACAuth } from "@/lib/permissions";
import type { AllPermissions } from "@/lib/permissions/types";
import CreateProjectModal from "@/components/shared/modals/create-project-modal";
import useGetProjects from "@/hooks/queries/project/use-get-projects";
import useWorkspaceStore from "@/store/workspace";
import { 
  useNavigationSections,
  useActiveNavigation,
  getNavigationItemStyle,
  type NavigationItem,
  type NavigationSection
} from "@/components/navigation/unified-navigation-config";

// Navigation Layout Types
export type NavigationLayout = "dock" | "sidebar" | "header" | "vertical" | "horizontal";
export type NavigationVariant = "default" | "compact" | "minimal" | "glass" | "solid";

interface MagicUINavigationProps {
  layout?: NavigationLayout;
  variant?: NavigationVariant;
  className?: string;
  showLabels?: boolean;
  showTooltips?: boolean;
  showBadges?: boolean;
  showShortcuts?: boolean;
  sections?: NavigationSection[];
  items?: NavigationItem[];
  onItemClick?: (item: NavigationItem) => void;
  enableMagnification?: boolean;
  enableGlassMorphism?: boolean;
  enableAnimations?: boolean;
}

// Dock Navigation Component
export const DockNavigation: React.FC<MagicUINavigationProps> = ({
  className,
  showTooltips = true,
  showBadges = true,
  showShortcuts = true,
  sections,
  items,
  onItemClick,
  enableMagnification = true,
  enableGlassMorphism = true,
  enableAnimations = true,
}) => {
  const mouseX = useMotionValue(Infinity);
  const navigationSections = sections || useNavigationSections();
  const allItems = items || navigationSections.flatMap(section => section.items);
  const activeItem = useActiveNavigation(allItems);

  const handleItemClick = useCallback((item: NavigationItem, event: React.MouseEvent) => {
    if (onItemClick) {
      onItemClick(item);
    }
    if (item.id === "search") {
      event.preventDefault();
      // Handle search command palette
    }
  }, [onItemClick]);

  const NavigationIcon = React.memo(({ item, isActive }: { item: NavigationItem; isActive: boolean }) => (
    <DockIcon
      mouseX={enableMagnification ? mouseX : undefined}
      className={cn(
        "relative group transition-all duration-300",
        enableGlassMorphism && "glass-card",
        item.color,
        {
          "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110": isActive,
          "hover:scale-105": !isActive && enableAnimations,
        }
      )}
    >
      <Link
        to={item.href}
        className="flex items-center justify-center w-full h-full text-white"
        onClick={(e) => handleItemClick(item, e)}
      >
        <item.icon className="w-5 h-5" />
        {showBadges && item.badge && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs animate-pulse bg-red-500 hover:bg-red-600">
            {item.badge > 99 ? "99+" : item.badge}
          </Badge>
        )}
        {isActive && enableAnimations && (
          <motion.div
            layoutId="dockActiveIndicator"
            className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-lg"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
      </Link>
    </DockIcon>
  ));

  NavigationIcon.displayName = "NavigationIcon";

  return (
    <TooltipProvider>
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
        <motion.div
          initial={enableAnimations ? { y: 100, opacity: 0 } : false}
          animate={enableAnimations ? { y: 0, opacity: 1 } : false}
          transition={enableAnimations ? { type: "spring", bounce: 0.3, duration: 0.8 } : undefined}
        >
          <Dock
            className={cn(
              enableGlassMorphism && "glass-card border-border/50 dark:border-border/30 bg-white/80 dark:bg-black/50 backdrop-blur-xl shadow-2xl",
              className
            )}
            onMouseMove={enableMagnification ? (e) => mouseX.set(e.pageX) : undefined}
            onMouseLeave={enableMagnification ? () => mouseX.set(Infinity) : undefined}
          >
            {/* Main Navigation Items */}
            {allItems.map((item) => {
              const isActive = activeItem === item.id;
              return (
                <Tooltip key={item.id} delayDuration={300}>
                  <TooltipTrigger asChild>
                    <div>
                      <NavigationIcon item={item} isActive={isActive} />
                    </div>
                  </TooltipTrigger>
                  {showTooltips && (
                    <TooltipContent side="top" className={cn(enableGlassMorphism && "glass-card border border-border/50")}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.label}</span>
                        {showShortcuts && item.shortcut && (
                          <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded">
                            {item.shortcut}
                          </kbd>
                        )}
                      </div>
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </Dock>
        </motion.div>
      </div>
    </TooltipProvider>
  );
};

// Sidebar Navigation Component
export const SidebarNavigation: React.FC<MagicUINavigationProps> = ({
  className,
  variant = "default",
  showLabels = true,
  showTooltips = true,
  showBadges = true,
  showShortcuts = false,
  sections,
  items,
  enableGlassMorphism = true,
  enableAnimations = true,
}) => {
  const location = useLocation();
  const navigationSections = sections || useNavigationSections();
  const allItems = items || navigationSections.flatMap(section => section.items);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const { hasPermission } = useRBACAuth();
  const [projectsExpanded, setProjectsExpanded] = useState(false);
  
  // Get workspace and projects data
  const { workspace } = useWorkspaceStore();
  const { data: projects, isLoading: isLoadingProjects } = useGetProjects({ 
    workspaceId: workspace?.id || "" 
  });

  const renderNavigationItem = (item: NavigationItem) => {
    const isActive = location.pathname === item.href || 
      (item.href !== "/dashboard" && location.pathname.startsWith(item.href));
    const styles = getNavigationItemStyle(item, isActive);
    const isProjects = item.id === "projects";
    const isCollapsed = !showLabels;

    // Only toggle dropdown when clicking chevron for projects
    const handleChevronClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isProjects) {
        setProjectsExpanded((prev) => !prev);
      }
    };

    const linkContent = (
      <Link
        to={item.href}
        className={cn(
          "group relative flex items-center rounded-lg transition-all duration-200",
          "before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-blue-500/20 before:via-purple-500/20 before:to-pink-500/20 before:opacity-0 before:transition-opacity",
          "hover:before:opacity-100",
          "after:absolute after:inset-0 after:rounded-lg after:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] after:opacity-0 after:transition-opacity",
          "hover:after:opacity-100",
          isActive && "bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-pink-500/30",
          isCollapsed 
            ? "justify-center p-3 w-12 h-12" 
            : "gap-3 px-3 py-2.5 w-full",
          isActive && "shadow-[0_0_20px_rgba(0,0,0,0.1)]"
        )}
      >
        <motion.div
          className={cn(
            "relative z-10 flex items-center gap-3",
            isCollapsed ? "justify-center" : "w-full"
          )}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <item.icon className={cn(
            "w-5 h-5 shrink-0 transition-colors",
            isActive ? "text-white" : "text-muted-foreground",
            "group-hover:text-white"
          )} />
          {showLabels && (
            <span className={cn(
              "truncate font-medium transition-colors",
              isActive ? "text-white" : "text-muted-foreground",
              "group-hover:text-white"
            )}>
              {item.label}
            </span>
          )}
          {showLabels && showBadges && item.badge && (
            <Badge variant="secondary" className="ml-auto">
              {item.badge}
            </Badge>
          )}
        </motion.div>
      </Link>
    );

    return showTooltips && !showLabels ? (
      <TooltipProvider key={item.id}>
        <Tooltip>
          <TooltipTrigger asChild>
            {linkContent}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ) : (
      linkContent
    );
  };

  return (
    <nav
      className={cn(
        "flex flex-col gap-2",
        showLabels ? "p-4" : "p-2",
        variant === "glass" && "glass-card",
        className
      )}
    >
      {navigationSections.map((section) => (
        <div key={section.id} className={cn("space-y-1", !showLabels && "space-y-2")}>
          {section.title && showLabels && (
            <h2 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {section.title}
            </h2>
          )}
          <div className={cn("space-y-1", !showLabels && "flex flex-col items-center space-y-2")}>
            {section.items.map((item) => {
              if (item.permissions && !item.permissions.every(permission => hasPermission(permission as keyof Omit<AllPermissions, "role" | "inheritedFromRole" | "customPermissions" | "restrictions" | "hasTimeLimit" | "expiresAt" | "scopedToProjects" | "scopedToDepartments">))) {
                return null;
              }
              return (
                <div key={item.id}>
                  {renderNavigationItem(item)}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
      />
    </nav>
  );
};

// Header Navigation Component  
export const HeaderNavigation: React.FC<MagicUINavigationProps> = ({
  className,
  variant = "default",
  showLabels = true,
  showBadges = true,
  showShortcuts = false,
  items,
  onItemClick,
  enableGlassMorphism = false,
  enableAnimations = true,
}) => {
  const location = useLocation();

  if (!items) return null;

  return (
    <nav className={cn("flex items-center space-x-1", className)}>
      {items.map((item) => {
        const isActive = location.pathname === item.href || 
          (item.href !== "/dashboard" && location.pathname.startsWith(item.href));
        
        const styles = getNavigationItemStyle(item, isActive);

        return (
          <Link
            key={item.id}
            to={item.href}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap",
              styles.base,
              isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary",
              styles.hover,
              styles.focus,
              enableGlassMorphism && styles.glass
            )}
            onClick={(e) => onItemClick?.(item)}
          >
            <item.icon className="h-4 w-4" />
            {showLabels && <span>{item.label}</span>}
            
            {showBadges && item.badge && (
              <Badge className="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-red-500 text-white min-w-[1rem] text-center shadow-sm">
                {item.badge > 99 ? "99+" : item.badge}
              </Badge>
            )}
          </Link>
        );
      })}
    </nav>
  );
};

// Main Magic UI Navigation Component
const MagicUINavigation: React.FC<MagicUINavigationProps> = ({
  layout = "dock",
  ...props
}) => {
  switch (layout) {
    case "dock":
      return <DockNavigation {...props} />;
    case "sidebar":
      return <SidebarNavigation {...props} />;
    case "header":
      return <HeaderNavigation {...props} />;
    default:
      return <DockNavigation {...props} />;
  }
};

export default MagicUINavigation; 