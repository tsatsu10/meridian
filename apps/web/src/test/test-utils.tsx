import { ReactElement, ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { routeTree } from '../routeTree.gen'

// Mock providers for testing
const TestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
      staleTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
})

const TestRouter = (initialEntries: string[] = ['/']) => {
  const history = createMemoryHistory({
    initialEntries,
  })

  return createRouter({
    routeTree,
    history,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    context: {
      user: {
        id: 'test-user',
        email: 'test@meridian.app',
        name: 'Test User',
        role: 'workspace-manager',
      },
      queryClient: TestQueryClient(),
    },
  })
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[]
  user?: any
  queryClient?: QueryClient
  withRouter?: boolean
  withAuth?: boolean
}

const AllTheProviders = ({
  children,
  queryClient = TestQueryClient(),
  initialEntries = ['/'],
  withRouter = false,
  withAuth = true,
}: {
  children: ReactNode
  queryClient?: QueryClient
  initialEntries?: string[]
  withRouter?: boolean
  withAuth?: boolean
}) => {
  if (withRouter) {
    const router = TestRouter(initialEntries)
    
    return (
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const {
    initialEntries = ['/'],
    queryClient = TestQueryClient(),
    withRouter = false,
    withAuth = true,
    ...renderOptions
  } = options

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <AllTheProviders
      queryClient={queryClient}
      initialEntries={initialEntries}
      withRouter={withRouter}
      withAuth={withAuth}
    >
      {children}
    </AllTheProviders>
  )

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Mock factories for consistent test data
export const createMockUser = (overrides = {}) => ({
  id: 'user-1',
  email: 'test@meridian.app',
  name: 'Test User',
  role: 'workspace-manager',
  createdAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
})

export const createMockWorkspace = (overrides = {}) => ({
  id: 'workspace-1',
  name: 'Test Workspace',
  description: 'A test workspace',
  createdAt: '2024-01-01T00:00:00.000Z',
  ownerId: 'user-1',
  ...overrides,
})

export const createMockProject = (overrides = {}) => ({
  id: 'project-1',
  name: 'Test Project',
  description: 'A test project',
  workspaceId: 'workspace-1',
  status: 'active' as const,
  createdAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
})

export const createMockTask = (overrides = {}) => ({
  id: 'task-1',
  title: 'Test Task',
  description: 'A test task description',
  status: 'todo' as const,
  priority: 'medium' as const,
  projectId: 'project-1',
  assigneeId: 'user-1',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
})

export const createMockMessage = (overrides = {}) => ({
  id: 'msg-1',
  content: 'Test message',
  channelId: 'channel-1',
  senderId: 'user-1',
  createdAt: '2024-01-01T00:00:00.000Z',
  type: 'text' as const,
  ...overrides,
})

// Testing utilities
export const waitForLoadingToFinish = () => 
  new Promise(resolve => setTimeout(resolve, 0))

export const createQueryClientWithMockData = (mockData: Record<string, any>) => {
  const queryClient = TestQueryClient()
  
  Object.entries(mockData).forEach(([queryKey, data]) => {
    queryClient.setQueryData([queryKey], data)
  })
  
  return queryClient
}

export const mockLocalStorage = () => {
  const storage: Record<string, string> = {}
  
  return {
    getItem: (key: string) => storage[key] || null,
    setItem: (key: string, value: string) => {
      storage[key] = value
    },
    removeItem: (key: string) => {
      delete storage[key]
    },
    clear: () => {
      Object.keys(storage).forEach(key => delete storage[key])
    },
    length: Object.keys(storage).length,
    key: (index: number) => Object.keys(storage)[index] || null,
  }
}

export const mockSessionStorage = mockLocalStorage

// Performance testing utilities
export const measureRenderTime = async (renderFn: () => void) => {
  const start = performance.now()
  await renderFn()
  const end = performance.now()
  return end - start
}

export const expectPerformantRender = async (
  renderFn: () => void,
  maxTimeMs: number = 100
) => {
  const renderTime = await measureRenderTime(renderFn)
  if (renderTime > maxTimeMs) {
    throw new Error(`Render took ${renderTime}ms, expected < ${maxTimeMs}ms`)
  }
}

// Accessibility testing utilities
export const expectAccessibleElement = (element: HTMLElement) => {
  // Check for basic accessibility attributes
  if (element.tagName === 'BUTTON' && !element.getAttribute('aria-label') && !element.textContent?.trim()) {
    throw new Error('Button element should have accessible text or aria-label')
  }
  
  if (element.tagName === 'IMG' && !element.getAttribute('alt')) {
    throw new Error('Image element should have alt text')
  }
  
  if (element.tagName === 'INPUT' && element.getAttribute('type') !== 'hidden' && !element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby')) {
    throw new Error('Input element should have accessible label')
  }
}

// Network mocking utilities
export const mockFetchSuccess = (data: any) => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  })
}

export const mockFetchError = (status: number = 500, message: string = 'Server Error') => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ error: message }),
    text: () => Promise.resolve(JSON.stringify({ error: message })),
  })
}

export const mockFetchNetworkError = () => {
  global.fetch = vi.fn().mockRejectedValue(new Error('Network Error'))
}

// WebSocket mocking utilities
export const createMockSocket = () => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  connected: true,
  id: 'mock-socket-id',
})

// Export everything from testing-library
export * from '@testing-library/react'
export { customRender as render }
export { userEvent } from '@testing-library/user-event'