# Dashboard API Reference

## Overview

This document provides a comprehensive API reference for the Meridian dashboard system, including component APIs, hooks, utilities, and type definitions.

## Table of Contents

1. [Component APIs](#component-apis)
2. [Hook APIs](#hook-apis)
3. [Store APIs](#store-apis)
4. [Utility APIs](#utility-apis)
5. [Type Definitions](#type-definitions)
6. [Widget APIs](#widget-apis)
7. [Accessibility APIs](#accessibility-apis)

## Component APIs

### DashboardOverviewPage

Main dashboard container component that renders the complete dashboard layout.

```typescript
interface DashboardOverviewPageProps {
  /** Optional CSS class name */
  className?: string
  /** Initial dashboard configuration */
  initialConfig?: DashboardConfig
  /** Callback when dashboard layout changes */
  onLayoutChange?: (layout: DashboardLayout) => void
  /** Error boundary fallback component */
  errorFallback?: ComponentType<{ error: Error; reset: () => void }>
}

const DashboardOverviewPage: FC<DashboardOverviewPageProps>
```

**Usage:**
```tsx
<DashboardOverviewPage
  className="custom-dashboard"
  initialConfig={customConfig}
  onLayoutChange={(layout) => saveDashboardLayout(layout)}
/>
```

### DashboardSection

Generic dashboard section wrapper component.

```typescript
interface DashboardSectionProps {
  /** Section title */
  title: string
  /** Optional section description */
  description?: string
  /** Section content */
  children: ReactNode
  /** Optional CSS class name */
  className?: string
  /** Loading state */
  loading?: boolean
  /** Error state */
  error?: string | null
  /** Refresh callback */
  onRefresh?: () => void
  /** Section actions */
  actions?: ReactNode
  /** Accessibility label */
  ariaLabel?: string
  /** Whether section is collapsible */
  collapsible?: boolean
  /** Default collapsed state */
  defaultCollapsed?: boolean
}

const DashboardSection: FC<DashboardSectionProps>
```

**Usage:**
```tsx
<DashboardSection
  title="Project Analytics"
  description="Overview of project metrics and performance"
  loading={isLoading}
  error={error}
  onRefresh={refreshData}
  actions={<RefreshButton />}
  collapsible
>
  <AnalyticsChart data={chartData} />
</DashboardSection>
```

### WidgetContainer

Base container for dashboard widgets with common functionality.

```typescript
interface WidgetContainerProps {
  /** Widget title */
  title: string
  /** Widget description for accessibility */
  description?: string
  /** Widget content */
  children: ReactNode
  /** Widget size */
  size?: WidgetSize
  /** Loading state */
  loading?: boolean
  /** Error state */
  error?: string | null
  /** Refresh callback */
  onRefresh?: () => void
  /** Settings callback */
  onSettings?: () => void
  /** Remove callback */
  onRemove?: () => void
  /** Custom actions */
  actions?: ReactNode
  /** Widget configuration */
  config?: WidgetConfig
  /** Drag handle props for reordering */
  dragHandleProps?: any
}

const WidgetContainer: FC<WidgetContainerProps>
```

### InteractiveChart

Chart component with accessibility and interaction features.

```typescript
interface InteractiveChartProps {
  /** Chart data */
  data: ChartDataPoint[]
  /** Chart type */
  type: ChartType
  /** Chart title */
  title: string
  /** Chart configuration */
  config?: ChartConfig
  /** Accessibility options */
  accessibility?: ChartAccessibilityOptions
  /** Callback when data point is selected */
  onDataPointSelect?: (dataPoint: ChartDataPoint) => void
  /** Custom theme */
  theme?: ChartTheme
}

const InteractiveChart: FC<InteractiveChartProps>
```

## Hook APIs

### useDashboardData

Hook for fetching and managing dashboard data.

```typescript
interface UseDashboardDataOptions {
  /** Workspace ID */
  workspaceId: string
  /** Refresh interval in milliseconds */
  refreshInterval?: number
  /** Whether to enable auto-refresh */
  enabled?: boolean
  /** Initial data */
  initialData?: DashboardData
}

interface UseDashboardDataReturn {
  /** Dashboard data */
  data: DashboardData | undefined
  /** Loading state */
  loading: boolean
  /** Error state */
  error: Error | null
  /** Manual refresh function */
  refresh: () => Promise<void>
  /** Last updated timestamp */
  lastUpdated: Date | null
}

function useDashboardData(options: UseDashboardDataOptions): UseDashboardDataReturn
```

**Usage:**
```tsx
const { data, loading, error, refresh } = useDashboardData({
  workspaceId: 'workspace-123',
  refreshInterval: 30000, // 30 seconds
  enabled: true
})
```

### useWidgetData

Hook for fetching widget-specific data.

```typescript
interface UseWidgetDataOptions {
  /** Widget configuration */
  config: WidgetConfig
  /** Whether to enable data fetching */
  enabled?: boolean
  /** Custom query key */
  queryKey?: QueryKey
}

interface UseWidgetDataReturn<TData = any> {
  /** Widget data */
  data: TData | undefined
  /** Loading state */
  loading: boolean
  /** Error state */
  error: Error | null
  /** Manual refresh function */
  refresh: () => Promise<void>
  /** Update data optimistically */
  updateData: (updater: (data: TData) => TData) => void
}

function useWidgetData<TData = any>(
  options: UseWidgetDataOptions
): UseWidgetDataReturn<TData>
```

### useRealTimeUpdates

Hook for managing real-time dashboard updates via WebSocket.

```typescript
interface UseRealTimeUpdatesOptions {
  /** Workspace ID */
  workspaceId: string
  /** Update handlers */
  handlers?: {
    onDashboardUpdate?: (update: DashboardUpdate) => void
    onWidgetUpdate?: (update: WidgetUpdate) => void
    onNotification?: (notification: Notification) => void
  }
  /** Whether to enable real-time updates */
  enabled?: boolean
}

interface UseRealTimeUpdatesReturn {
  /** Connection status */
  connected: boolean
  /** Connection error */
  error: Error | null
  /** Manual reconnect function */
  reconnect: () => void
  /** Send message function */
  sendMessage: (message: any) => void
}

function useRealTimeUpdates(
  options: UseRealTimeUpdatesOptions
): UseRealTimeUpdatesReturn
```

### useScreenReaderSupport

Hook for adding screen reader support to data visualizations.

```typescript
interface ChartAccessibilityOptions {
  /** Chart title */
  title: string
  /** Chart description */
  description?: string
  /** Chart type */
  chartType: ChartType
  /** Data points */
  dataPoints: ChartDataPoint[]
  /** Enable audio sonification */
  enableSonification?: boolean
  /** Enable keyboard navigation */
  enableKeyboardNav?: boolean
}

interface UseScreenReaderSupportReturn {
  /** Generated chart description for screen readers */
  chartDescription: string
  /** Function to sonify a data point */
  sonifyDataPoint: (dataPoint: ChartDataPoint, duration?: number) => void
  /** Export chart data as CSV */
  exportToCSV: () => void
  /** Navigate through data points */
  navigateData: (direction: 'next' | 'prev') => void
  /** Current focused data point index */
  focusedIndex: number
  /** Whether audio is playing */
  isPlaying: boolean
}

function useScreenReaderSupport(
  options: ChartAccessibilityOptions
): UseScreenReaderSupportReturn
```

### useKeyboardNavigation

Hook for implementing dashboard keyboard navigation.

```typescript
interface KeyboardShortcut {
  /** Key combination */
  keys: string
  /** Shortcut description */
  description: string
  /** Callback function */
  handler: (event: KeyboardEvent) => void
  /** Whether shortcut is enabled */
  enabled?: boolean
}

interface UseKeyboardNavigationOptions {
  /** Custom keyboard shortcuts */
  shortcuts?: KeyboardShortcut[]
  /** Whether to enable default shortcuts */
  enableDefaults?: boolean
  /** Scope element for keyboard events */
  scope?: RefObject<HTMLElement>
}

function useKeyboardNavigation(options?: UseKeyboardNavigationOptions): void
```

**Default Shortcuts:**
- `Ctrl+R`: Refresh dashboard
- `Ctrl+F`: Focus search
- `Ctrl+1-4`: Navigate to dashboard sections
- `Alt+←/→`: Navigate between widgets

## Store APIs

### useDashboardStore

Zustand store for dashboard state management.

```typescript
interface DashboardStore {
  // State
  layout: DashboardLayout
  widgets: DashboardWidget[]
  filters: GlobalFilters
  isCustomizing: boolean
  theme: DashboardTheme

  // Actions
  updateLayout: (layout: DashboardLayout) => void
  addWidget: (widget: DashboardWidget) => void
  removeWidget: (widgetId: string) => void
  updateWidget: (widgetId: string, updates: Partial<DashboardWidget>) => void
  reorderWidgets: (startIndex: number, endIndex: number) => void
  setFilters: (filters: GlobalFilters) => void
  toggleCustomization: () => void
  setTheme: (theme: DashboardTheme) => void

  // Computed getters
  getWidgetById: (id: string) => DashboardWidget | undefined
  getVisibleWidgets: () => DashboardWidget[]
  getWidgetsByType: (type: WidgetType) => DashboardWidget[]
}

const useDashboardStore: StoreApi<DashboardStore>
```

**Usage:**
```tsx
// Access state
const { widgets, isCustomizing } = useDashboardStore()

// Access actions
const { addWidget, toggleCustomization } = useDashboardStore()

// Access computed values
const visibleWidgets = useDashboardStore(state => state.getVisibleWidgets())
```

### useWorkspaceStore

Store for workspace-related state.

```typescript
interface WorkspaceStore {
  // State
  currentWorkspace: Workspace | null
  workspaces: Workspace[]
  permissions: PermissionSet

  // Actions
  setCurrentWorkspace: (workspace: Workspace) => void
  updateWorkspace: (workspaceId: string, updates: Partial<Workspace>) => void
  addWorkspace: (workspace: Workspace) => void
  removeWorkspace: (workspaceId: string) => void
  setPermissions: (permissions: PermissionSet) => void
}

const useWorkspaceStore: StoreApi<WorkspaceStore>
```

## Utility APIs

### Dashboard Utilities

```typescript
// Layout utilities
function calculateOptimalLayout(widgets: DashboardWidget[]): DashboardLayout
function validateLayoutConstraints(layout: DashboardLayout): LayoutValidationResult
function serializeLayout(layout: DashboardLayout): string
function deserializeLayout(serialized: string): DashboardLayout

// Widget utilities
function createWidget(type: WidgetType, config?: Partial<WidgetConfig>): DashboardWidget
function cloneWidget(widget: DashboardWidget): DashboardWidget
function validateWidgetConfig(config: WidgetConfig): ValidationResult
function getWidgetDefaults(type: WidgetType): WidgetConfig

// Data processing utilities
function aggregateMetrics(data: MetricData[]): AggregatedMetrics
function formatChartData(data: any[], config: ChartConfig): ChartDataPoint[]
function calculateTrends(data: TimeSeries[]): TrendAnalysis
function exportDashboardData(widgets: DashboardWidget[], format: ExportFormat): Blob

// Permission utilities
function checkWidgetPermissions(widget: DashboardWidget, user: User): boolean
function filterWidgetsByPermissions(widgets: DashboardWidget[], permissions: PermissionSet): DashboardWidget[]
function canUserCustomizeDashboard(user: User, workspace: Workspace): boolean
```

### Accessibility Utilities

```typescript
// Screen reader utilities
function announceToScreenReader(message: string, priority?: 'polite' | 'assertive'): void
function generateChartDescription(data: ChartDataPoint[], type: ChartType): string
function createDataTable(data: ChartDataPoint[]): HTMLTableElement

// Keyboard navigation utilities
function trapFocus(container: HTMLElement): () => void
function manageFocusFlow(event: KeyboardEvent): void
function findNextFocusableElement(current: Element, direction: 'forward' | 'backward'): Element | null

// Color contrast utilities
function getContrastRatio(color1: string, color2: string): number
function ensureColorContrast(color: string, background: string, ratio?: number): string
function generateAccessibleColorPalette(baseColor: string): string[]
```

### Performance Utilities

```typescript
// Memoization utilities
function memoizeExpensiveCalculation<T, R>(
  fn: (data: T) => R,
  keySelector?: (data: T) => string
): (data: T) => R

// Bundle optimization utilities
function preloadCriticalWidgets(): Promise<void>
function lazyLoadWidget(type: WidgetType): Promise<ComponentType<any>>
function optimizeImageLoading(images: HTMLImageElement[]): void

// Performance monitoring
function measureRenderTime(componentName: string): () => void
function trackMemoryUsage(callback: (usage: MemoryUsage) => void): () => void
function monitorFPS(threshold: number, callback: (fps: number) => void): () => void
```

## Type Definitions

### Core Types

```typescript
// Dashboard types
interface Dashboard {
  id: string
  workspaceId: string
  name: string
  description?: string
  layout: DashboardLayout
  widgets: DashboardWidget[]
  permissions: PermissionSet
  metadata: DashboardMetadata
  createdAt: Date
  updatedAt: Date
}

interface DashboardLayout {
  type: 'grid' | 'flexible' | 'masonry'
  columns: number
  rowHeight: number
  margin: [number, number]
  padding: [number, number]
  breakpoints: Record<string, number>
  responsive: boolean
}

interface DashboardMetadata {
  version: string
  lastModifiedBy: string
  tags: string[]
  category: string
  isTemplate: boolean
  isPublic: boolean
}

// Widget types
interface DashboardWidget {
  id: string
  type: WidgetType
  title: string
  description?: string
  config: WidgetConfig
  data?: WidgetData
  permissions: PermissionConfig
  metadata: WidgetMetadata
  position: WidgetPosition
  createdAt: Date
  updatedAt: Date
}

type WidgetType =
  | 'analytics'
  | 'tasks'
  | 'projects'
  | 'notifications'
  | 'chart'
  | 'table'
  | 'metric'
  | 'calendar'
  | 'activity'
  | 'custom'

interface WidgetConfig {
  size: WidgetSize
  refreshInterval?: number
  autoRefresh: boolean
  filters: FilterConfig
  customization: CustomizationConfig
  display: DisplayConfig
  interactions: InteractionConfig
}

type WidgetSize = 'small' | 'medium' | 'large' | 'extra-large' | 'full-width'

interface WidgetPosition {
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
  maxW?: number
  maxH?: number
  isDraggable?: boolean
  isResizable?: boolean
}

// Chart types
interface ChartDataPoint {
  id: string
  label: string
  value: number
  category?: string
  color?: string
  metadata?: Record<string, any>
  timestamp?: Date
}

type ChartType =
  | 'line'
  | 'bar'
  | 'area'
  | 'pie'
  | 'donut'
  | 'scatter'
  | 'bubble'
  | 'heatmap'
  | 'treemap'
  | 'gauge'

interface ChartConfig {
  type: ChartType
  theme: ChartTheme
  legend: LegendConfig
  axes: AxesConfig
  colors: ColorConfig
  animation: AnimationConfig
  interaction: InteractionConfig
}

// Filter types
interface FilterConfig {
  dateRange?: DateRangeFilter
  categories?: CategoryFilter[]
  users?: UserFilter[]
  projects?: ProjectFilter[]
  custom?: CustomFilter[]
}

interface DateRangeFilter {
  type: 'relative' | 'absolute' | 'custom'
  value: string | [Date, Date]
  label: string
}

// Permission types
interface PermissionSet {
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canShare: boolean
  canCustomize: boolean
  canExport: boolean
  specificPermissions: Record<string, boolean>
}

interface PermissionConfig {
  required: string[]
  optional: string[]
  roles: string[]
  scope: 'dashboard' | 'widget' | 'workspace' | 'global'
}
```

### Accessibility Types

```typescript
interface AccessibilityConfig {
  screenReader: ScreenReaderConfig
  keyboard: KeyboardNavConfig
  visualA11y: VisualAccessibilityConfig
  motor: MotorAccessibilityConfig
}

interface ScreenReaderConfig {
  enabled: boolean
  announcements: boolean
  descriptions: boolean
  sonification: boolean
  tableAlternatives: boolean
}

interface KeyboardNavConfig {
  enabled: boolean
  shortcuts: KeyboardShortcut[]
  tabOrder: 'default' | 'custom'
  focusTrapping: boolean
  skipLinks: boolean
}

interface VisualAccessibilityConfig {
  highContrast: boolean
  reducedMotion: boolean
  fontSize: 'small' | 'medium' | 'large' | 'extra-large'
  colorBlindnessSupport: boolean
  focusIndicators: boolean
}
```

### Performance Types

```typescript
interface PerformanceConfig {
  lazyLoading: boolean
  virtualization: boolean
  memoization: boolean
  caching: CacheConfig
  bundleOptimization: BundleConfig
}

interface CacheConfig {
  queryCache: {
    staleTime: number
    cacheTime: number
    refetchInterval: number
  }
  imageCache: boolean
  componentCache: boolean
}

interface BundleConfig {
  codesplitting: boolean
  treeshaking: boolean
  compression: boolean
  minification: boolean
}
```

## Widget APIs

### Creating Custom Widgets

```typescript
// Widget interface all widgets must implement
interface WidgetComponent<TConfig = any, TData = any> {
  (props: WidgetProps<TConfig, TData>): JSX.Element
  displayName: string
  defaultConfig: TConfig
  configSchema: JSONSchema7
  dataSchema: JSONSchema7
}

interface WidgetProps<TConfig = any, TData = any> {
  config: TConfig
  data?: TData
  loading?: boolean
  error?: Error | null
  onConfigChange?: (config: TConfig) => void
  onRefresh?: () => void
  className?: string
}

// Widget registration
function registerWidget<TConfig, TData>(
  type: string,
  component: WidgetComponent<TConfig, TData>
): void

// Widget factory
function createWidgetFactory<TConfig, TData>(
  type: string,
  defaultConfig: TConfig,
  dataFetcher: (config: TConfig) => Promise<TData>
): WidgetComponent<TConfig, TData>
```

**Example Custom Widget:**
```typescript
interface CustomAnalyticsConfig {
  metric: string
  timeRange: string
  aggregation: 'sum' | 'avg' | 'count'
  visualization: ChartType
}

interface CustomAnalyticsData {
  value: number
  change: number
  trend: 'up' | 'down' | 'stable'
  history: ChartDataPoint[]
}

const CustomAnalyticsWidget: WidgetComponent<
  CustomAnalyticsConfig,
  CustomAnalyticsData
> = ({ config, data, loading, error, onConfigChange }) => {
  if (loading) return <WidgetSkeleton />
  if (error) return <WidgetError error={error} />

  return (
    <div className="custom-analytics-widget">
      <div className="metric-value">
        {data?.value}
        <span className={`trend ${data?.trend}`}>
          {data?.change > 0 ? '+' : ''}{data?.change}%
        </span>
      </div>
      <InteractiveChart
        data={data?.history || []}
        type={config.visualization}
      />
      <WidgetSettings
        config={config}
        onChange={onConfigChange}
      />
    </div>
  )
}

CustomAnalyticsWidget.displayName = 'CustomAnalyticsWidget'
CustomAnalyticsWidget.defaultConfig = {
  metric: 'revenue',
  timeRange: '30d',
  aggregation: 'sum',
  visualization: 'line'
}

// Register the widget
registerWidget('custom-analytics', CustomAnalyticsWidget)
```

## Accessibility APIs

### Screen Reader Integration

```typescript
// Screen reader announcement service
interface ScreenReaderService {
  announce(message: string, priority?: 'polite' | 'assertive'): void
  describeChart(data: ChartDataPoint[], type: ChartType): string
  createDataTable(data: ChartDataPoint[], options?: TableOptions): HTMLElement
  enableSonification(): Promise<AudioContext>
  sonifyData(dataPoint: ChartDataPoint, context: AudioContext): void
}

const screenReaderService: ScreenReaderService

// Usage
screenReaderService.announce('Dashboard updated with new data')
const description = screenReaderService.describeChart(chartData, 'bar')
screenReaderService.sonifyData(dataPoints[0], audioContext)
```

### Keyboard Navigation Service

```typescript
interface KeyboardNavigationService {
  registerShortcut(shortcut: KeyboardShortcut): () => void
  focusWidget(widgetId: string): boolean
  focusNextWidget(): boolean
  focusPreviousWidget(): boolean
  trapFocus(container: HTMLElement): () => void
  createSkipLink(target: string, label: string): HTMLElement
}

const keyboardNavService: KeyboardNavigationService

// Usage
const unregister = keyboardNavService.registerShortcut({
  keys: 'ctrl+shift+r',
  description: 'Refresh all widgets',
  handler: refreshAllWidgets
})

keyboardNavService.focusWidget('analytics-widget-1')
```

---

This API reference provides comprehensive documentation for all public APIs in the dashboard system. Each interface includes TypeScript definitions, usage examples, and detailed descriptions of parameters and return values.