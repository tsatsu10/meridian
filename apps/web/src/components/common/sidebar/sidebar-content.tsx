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
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarNavigation } from "@/components/navigation/magic-ui-navigation";

export function SidebarContent() {
  const { workspace } = useWorkspaceStore();
  const { isSidebarOpened } = useUserPreferencesStore();

  return (
    <TooltipProvider>
      <nav className="flex flex-1 flex-col h-full overflow-y-auto">
        {/* Workspace switcher/creator at the top */}
        <div
          className={cn(
            "border-b border-border/20",
            isSidebarOpened ? "p-3" : "p-2",
          )}
        >
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
        <div
          className={cn(
            "border-t border-border/20 space-y-1",
            isSidebarOpened ? "p-3" : "p-2",
          )}
        >
          {/* Workspace Settings link removed per request */}
        </div>
      </nav>
    </TooltipProvider>
  );
}
