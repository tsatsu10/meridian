// @epic-1.1-rbac: Settings layout with unified navigation configuration
// @persona-sarah: PM needs access to team and workspace settings
// @persona-jennifer: Exec needs billing and member management
// @persona-david: Team lead needs security and integration settings
// @persona-mike: Dev needs API keys and integration settings
// @persona-lisa: Designer needs appearance and notification settings

import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/cn";
import { Settings } from "lucide-react";
import { useSettingsNavigation, getNavigationItemStyle } from "@/components/navigation/unified-navigation-config";

export const Route = createFileRoute("/dashboard/settings/_layout")({
  component: SettingsLayout,
});

function SettingsLayout() {
  const location = useLocation();
  const currentPath = location.pathname;
  
  // Get navigation items from unified configuration
  const settingsNavigation = useSettingsNavigation();

  // Group navigation items by category
  const navigationCategories = settingsNavigation.reduce((acc, item) => {
    const category = item.category || 'general';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, typeof settingsNavigation>);

  const categoryTitles: Record<string, string> = {
    personal: "Personal Settings",
    security: "Security & Privacy", 
    workspace: "Workspace Settings"
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-gradient-dark">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Settings Navigation */}
          <aside className="w-64 shrink-0">
            <nav className="space-y-6">
              {Object.entries(navigationCategories).map(([categoryKey, items]) => (
                <div key={categoryKey} className="space-y-2">
                  {/* Category Title */}
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
                    {categoryTitles[categoryKey] || categoryKey}
                  </h3>
                  
                  {/* Category Items */}
                  <div className="space-y-1">
                    {items.map((item) => {
                      const isActive = currentPath === item.href;
                      const styles = getNavigationItemStyle(item, isActive);
                      
                      return (
                        <Link
                          key={item.id}
                          to={item.href}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200",
                            styles.base,
                            isActive ? [
                              "bg-primary/10 text-primary border border-primary/20",
                              styles.glass
                            ] : [
                              "text-muted-foreground hover:text-foreground hover:bg-secondary dark:hover:bg-secondary-hover",
                              styles.hover,
                              styles.focus
                            ]
                          )}
                        >
                          <item.icon className="w-5 h-5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate">{item.label}</div>
                            {item.description && (
                              <div className="text-xs text-muted-foreground truncate">
                                {item.description}
                              </div>
                            )}
                          </div>
                          
                          {/* Badge */}
                          {item.badge && (
                            <span className={cn(
                              "px-2 py-0.5 text-xs font-semibold rounded-full",
                              "bg-red-500 text-white min-w-[1.25rem] text-center",
                              "shadow-lg"
                            )}>
                              {item.badge > 99 ? "99+" : item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </aside>

          {/* Settings Content */}
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
} 