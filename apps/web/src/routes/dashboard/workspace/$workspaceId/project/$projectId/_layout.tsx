// @epic-1.1-rbac: Project layout with unified navigation configuration
// @persona-sarah: PM needs comprehensive project navigation and management
// @persona-jennifer: Exec needs project overview and milestone tracking
// @persona-david: Team lead needs team management and reports within projects
// @persona-mike: Dev needs efficient access to tasks, timeline, and settings
// @persona-lisa: Designer needs board views and team collaboration features

import { cn } from "@/lib/cn";
import useProjectStore from "@/store/project";
import { 
  createFileRoute, 
  Link, 
  Outlet, 
  useLocation, 
  useParams 
} from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import icons from "@/constants/project-icons";
import { createElement } from "react";
import { useProjectNavigation, getNavigationItemStyle } from "@/components/navigation/unified-navigation-config";

export const Route = createFileRoute(
  "/dashboard/workspace/$workspaceId/project/$projectId/_layout"
)({
  component: ProjectLayout,
});

function ProjectLayout() {
  const { workspaceId, projectId } = useParams({ strict: false });
  const { project } = useProjectStore();
  const location = useLocation();

  // Get navigation items from unified configuration
  const navigationItems = useProjectNavigation(workspaceId || '', projectId || '');

  const ProjectIcon = project?.icon ? icons[project.icon as keyof typeof icons] : icons.Layout;

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Project Header */}
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link
              to="/dashboard"
              className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
            </Link>
            
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                {ProjectIcon && createElement(ProjectIcon, { className: "h-4 w-4 text-primary" })}
              </div>
              <div>
                <h1 className="text-lg font-semibold">{project?.name || "Loading..."}</h1>
                <p className="text-sm text-muted-foreground">{project?.slug}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              Share
            </Button>
            <Button size="sm">
              New Task
            </Button>
          </div>
        </div>
        
        {/* Project Navigation */}
        <nav className="border-t border-border">
          <div className="flex items-center justify-center px-6 overflow-x-auto">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.href || 
                (item.href !== `/dashboard/workspace/${workspaceId}/project/${projectId}` && 
                 location.pathname.startsWith(item.href));
              
              const styles = getNavigationItemStyle(item, isActive);
              
              return (
                <Link
                  key={item.id}
                  to={item.href}
                  className={cn(
                    "flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap",
                    styles.base,
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted",
                    styles.hover,
                    styles.focus
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  
                  {/* Badge */}
                  {item.badge && (
                    <span className={cn(
                      "px-1.5 py-0.5 text-xs font-semibold rounded-full",
                      "bg-red-500 text-white min-w-[1rem] text-center",
                      "shadow-sm"
                    )}>
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Project Content */}
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
} 