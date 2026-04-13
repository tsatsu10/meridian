/**
 * Test Wrapper for React Components
 * 
 * Provides all necessary providers for testing:
 * - Router context
 * - Query client
 * - Theme provider
 * - Auth provider
 */

import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory, createRootRoute, createRouter } from '@tanstack/react-router';
import { ThemeProvider } from 'next-themes';

// Create a new query client for each test
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// Mock router for testing
function createTestRouter() {
  const rootRoute = createRootRoute({
    component: () => <div>Root</div>,
  });

  return createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
}

interface TestWrapperProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

export function TestWrapper({ children, queryClient }: TestWrapperProps) {
  const client = queryClient || createTestQueryClient();

  return (
    <QueryClientProvider client={client}>
      <ThemeProvider attribute="class" defaultTheme="light">
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}

// Render options for React Testing Library
export const renderOptions = {
  wrapper: TestWrapper,
};

