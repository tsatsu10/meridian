import { CommandPalette } from "@/components/command-palette";
import { ChatWidget } from "@/components/chat/chat-widget";
import { SkipLink } from "@/components/accessibility/skip-link";
import { ErrorBoundary } from "@/components/error-boundary";
import type { LoggedInUser } from "@/types/user";
import type { QueryClient } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  redirect,
  useRouterState,
} from "@tanstack/react-router";
import { chatRoute } from './chat'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  user: LoggedInUser | null | undefined;
}>()({
  component: RootComponent,
  async beforeLoad({ context: { user }, location }) {
    // Skip auth checks in E2E test mode
    if (import.meta.env.VITE_E2E_MODE === 'true') {
      console.log('🧪 E2E mode: Skipping auth guard');
      return;
    }

    const isRouteUnprotected = location.pathname.includes("auth");
    const isOnDashboard = location.pathname.includes("dashboard");
    const isLandingPage = location.pathname === "/";

    // Allow access to landing page without authentication
    if (isLandingPage) {
      return;
    }

    // If user is undefined, it means auth is still loading - don't redirect yet
    if (user === undefined) {
      return;
    }

    // If user is null, it means auth check completed and user is not authenticated
    if (user === null && !isRouteUnprotected) {
      throw redirect({
        to: "/auth/sign-in",
      });
    }

    // If user is authenticated and on auth pages, redirect to dashboard
    if (user && isRouteUnprotected) {
      throw redirect({
        to: "/dashboard",
      });
    }
  },
});

function RootComponent() {
  const router = useRouterState();
  
  // Don't show chat widget on auth pages or landing page
  const showChatWidget = !router.location.pathname.includes('/auth') && router.location.pathname !== '/';
  
  return (
    <ErrorBoundary>
      <SkipLink />
      <div className="flex w-full h-svh overflow-x-hidden overflow-y-hidden flex-row bg-zinc-50 dark:bg-gradient-dark scrollbar-thin scrollbar-thumb-primary scrollbar-track-transparent">
        <main id="main-content" className="flex-1">
          <Outlet />
        </main>
        <CommandPalette />
        {showChatWidget && <ChatWidget />}
      </div>
    </ErrorBoundary>
  );
}

export default RootComponent;
