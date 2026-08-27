import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/cn";
import { useOptionalRBACAuth } from "@/lib/permissions/context";
import {
  useSettingsNavigation,
  SETTINGS_GROUP_TITLES,
  type SettingsGroup,
} from "@/components/navigation/unified-navigation-config";

/**
 * The settings sidebar.
 *
 * This markup used to live in `routes/dashboard/settings/_layout.tsx`, which
 * never rendered: TanStack's file router nests children under a pathless
 * layout only when they are named `_layout.<child>.tsx`, and the settings
 * pages are named `settings/<child>.tsx`. So `_layout` was registered as a
 * *sibling* of every page it was meant to wrap, with no children of its own —
 * the whole sidebar was unreachable, and settings pages had no way to reach
 * each other. Rendering it from `routes/dashboard/settings.tsx` (the real
 * parent of every settings route) is what actually puts it on screen.
 */
export function SettingsNav() {
  const { pathname } = useLocation();
  const rbac = useOptionalRBACAuth();
  const settingsNavigation = useSettingsNavigation();

  // `permissions` had been declared on these items since the nav config was
  // written but was never read by anything, so API & Webhooks, Audit Logs and
  // Roles & Permissions were offered to every user regardless of role. Absent
  // an RBAC provider we show the item and let the page's own guard answer —
  // hiding navigation on a missing provider would lock people out of settings
  // they can legitimately reach.
  const visible = settingsNavigation.filter((item) => {
    if (!item.permissions?.length) return true;
    if (!rbac) return true;
    return item.permissions.every((permission) =>
      rbac.hasPermission(permission),
    );
  });

  const groups = visible.reduce(
    (acc, item) => {
      const group = item.group ?? "personal";
      const bucket = acc[group] ?? [];
      bucket.push(item);
      acc[group] = bucket;
      return acc;
    },
    {} as Record<SettingsGroup, typeof visible>,
  );

  // Iterate the title map, not the accumulator, so groups always appear in a
  // stable authored order rather than whichever happened to be seen first.
  const orderedGroups = (
    Object.keys(SETTINGS_GROUP_TITLES) as SettingsGroup[]
  ).filter((group) => groups[group]?.length);

  return (
    <nav aria-label="Settings" className="space-y-6">
      {orderedGroups.map((group) => (
        <div key={group} className="space-y-2">
          <h2 className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {SETTINGS_GROUP_TITLES[group]}
          </h2>
          <div className="space-y-1">
            {groups[group].map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.id}
                  to={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200",
                    isActive
                      ? "border border-primary/20 bg-primary/10 text-primary"
                      : "border border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground dark:hover:bg-secondary-hover",
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.badge ? (
                    <span className="min-w-[1.25rem] rounded-full bg-red-500 px-2 py-0.5 text-center text-xs font-semibold text-white">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export default SettingsNav;
