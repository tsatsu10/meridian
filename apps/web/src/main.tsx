import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
import "@/styles/scrollbars.css";
import "@/styles/mobile-widgets.css";
import AuthProvider from "./components/providers/auth-provider";
import useAuth from "./components/providers/auth-provider/hooks/use-auth";
import { ThemeProvider } from "./components/providers/theme-provider";
import { RBACProvider } from "./lib/permissions";
import { RealtimeProvider } from "./providers/realtime-provider";
import { emergencyMemoryCleanup, monitorMemory } from "./utils/emergency-memory-cleanup";
import { routeTree } from "./routeTree.gen";
import { TooltipProvider } from "./components/ui/tooltip";
import WorkspaceProvider from "./components/providers/workspace-provider";
import { initSentry } from "./lib/sentry";

// Initialize Sentry error monitoring first
initSentry();

// Initialize Web Vitals monitoring
// Note: Run 'pnpm install' to install web-vitals package
if (import.meta.env.PROD) {
  import('./lib/web-vitals').then(({ initWebVitals }) => {
    initWebVitals();
  }).catch((error) => {
    console.info('Web Vitals monitoring disabled. Install with: pnpm install');
  });
}

// Lazy load heavy components
const ReactQueryDevtools = lazy(() =>
  import("@tanstack/react-query-devtools").then(module => ({
    default: module.ReactQueryDevtools
  }))
);
const Toaster = lazy(() =>
  import("./components/ui/sonner").then(module => ({
    default: module.Toaster
  }))
);
// Create QueryClient instance with optimized defaults for performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes (reduced from 5 to prevent cache bloat)
      gcTime: 5 * 60 * 1000, // 5 minutes (reduced from 10 to free memory faster)
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
      retryDelay: 1000,
    },
    mutations: {
      retry: 1,
    },
  },
});

// NotFound component for router
function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 dark:text-gray-100 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-4">Page Not Found</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <a
          href="/dashboard"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  defaultNotFoundComponent: NotFound,
  context: {
    user: undefined,
    queryClient,
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function App() {
  const { user } = useAuth();

  return (
    <>
      <RouterProvider router={router} context={{ user, queryClient }} />
    </>
  );
}

const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  // 🚨 EMERGENCY: Make emergency cleanup available immediately
  (window as any).__REACT_QUERY_CLIENT__ = queryClient;
  
  // Make workspace utilities available globally
  import('./utils/clear-workspace-store').then(({ clearWorkspaceStore, setDemoWorkspace }) => {
    (window as any).clearWorkspaceStore = clearWorkspaceStore;
    (window as any).setDemoWorkspace = setDemoWorkspace;
  });
  
  // Log emergency instructions

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
            <ThemeProvider defaultTheme="light" storageKey="meridian-ui-theme">
              <TooltipProvider>
                <AuthProvider>
                  <RBACProvider>
                    <WorkspaceProvider>
                      <RealtimeProvider
                        userId={import.meta.env.VITE_DEMO_USER_ID || 'demo-user'}
                        username={import.meta.env.VITE_DEMO_USERNAME || 'Demo User'}
                        persona={import.meta.env.VITE_DEMO_PERSONA || 'mike'}
                      >
                        <App />
                      </RealtimeProvider>
                    </WorkspaceProvider>
                  </RBACProvider>
                </AuthProvider>
              </TooltipProvider>
              <Suspense fallback={null}>
                <Toaster />
              </Suspense>
            </ThemeProvider>
          {import.meta.env.DEV && (
            <Suspense fallback={null}>
              <ReactQueryDevtools initialIsOpen={false} />
            </Suspense>
          )}
        </Suspense>
      </QueryClientProvider>
    </React.StrictMode>,
  );
}
