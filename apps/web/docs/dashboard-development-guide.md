# Dashboard Development Guide

## Overview

This guide provides detailed instructions for developing, maintaining, and extending the Meridian dashboard system. It covers development workflows, coding standards, and best practices specific to the dashboard architecture.

## Table of Contents

1. [Development Setup](#development-setup)
2. [Component Development](#component-development)
3. [Widget Development](#widget-development)
4. [State Management Patterns](#state-management-patterns)
5. [Performance Guidelines](#performance-guidelines)
6. [Accessibility Guidelines](#accessibility-guidelines)
7. [Testing Guidelines](#testing-guidelines)
8. [Debugging and Troubleshooting](#debugging-and-troubleshooting)

## Development Setup

### Prerequisites

```bash
# Required tools
node >= 18.0.0
pnpm >= 8.0.0
git >= 2.30.0

# Recommended VS Code extensions
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense
- ES7+ React/Redux/React-Native snippets
- Auto Rename Tag
- Bracket Pair Colorizer
- GitLens
```

### Local Development Setup

```bash
# Clone and setup
git clone https://github.com/your-org/meridian.git
cd meridian
pnpm install

# Start development servers
pnpm dev:all          # Start all services
pnpm dev              # Start web frontend only
pnpm dev:api          # Start API server only

# Development URLs
Frontend: http://localhost:5173
API:      http://localhost:3005
Docs:     http://localhost:3001
```

### Environment Configuration

```bash
# apps/web/.env.local (create if it doesn't exist)
VITE_API_URL=http://localhost:3005
VITE_WS_URL=ws://localhost:3006
VITE_ENABLE_DEBUG=true
VITE_ENABLE_MOCK_DATA=false

# apps/api/.env (single config file)
NODE_ENV=development
API_PORT=3005
DATABASE_TYPE=postgresql
DATABASE_URL="postgresql://neondb_owner:npg_PoJlUnKCf32a@ep-dry-mode-ae1fy7m1-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require"
DEMO_MODE=true
```

## Component Development

### Dashboard Component Structure

```typescript
// Standard dashboard component template
import React, { memo } from 'react'
import { cn } from '@/lib/utils'

interface DashboardComponentProps {
  className?: string
  children?: React.ReactNode
  // Component-specific props
  data?: ComponentData
  loading?: boolean
  error?: string | null
  onAction?: (action: ComponentAction) => void
}

const DashboardComponent = memo<DashboardComponentProps>(({
  className,
  children,
  data,
  loading,
  error,
  onAction
}) => {
  // Component logic here

  if (loading) {
    return <DashboardComponentSkeleton className={className} />
  }

  if (error) {
    return <DashboardComponentError error={error} className={className} />
  }

  return (
    <div
      className={cn(
        "dashboard-component",
        "bg-white dark:bg-gray-800 rounded-lg shadow-sm border",
        className
      )}
      data-testid="dashboard-component"
    >
      <DashboardComponentHeader onAction={onAction} />
      <DashboardComponentContent data={data}>
        {children}
      </DashboardComponentContent>
    </div>
  )
})

DashboardComponent.displayName = 'DashboardComponent'

export default DashboardComponent
```

### Component Development Checklist

- [ ] **TypeScript**: All props and state properly typed
- [ ] **Accessibility**: ARIA attributes, keyboard navigation
- [ ] **Performance**: Memoization where appropriate
- [ ] **Testing**: Unit tests with good coverage
- [ ] **Documentation**: JSDoc comments for complex logic
- [ ] **Styling**: Tailwind classes, responsive design
- [ ] **Error Handling**: Loading and error states
- [ ] **Data Attributes**: Test IDs for E2E testing

### Component Naming Conventions

```typescript
// File naming: kebab-case
dashboard-stats-section.tsx
analytics-chart-widget.tsx
user-profile-modal.tsx

// Component naming: PascalCase
export const DashboardStatsSection = () => {}
export const AnalyticsChartWidget = () => {}
export const UserProfileModal = () => {}

// Props interface naming: ComponentName + Props
interface DashboardStatsSectionProps {}
interface AnalyticsChartWidgetProps {}
interface UserProfileModalProps {}

// Test file naming: component-name.test.tsx
dashboard-stats-section.test.tsx
analytics-chart-widget.test.tsx
user-profile-modal.test.tsx
```

## Widget Development

### Widget Architecture

```typescript
// Base widget interface
interface DashboardWidget {
  id: string
  type: WidgetType
  title: string
  description?: string
  config: WidgetConfig
  permissions: PermissionConfig
  metadata: WidgetMetadata
}

// Widget configuration
interface WidgetConfig {
  refreshInterval?: number
  size: WidgetSize
  position?: WidgetPosition
  filters?: FilterConfig
  customization?: CustomizationConfig
}

// Widget size options
type WidgetSize = 'small' | 'medium' | 'large' | 'full-width'

// Widget position for drag-and-drop
interface WidgetPosition {
  x: number
  y: number
  w: number
  h: number
}
```

### Creating a New Widget

```typescript
// 1. Define widget types
// src/types/widgets.ts
export type WidgetType = 'analytics' | 'tasks' | 'projects' | 'notifications' | 'custom'

export interface CustomWidgetData {
  // Widget-specific data structure
}

// 2. Create widget component
// src/components/dashboard/widgets/custom-widget.tsx
import React from 'react'
import { useWidgetData } from '@/hooks/use-widget-data'
import { WidgetContainer } from './widget-container'

interface CustomWidgetProps {
  config: WidgetConfig
  onConfigChange?: (config: WidgetConfig) => void
}

export const CustomWidget: React.FC<CustomWidgetProps> = ({
  config,
  onConfigChange
}) => {
  const { data, loading, error, refresh } = useWidgetData(config)

  return (
    <WidgetContainer
      title="Custom Widget"
      loading={loading}
      error={error}
      onRefresh={refresh}
      onSettings={() => openWidgetSettings(config, onConfigChange)}
    >
      <div className="widget-content">
        {/* Widget content */}
        {data && <CustomWidgetContent data={data} />}
      </div>
    </WidgetContainer>
  )
}

// 3. Register widget
// src/components/dashboard/widgets/index.ts
export { CustomWidget } from './custom-widget'

export const widgetRegistry: Record<WidgetType, React.ComponentType<any>> = {
  analytics: AnalyticsWidget,
  tasks: TasksWidget,
  projects: ProjectsWidget,
  notifications: NotificationsWidget,
  custom: CustomWidget, // Add new widget here
}

// 4. Create widget hook
// src/hooks/widgets/use-custom-widget.ts
export const useCustomWidget = (config: WidgetConfig) => {
  const queryKey = ['widget', 'custom', config.id, config.filters]

  return useQuery({
    queryKey,
    queryFn: () => fetchCustomWidgetData(config),
    staleTime: config.refreshInterval || 5 * 60 * 1000,
    refetchInterval: config.refreshInterval,
    enabled: config.enabled !== false
  })
}
```

### Widget Development Best Practices

#### 1. Data Management

```typescript
// Use consistent data fetching patterns
const useWidgetData = (config: WidgetConfig) => {
  const { data, loading, error, refetch } = useQuery({
    queryKey: ['widget-data', config.type, config.id],
    queryFn: () => widgetAPI.fetchData(config),
    staleTime: config.cacheTime || 5 * 60 * 1000,
    enabled: config.enabled !== false
  })

  // Auto-refresh logic
  useEffect(() => {
    if (!config.refreshInterval) return

    const interval = setInterval(refetch, config.refreshInterval)
    return () => clearInterval(interval)
  }, [config.refreshInterval, refetch])

  return { data, loading, error, refresh: refetch }
}
```

#### 2. Error Handling

```typescript
// Comprehensive error handling for widgets
const WidgetErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="widget-error p-4 text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-2">Widget failed to load</p>
          <button
            onClick={resetError}
            className="text-xs bg-blue-500 text-white px-3 py-1 rounded"
          >
            Try Again
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}

// Usage in widget container
<WidgetErrorBoundary>
  <CustomWidget config={config} />
</WidgetErrorBoundary>
```

#### 3. Performance Optimization

```typescript
// Memoize expensive widget calculations
const ProcessedWidgetData = memo<{ data: WidgetData }>(({ data }) => {
  const processedData = useMemo(() => {
    return expensiveDataProcessing(data)
  }, [data])

  return <WidgetVisualization data={processedData} />
})

// Virtualize large widget lists
const VirtualizedWidgetList = ({ widgets }) => (
  <FixedSizeList
    height={400}
    itemCount={widgets.length}
    itemSize={120}
    itemData={widgets}
  >
    {({ index, style, data }) => (
      <div style={style}>
        <WidgetListItem widget={data[index]} />
      </div>
    )}
  </FixedSizeList>
)
```

## State Management Patterns

### Global State with Zustand

```typescript
// Dashboard-specific store
interface DashboardStore {
  // State
  layout: DashboardLayout
  widgets: DashboardWidget[]
  filters: GlobalFilters
  isCustomizing: boolean

  // Actions
  updateLayout: (layout: DashboardLayout) => void
  addWidget: (widget: DashboardWidget) => void
  removeWidget: (widgetId: string) => void
  updateWidget: (widgetId: string, updates: Partial<DashboardWidget>) => void
  setFilters: (filters: GlobalFilters) => void
  toggleCustomization: () => void

  // Computed values
  getWidgetById: (id: string) => DashboardWidget | undefined
  getVisibleWidgets: () => DashboardWidget[]
}

const useDashboardStore = create<DashboardStore>((set, get) => ({
  layout: defaultLayout,
  widgets: [],
  filters: defaultFilters,
  isCustomizing: false,

  updateLayout: (layout) => set({ layout }),

  addWidget: (widget) => set((state) => ({
    widgets: [...state.widgets, widget]
  })),

  removeWidget: (widgetId) => set((state) => ({
    widgets: state.widgets.filter(w => w.id !== widgetId)
  })),

  updateWidget: (widgetId, updates) => set((state) => ({
    widgets: state.widgets.map(w =>
      w.id === widgetId ? { ...w, ...updates } : w
    )
  })),

  setFilters: (filters) => set({ filters }),

  toggleCustomization: () => set((state) => ({
    isCustomizing: !state.isCustomizing
  })),

  // Computed getters
  getWidgetById: (id) => get().widgets.find(w => w.id === id),

  getVisibleWidgets: () => get().widgets.filter(w =>
    w.permissions.canView && w.config.visible !== false
  )
}))
```

### Server State with TanStack Query

```typescript
// Dashboard queries
export const dashboardQueries = {
  // Query keys factory
  keys: {
    all: ['dashboard'] as const,
    workspace: (workspaceId: string) =>
      [...dashboardQueries.keys.all, 'workspace', workspaceId] as const,
    analytics: (workspaceId: string, filters: AnalyticsFilters) =>
      [...dashboardQueries.keys.workspace(workspaceId), 'analytics', filters] as const,
    widgets: (workspaceId: string) =>
      [...dashboardQueries.keys.workspace(workspaceId), 'widgets'] as const,
  },

  // Query functions
  dashboard: (workspaceId: string) => ({
    queryKey: dashboardQueries.keys.workspace(workspaceId),
    queryFn: () => dashboardAPI.getDashboard(workspaceId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  }),

  analytics: (workspaceId: string, filters: AnalyticsFilters) => ({
    queryKey: dashboardQueries.keys.analytics(workspaceId, filters),
    queryFn: () => analyticsAPI.getData(workspaceId, filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  }),

  widgets: (workspaceId: string) => ({
    queryKey: dashboardQueries.keys.widgets(workspaceId),
    queryFn: () => widgetAPI.getWidgets(workspaceId),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Usage in components
const useDashboardData = (workspaceId: string) => {
  return useQuery(dashboardQueries.dashboard(workspaceId))
}

const useAnalyticsData = (workspaceId: string, filters: AnalyticsFilters) => {
  return useQuery(dashboardQueries.analytics(workspaceId, filters))
}
```

### State Synchronization Patterns

```typescript
// Sync Zustand store with server state
const useSyncDashboardState = (workspaceId: string) => {
  const { data: serverWidgets } = useQuery(dashboardQueries.widgets(workspaceId))
  const { widgets, updateWidget } = useDashboardStore()

  // Sync server state to local state
  useEffect(() => {
    if (serverWidgets) {
      serverWidgets.forEach(serverWidget => {
        const localWidget = widgets.find(w => w.id === serverWidget.id)
        if (!localWidget || localWidget.version < serverWidget.version) {
          updateWidget(serverWidget.id, serverWidget)
        }
      })
    }
  }, [serverWidgets, widgets, updateWidget])
}
```

## Performance Guidelines

### Code Splitting Strategies

```typescript
// Route-level splitting
const DashboardAnalytics = lazy(() =>
  import('../routes/dashboard/analytics').then(module => ({
    default: module.AnalyticsPage
  }))
)

// Component-level splitting
const HeavyAnalyticsWidget = lazy(() =>
  import('../components/widgets/analytics-widget').then(module => ({
    default: module.AnalyticsWidget
  }))
)

// Dynamic widget loading
const loadWidget = async (widgetType: WidgetType) => {
  const widgetModule = await import(`../widgets/${widgetType}-widget`)
  return widgetModule.default
}

// Preload critical widgets
const preloadCriticalWidgets = () => {
  import('../widgets/tasks-widget')
  import('../widgets/projects-widget')
}
```

### Memoization Best Practices

```typescript
// Component memoization
const ExpensiveWidget = memo<WidgetProps>(({ data, config }) => {
  // Heavy computations
  const processedData = useMemo(() =>
    heavyDataProcessing(data), [data]
  )

  // Stable callbacks
  const handleDataUpdate = useCallback((newData) => {
    updateData(config.id, newData)
  }, [config.id])

  return <WidgetDisplay data={processedData} onUpdate={handleDataUpdate} />
}, (prevProps, nextProps) => {
  // Custom comparison for complex props
  return (
    prevProps.data === nextProps.data &&
    isEqual(prevProps.config, nextProps.config)
  )
})

// Hook memoization
const useExpensiveCalculation = (data: ComplexData) => {
  return useMemo(() => {
    if (!data) return null

    // Expensive calculation
    return data.items.reduce((acc, item) => ({
      ...acc,
      [item.category]: calculateComplexMetrics(item)
    }), {})
  }, [data])
}
```

### Bundle Optimization

```typescript
// vite.config.ts - Optimized chunking
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Framework chunks
          'react-vendor': ['react', 'react-dom'],
          'router-vendor': ['@tanstack/react-router'],
          'query-vendor': ['@tanstack/react-query'],

          // UI library chunks
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select'
          ],

          // Chart library chunks
          'chart-vendor': ['recharts', 'd3-scale', 'd3-shape'],

          // Dashboard chunks
          'dashboard-core': [
            './src/components/dashboard/index.ts',
            './src/store/dashboard.ts'
          ],
          'dashboard-widgets': ['./src/components/widgets'],
          'dashboard-analytics': ['./src/components/analytics']
        }
      }
    }
  }
})
```

## Accessibility Guidelines

### ARIA Implementation

```typescript
// Widget accessibility wrapper
const AccessibleWidget = ({
  title,
  description,
  children,
  loading,
  error
}: AccessibleWidgetProps) => {
  const descriptionId = useId()
  const titleId = useId()

  return (
    <section
      role="region"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      aria-live={loading ? "polite" : undefined}
      aria-busy={loading}
    >
      <h3 id={titleId} className="widget-title">
        {title}
      </h3>

      {description && (
        <p id={descriptionId} className="widget-description sr-only">
          {description}
        </p>
      )}

      {loading && (
        <div aria-label="Loading widget data" role="status">
          <span className="sr-only">Loading...</span>
          <Spinner />
        </div>
      )}

      {error && (
        <div role="alert" className="widget-error">
          <span className="sr-only">Error: </span>
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="widget-content">
          {children}
        </div>
      )}
    </section>
  )
}
```

### Keyboard Navigation

```typescript
// Dashboard keyboard navigation
const useDashboardKeyboardNav = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      const { key, ctrlKey, altKey, shiftKey } = e

      if (ctrlKey) {
        switch (key) {
          case 'r':
            e.preventDefault()
            refreshAllWidgets()
            announceToScreenReader('Dashboard refreshed')
            break

          case 'f':
            e.preventDefault()
            focusSearchInput()
            break

          case '1':
          case '2':
          case '3':
          case '4':
            e.preventDefault()
            const sectionIndex = parseInt(key) - 1
            focusDashboardSection(sectionIndex)
            break
        }
      }

      // Widget navigation
      if (altKey) {
        switch (key) {
          case 'ArrowLeft':
            e.preventDefault()
            focusPreviousWidget()
            break

          case 'ArrowRight':
            e.preventDefault()
            focusNextWidget()
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])
}

// Focus management utilities
const focusDashboardSection = (index: number) => {
  const sections = document.querySelectorAll('[role="region"]')
  const section = sections[index]
  if (section instanceof HTMLElement) {
    section.focus()
    section.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

const focusNextWidget = () => {
  const widgets = document.querySelectorAll('.widget[tabindex="0"]')
  const currentIndex = Array.from(widgets).findIndex(w => w === document.activeElement)
  const nextIndex = (currentIndex + 1) % widgets.length
  const nextWidget = widgets[nextIndex] as HTMLElement
  nextWidget?.focus()
}
```

## Testing Guidelines

### Component Testing Patterns

```typescript
// Complete component test example
describe('DashboardAnalyticsWidget', () => {
  const mockAnalyticsData = {
    metrics: [
      { name: 'Total Tasks', value: 42, change: +12 },
      { name: 'Completed Tasks', value: 38, change: +8 }
    ],
    charts: [
      { type: 'line', data: mockChartData }
    ]
  }

  const renderWidget = (props = {}) => {
    return render(
      <QueryClientProvider client={createTestQueryClient()}>
        <DashboardAnalyticsWidget
          config={{ id: 'test-widget', size: 'medium' }}
          {...props}
        />
      </QueryClientProvider>
    )
  }

  beforeEach(() => {
    // Mock API calls
    server.use(
      rest.get('/api/analytics/dashboard', (req, res, ctx) => {
        return res(ctx.json(mockAnalyticsData))
      })
    )
  })

  describe('Rendering', () => {
    test('should render widget title and metrics', async () => {
      renderWidget()

      expect(screen.getByRole('region', { name: /analytics/i }))
        .toBeInTheDocument()

      await waitFor(() => {
        expect(screen.getByText('Total Tasks')).toBeInTheDocument()
        expect(screen.getByText('42')).toBeInTheDocument()
      })
    })

    test('should show loading state initially', () => {
      renderWidget()

      expect(screen.getByRole('status', { name: /loading/i }))
        .toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    test('should refresh data when refresh button is clicked', async () => {
      const refreshSpy = jest.fn()
      renderWidget({ onRefresh: refreshSpy })

      await waitFor(() => {
        expect(screen.getByText('42')).toBeInTheDocument()
      })

      const refreshButton = screen.getByRole('button', { name: /refresh/i })
      await userEvent.click(refreshButton)

      expect(refreshSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('Accessibility', () => {
    test('should have proper ARIA attributes', async () => {
      renderWidget()

      const widget = screen.getByRole('region')
      expect(widget).toHaveAttribute('aria-labelledby')

      await waitFor(() => {
        const metrics = screen.getAllByRole('listitem')
        expect(metrics).toHaveLength(2)

        metrics.forEach(metric => {
          expect(metric).toHaveAttribute('aria-label')
        })
      })
    })

    test('should be keyboard navigable', async () => {
      renderWidget()

      const widget = screen.getByRole('region')
      widget.focus()

      await userEvent.keyboard('{Tab}')

      const refreshButton = screen.getByRole('button', { name: /refresh/i })
      expect(refreshButton).toHaveFocus()
    })
  })

  describe('Error Handling', () => {
    test('should display error state when API fails', async () => {
      server.use(
        rest.get('/api/analytics/dashboard', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Server error' }))
        })
      )

      renderWidget()

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/error/i)
      })
    })
  })
})
```

### E2E Testing Patterns

```typescript
// Dashboard E2E test patterns
test.describe('Dashboard Widget Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible()
  })

  test('should add and configure new widget', async ({ page }) => {
    // Open widget customization
    await page.click('[data-testid="customize-dashboard"]')
    await expect(page.locator('[data-testid="customization-panel"]')).toBeVisible()

    // Add new widget
    await page.click('[data-testid="add-widget"]')
    await page.selectOption('[data-testid="widget-type"]', 'analytics')
    await page.fill('[data-testid="widget-title"]', 'Test Analytics Widget')

    // Configure widget
    await page.click('[data-testid="widget-size-medium"]')
    await page.click('[data-testid="save-widget"]')

    // Verify widget appears
    await expect(page.locator('[data-testid="widget-test-analytics-widget"]'))
      .toBeVisible()

    // Verify widget functionality
    const widget = page.locator('[data-testid="widget-test-analytics-widget"]')
    await expect(widget.locator('[data-testid="widget-content"]')).toBeVisible()
  })

  test('should drag and drop widgets to reorder', async ({ page }) => {
    const firstWidget = page.locator('[data-testid="widget"]').first()
    const secondWidget = page.locator('[data-testid="widget"]').nth(1)

    // Get initial positions
    const firstWidgetBox = await firstWidget.boundingBox()
    const secondWidgetBox = await secondWidget.boundingBox()

    // Perform drag and drop
    await firstWidget.dragTo(secondWidget)

    // Wait for reorder animation
    await page.waitForTimeout(1000)

    // Verify positions changed
    const newFirstWidgetBox = await firstWidget.boundingBox()
    expect(newFirstWidgetBox?.y).toBeGreaterThan(firstWidgetBox?.y || 0)
  })
})
```

## Debugging and Troubleshooting

### Development Tools

```typescript
// Dashboard debug utilities
const dashboardDebug = {
  // Log widget states
  logWidgetStates: () => {
    const widgets = useDashboardStore.getState().widgets
    console.group('🔍 Dashboard Widget States')
    widgets.forEach(widget => {
      console.log(`Widget: ${widget.title}`, {
        id: widget.id,
        type: widget.type,
        config: widget.config,
        lastUpdated: widget.metadata?.lastUpdated
      })
    })
    console.groupEnd()
  },

  // Monitor query states
  logQueryStates: () => {
    const queryClient = useQueryClient()
    const queries = queryClient.getQueryCache().getAll()

    console.group('🔍 Query States')
    queries.forEach(query => {
      console.log(`Query: ${query.queryKey.join(' > ')}`, {
        state: query.state.status,
        data: !!query.state.data,
        error: query.state.error?.message,
        lastUpdated: query.state.dataUpdatedAt
      })
    })
    console.groupEnd()
  },

  // Performance profiling
  profileComponentRender: (componentName: string) => {
    performance.mark(`${componentName}-render-start`)

    return () => {
      performance.mark(`${componentName}-render-end`)
      performance.measure(
        `${componentName}-render`,
        `${componentName}-render-start`,
        `${componentName}-render-end`
      )

      const measure = performance.getEntriesByName(`${componentName}-render`)[0]
      console.log(`⏱️ ${componentName} render time: ${measure.duration.toFixed(2)}ms`)
    }
  }
}

// Usage in development
if (process.env.NODE_ENV === 'development') {
  // Expose debug tools globally
  window.dashboardDebug = dashboardDebug

  // Auto-log on errors
  window.addEventListener('error', (event) => {
    console.group('🚨 Dashboard Error')
    console.error(event.error)
    dashboardDebug.logWidgetStates()
    dashboardDebug.logQueryStates()
    console.groupEnd()
  })
}
```

### Common Issues and Solutions

#### Performance Issues

```typescript
// Problem: Slow widget rendering
// Solution: Implement proper memoization

// ❌ Bad - Re-renders on every parent update
const SlowWidget = ({ data, config }) => {
  const processedData = expensiveCalculation(data)
  return <WidgetDisplay data={processedData} />
}

// ✅ Good - Memoized expensive calculation
const FastWidget = memo(({ data, config }) => {
  const processedData = useMemo(() =>
    expensiveCalculation(data), [data]
  )
  return <WidgetDisplay data={processedData} />
})

// Problem: Memory leaks in WebSocket connections
// Solution: Proper cleanup in useEffect

// ❌ Bad - No cleanup
const BadWebSocketWidget = () => {
  useEffect(() => {
    const socket = io('/dashboard')
    socket.on('update', handleUpdate)
  }, [])
}

// ✅ Good - Proper cleanup
const GoodWebSocketWidget = () => {
  useEffect(() => {
    const socket = io('/dashboard')
    socket.on('update', handleUpdate)

    return () => {
      socket.off('update', handleUpdate)
      socket.disconnect()
    }
  }, [])
}
```

#### State Management Issues

```typescript
// Problem: Stale state in widgets
// Solution: Use query invalidation properly

const useWidgetRefresh = (widgetId: string) => {
  const queryClient = useQueryClient()

  const refreshWidget = useCallback(() => {
    // Invalidate specific widget queries
    queryClient.invalidateQueries(['widget', widgetId])

    // Also invalidate related dashboard queries
    queryClient.invalidateQueries(['dashboard'])
  }, [queryClient, widgetId])

  return refreshWidget
}

// Problem: Race conditions in widget updates
// Solution: Use optimistic updates with rollback

const useOptimisticWidgetUpdate = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateWidget,
    onMutate: async (newWidget) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries(['widgets'])

      // Snapshot previous value
      const previousWidgets = queryClient.getQueryData(['widgets'])

      // Optimistically update
      queryClient.setQueryData(['widgets'], (old) =>
        old?.map(widget =>
          widget.id === newWidget.id ? { ...widget, ...newWidget } : widget
        )
      )

      return { previousWidgets }
    },
    onError: (err, newWidget, context) => {
      // Rollback on error
      queryClient.setQueryData(['widgets'], context?.previousWidgets)
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries(['widgets'])
    }
  })
}
```

### Debugging Checklist

- [ ] **Console Logs**: Check browser console for errors
- [ ] **Network Tab**: Verify API calls are completing successfully
- [ ] **React DevTools**: Inspect component state and props
- [ ] **Query DevTools**: Check TanStack Query cache state
- [ ] **Performance Tab**: Profile component render times
- [ ] **Accessibility**: Test with screen reader and keyboard navigation
- [ ] **Memory Leaks**: Check for uncleaned event listeners and timers

---

This development guide provides the foundation for building high-quality, maintainable dashboard components that follow established patterns and best practices.