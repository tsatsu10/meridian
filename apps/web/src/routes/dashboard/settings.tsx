import { Outlet, createFileRoute } from "@tanstack/react-router";
import { SettingsNav } from "@/components/navigation/settings-nav";

export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsLayout,
});

/**
 * The real parent of every `/dashboard/settings/*` route, and therefore the
 * only place a shared settings sidebar can live.
 *
 * There was a `settings/_layout.tsx` holding this markup, but TanStack's file
 * router only nests children under a pathless layout when they are named
 * `_layout.<child>.tsx`. The settings pages are named `settings/<child>.tsx`,
 * so `_layout` registered as their *sibling* with no children — it rendered
 * nowhere, and no settings page had any navigation to any other. This file is
 * already their parent, so putting the sidebar here needs no route renames.
 */
function SettingsLayout() {
  return (
    <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Hidden on small screens: the sidebar would push the settings content
       * into an unusable column. Mobile navigates via the settings index grid,
       * which lists the same destinations. */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <SettingsNav />
      </aside>
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
