/**
 * Lazy Loading Utilities
 * 
 * Comprehensive lazy loading system for React components with:
 * - Dynamic imports with error boundaries
 * - Loading states and fallback components
 * - Preloading strategies for better UX
 * - Bundle optimization helpers
 */

import { lazy, Suspense, ComponentType, ReactNode, useState, useEffect } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

// Loading spinner component
const DefaultLoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-3 text-gray-600">Loading...</span>
  </div>
)

// Error fallback component
const DefaultErrorFallback = ({ error, resetErrorBoundary }: any) => (
  <div className="flex flex-col items-center justify-center min-h-[200px] p-4">
    <div className="text-red-600 mb-2">⚠️ Failed to load component</div>
    <p className="text-gray-600 text-sm mb-4">{error?.message}</p>
    <button
      onClick={resetErrorBoundary}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
    >
      Try Again
    </button>
  </div>
)

// Lazy loading options
export interface LazyLoadOptions {
  fallback?: ReactNode
  errorFallback?: ComponentType<any>
  preloadDelay?: number // Delay before preloading in ms
  retryAttempts?: number
  onError?: (error: Error) => void
  onLoad?: () => void
}

// Default options
const defaultOptions: LazyLoadOptions = {
  fallback: <DefaultLoadingSpinner />,
  errorFallback: DefaultErrorFallback,
  preloadDelay: 2000,
  retryAttempts: 3,
}

/**
 * Enhanced lazy loading with error handling and preloading
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
) {
  const opts = { ...defaultOptions, ...options }
  
  // Create the lazy component
  const LazyComponent = lazy(importFn)
  
  // Preload function for eager loading
  const preload = () => {
    if (typeof window !== 'undefined') {
      // Preload after a delay to avoid blocking initial render
      setTimeout(() => {
        importFn().catch(console.error)
      }, opts.preloadDelay)
    }
  }
  
  // Wrapper component with error boundary and suspense
  const LazyWrapper = (props: any) => {
    const [retryCount, setRetryCount] = useState(0)
    
    return (
      <ErrorBoundary
        FallbackComponent={opts.errorFallback}
        onError={(error) => {
          console.error('Lazy component failed to load:', error)
          opts.onError?.(error)
        }}
        onReset={() => {
          if (retryCount < (opts.retryAttempts || 3)) {
            setRetryCount(count => count + 1)
          }
        }}
        resetKeys={[retryCount]}
      >
        <Suspense fallback={opts.fallback}>
          <LazyComponent {...props} />
        </Suspense>
      </ErrorBoundary>
    )
  }
  
  // Attach preload function to component
  ;(LazyWrapper as any).preload = preload
  
  return LazyWrapper
}

/**
 * Route-specific lazy loading for TanStack Router
 */
export function createLazyRoute<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options?: LazyLoadOptions
) {
  return createLazyComponent(importFn, {
    fallback: (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-4 text-lg text-gray-600">Loading page...</span>
      </div>
    ),
    ...options,
  })
}

/**
 * Modal-specific lazy loading
 */
export function createLazyModal<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options?: LazyLoadOptions
) {
  return createLazyComponent(importFn, {
    fallback: (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading modal...</p>
        </div>
      </div>
    ),
    ...options,
  })
}

/**
 * Feature-specific lazy loading with custom loading states
 */
export function createLazyFeature<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  featureName: string,
  options?: LazyLoadOptions
) {
  return createLazyComponent(importFn, {
    fallback: (
      <div className="flex flex-col items-center justify-center p-8 min-h-[300px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-lg font-medium text-gray-700">Loading {featureName}...</p>
        <p className="mt-2 text-sm text-gray-500">This may take a moment</p>
      </div>
    ),
    ...options,
  })
}

/**
 * Preload multiple components for better UX
 */
export function preloadComponents(components: Array<{ preload?: () => void }>) {
  if (typeof window !== 'undefined') {
    // Use requestIdleCallback if available for better performance
    const preloadFn = () => {
      components.forEach(component => {
        if (component.preload) {
          component.preload()
        }
      })
    }
    
    if ('requestIdleCallback' in window) {
      requestIdleCallback(preloadFn)
    } else {
      setTimeout(preloadFn, 100)
    }
  }
}

/**
 * Intersection Observer based lazy loading for components
 */
export function useLazyLoadOnScroll<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadOptions & { rootMargin?: string; threshold?: number } = {}
) {
  const [shouldLoad, setShouldLoad] = useState(false)
  const [Component, setComponent] = useState<T | null>(null)
  
  const observerRef = (node: HTMLElement | null) => {
    if (node && !shouldLoad) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setShouldLoad(true)
            observer.disconnect()
          }
        },
        {
          rootMargin: options.rootMargin || '100px',
          threshold: options.threshold || 0.1,
        }
      )
      
      observer.observe(node)
      return () => observer.disconnect()
    }
  }
  
  useEffect(() => {
    if (shouldLoad && !Component) {
      importFn()
        .then(module => {
          setComponent(() => module.default)
          options.onLoad?.()
        })
        .catch(options.onError || console.error)
    }
  }, [shouldLoad, Component, importFn, options])
  
  return { observerRef, Component, isLoading: shouldLoad && !Component }
}

/**
 * Bundle splitting helpers
 */
export const BundleSplitHelpers = {
  // Dashboard features - lazy load heavy dashboard components
  DashboardAnalytics: createLazyFeature(
    () => import('@/components/dashboard/analytics'),
    'Analytics Dashboard'
  ),
  
  // Communication features - chat is often heavy
  ChatInterface: createLazyFeature(
    () => import('@/components/communication/chat/ChatInterface'),
    'Chat Interface'
  ),
  
  // Task management - kanban can be complex
  KanbanBoard: createLazyFeature(
    () => import('@/components/kanban-board'),
    'Kanban Board'
  ),
  
  // Settings - usually not immediately needed
  SettingsPage: createLazyRoute(
    () => import('@/routes/dashboard/settings/index'),
  ),
  
  // Large modals
  CreateProjectModal: createLazyModal(
    () => import('@/components/shared/modals/create-project-modal'),
  ),
  
  // Chart components - often heavy with visualization libraries
  AdvancedCharts: createLazyFeature(
    () => import('@/components/dashboard/advanced-chart-library'),
    'Advanced Charts'
  ),
}

/**
 * Performance monitoring for lazy loading
 */
export class LazyLoadingMetrics {
  private static metrics = new Map<string, {
    loadTime: number
    errorCount: number
    successCount: number
  }>()
  
  static recordLoad(componentName: string, loadTime: number, success: boolean) {
    const current = this.metrics.get(componentName) || {
      loadTime: 0,
      errorCount: 0,
      successCount: 0
    }
    
    if (success) {
      current.successCount++
      current.loadTime = (current.loadTime + loadTime) / current.successCount
    } else {
      current.errorCount++
    }
    
    this.metrics.set(componentName, current)
  }
  
  static getMetrics() {
    return Object.fromEntries(this.metrics.entries())
  }
  
  static clearMetrics() {
    this.metrics.clear()
  }
}

export default {
  createLazyComponent,
  createLazyRoute,
  createLazyModal,
  createLazyFeature,
  preloadComponents,
  useLazyLoadOnScroll,
  BundleSplitHelpers,
  LazyLoadingMetrics,
}