// @epic-1.1-rbac: Sidebar content with unified navigation configuration
// @persona-sarah: PM needs structured navigation with project hierarchy
// @persona-jennifer: Exec needs streamlined access to key metrics
// @persona-david: Team lead needs team management and analytics focus
// @persona-mike: Dev needs efficient task and project navigation
// @persona-lisa: Designer needs project and file management access

import { cn } from "@/lib/cn";
import useWorkspaceStore from "@/store/workspace";
import Workspaces from "./sections/workspaces";
import { useUserPreferencesStore } from "@/store/user-preferences";
import { Link } from "@tanstack/react-router";
import { HelpCircle, Settings } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SidebarNavigation } from "@/components/navigation/magic-ui-navigation";

export function SidebarContent() {
  const { workspace } = useWorkspaceStore();
  const { isSidebarOpened } = useUserPreferencesStore();

  return (
    <TooltipProvider>
      <nav className="flex flex-1 flex-col h-full overflow-y-auto">
        {/* Workspace switcher/creator at the top */}
        <div className={cn(
          "border-b border-border/20",
          isSidebarOpened ? "p-3" : "p-2"
        )}>
          <Workspaces />
        </div>
        
        {/* Main Navigation - Centered */}
        <div className="flex-1 flex flex-col justify-center">
          {workspace && (
            <SidebarNavigation
              layout="sidebar"
              variant="glass"
              showLabels={isSidebarOpened}
              showTooltips={!isSidebarOpened}
              showBadges={isSidebarOpened}
              showShortcuts={false}
              enableGlassMorphism={true}
              enableAnimations={true}
              className="w-full"
            />
          )}
        </div>
        
        {/* Bottom Actions */}
        <div className={cn(
          "border-t border-border/20 space-y-1",
          isSidebarOpened ? "p-3" : "p-2"
        )}>
          {/* Workspace Settings link removed per request */}
          
          {/* Help & Support - Only show when expanded */}
          {isSidebarOpened && (
            <Link
              to="/dashboard/help"
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl w-full",
                "transition-all duration-200 ease-out",
                "hover:bg-white/10 hover:shadow-lg hover:shadow-black/5",
                "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white/10"
              )}
            >
              <HelpCircle className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors duration-200" />
              <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors duration-200">
                Help & Support
              </span>
            </Link>
          )}
        </div>
      </nav>
    </TooltipProvider>
  );
}
