// Enterprise universal navigation system with responsive design and accessibility
import React, { Suspense, useMemo } from 'react';
import { cn } from '@/lib/cn';
import { useNavigation } from './providers/NavigationProvider';
import { useBreadcrumbs } from './hooks/useBreadcrumbs';
import { NavHeader } from './components/NavHeader';
import { NavSidebar } from './components/NavSidebar';
import { NavBreadcrumbs } from './components/NavBreadcrumbs';
import { NavSearch } from './components/NavSearch';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  Menu, 
  ChevronLeft, 
  ChevronRight,
  Search,
  Bell,
  Settings,
  HelpCircle
} from 'lucide-react';
import { ErrorBoundary } from 'react-error-boundary';

interface UniversalNavigationProps {
  children: React.ReactNode;
  className?: string;
  
  // Layout configuration
  showBreadcrumbs?: boolean;
  showSearch?: boolean;
  showUserActions?: boolean;
  
  // Responsive behavior
  collapseOnMobile?: boolean;
  mobileBreakpoint?: number;
  
  // Custom components
  headerContent?: React.ReactNode;
  sidebarFooter?: React.ReactNode;
  
  // Accessibility
  ariaLabel?: string;
  skipToContentId?: string;
}

// Error fallback component
function NavigationErrorFallback({ error }: { error: Error }) {
  return (
    <div className="flex items-center justify-center h-16 bg-red-50 border-b border-red-200">
      <div className="text-red-700 text-sm">
        Navigation error: {error.message}
      </div>
    </div>
  );
}

// Loading fallback
function NavigationSkeleton() {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar skeleton */}
      <div className="w-64 border-r bg-muted/50 animate-pulse">
        <div className="p-4 space-y-4">
          <div className="h-8 bg-muted rounded"></div>
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-6 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Main content skeleton */}
      <div className="flex-1 flex flex-col">
        <div className="h-16 border-b bg-muted/50 animate-pulse"></div>
        <div className="flex-1 p-4">
          <div className="h-8 bg-muted rounded mb-4"></div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export const UniversalNavigation: React.FC<UniversalNavigationProps> = ({
  children,
  className,
  showBreadcrumbs = true,
  showSearch = true,
  showUserActions = true,
  collapseOnMobile = true,
  mobileBreakpoint = 768,
  headerContent,
  sidebarFooter,
  ariaLabel = "Main navigation",
  skipToContentId = "main-content",
}) => {
  const { state, toggleSidebar, setMobileOpen } = useNavigation();
  
  // Initialize breadcrumbs
  useBreadcrumbs({
    includeHome: true,
    includeWorkspace: true,
    maxItems: 4,
  });
  
  // Responsive classes
  const sidebarClasses = useMemo(() => cn(
    'bg-background border-r border-border transition-all duration-300 ease-in-out',
    'flex flex-col h-full',
    // Desktop behavior
    'hidden lg:flex',
    state.isCollapsed ? 'w-16' : 'w-64',
    // Custom width for preferences
    !state.isCollapsed && state.preferences.sidebarWidth && {
      width: `${state.preferences.sidebarWidth}px`,
    }
  ), [state.isCollapsed, state.preferences.sidebarWidth]);
  
  const mainClasses = useMemo(() => cn(
    'flex-1 flex flex-col min-h-0 min-w-0',
    'transition-all duration-300 ease-in-out'
  ), []);
  
  const headerClasses = useMemo(() => cn(
    'bg-background border-b border-border',
    'flex items-center justify-between',
    'h-16 px-4 lg:px-6',
    'sticky top-0 z-40'
  ), []);

  return (
    <ErrorBoundary
      FallbackComponent={NavigationErrorFallback}
      onError={(error) => console.error('Navigation error:', error)}
    >
      <div className={cn('flex h-screen bg-background', className)} role="application" aria-label={ariaLabel}>
        {/* Skip to content link for accessibility */}
        <a
          href={`#${skipToContentId}`}
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50"
        >
          Skip to main content
        </a>
        
        {/* Desktop Sidebar */}
        <aside className={sidebarClasses} aria-label="Navigation sidebar">
          <Suspense fallback={<div className="animate-pulse bg-muted h-full" />}>
            <NavSidebar 
              isCollapsed={state.isCollapsed}
              footer={sidebarFooter}
            />
          </Suspense>
        </aside>
        
        {/* Mobile Sidebar */}
        <Sheet open={state.isMobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent 
            side="left" 
            className="w-64 p-0 lg:hidden"
            aria-label="Mobile navigation menu"
          >
            <Suspense fallback={<NavigationSkeleton />}>
              <NavSidebar 
                isCollapsed={false}
                isMobile={true}
                footer={sidebarFooter}
              />
            </Suspense>
          </SheetContent>
        </Sheet>
        
        {/* Main Content Area */}
        <main className={mainClasses}>
          {/* Header */}
          <header className={headerClasses}>
            <div className="flex items-center gap-3">
              {/* Mobile menu trigger */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="lg:hidden"
                    onClick={() => setMobileOpen(true)}
                    aria-label="Open navigation menu"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
              </Sheet>
              
              {/* Desktop sidebar toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className="hidden lg:flex"
                aria-label={state.isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {state.isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
              
              {/* Breadcrumbs */}
              {showBreadcrumbs && (
                <div className="hidden md:block">
                  <Suspense fallback={<div className="h-6 w-32 bg-muted animate-pulse rounded" />}>
                    <NavBreadcrumbs />
                  </Suspense>
                </div>
              )}
            </div>
            
            {/* Header Center Content */}
            <div className="flex-1 flex justify-center px-4">
              {headerContent}
            </div>
            
            {/* Header Actions */}
            <div className="flex items-center gap-2">
              {/* Global Search */}
              {showSearch && (
                <Suspense fallback={<div className="h-9 w-64 bg-muted animate-pulse rounded" />}>
                  <NavSearch />
                </Suspense>
              )}
              
              {/* User Actions */}
              {showUserActions && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="relative"
                    aria-label="Notifications"
                  >
                    <Bell className="h-4 w-4" />
                    {/* Notification badge */}
                    <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Help"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </>
              )}
              
              {/* User Profile */}
              <Suspense fallback={<div className="h-8 w-8 bg-muted animate-pulse rounded-full" />}>
                <NavHeader />
              </Suspense>
            </div>
          </header>
          
          {/* Breadcrumbs Bar (Mobile) */}
          {showBreadcrumbs && (
            <div className="md:hidden border-b border-border px-4 py-2">
              <Suspense fallback={<div className="h-5 w-full bg-muted animate-pulse rounded" />}>
                <NavBreadcrumbs isMobile />
              </Suspense>
            </div>
          )}
          
          {/* Page Content */}
          <div 
            id={skipToContentId}
            className="flex-1 overflow-auto bg-background"
            role="main"
            aria-label="Main content"
            tabIndex={-1}
          >
            <Suspense fallback={<NavigationSkeleton />}>
              {children}
            </Suspense>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
};

// Higher-order component for pages that need navigation
export function withUniversalNavigation<T extends object>(
  Component: React.ComponentType<T>,
  navigationProps?: Partial<UniversalNavigationProps>
) {
  const WrappedComponent = (props: T) => (
    <UniversalNavigation {...navigationProps}>
      <Component {...props} />
    </UniversalNavigation>
  );
  
  WrappedComponent.displayName = `withUniversalNavigation(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

export default UniversalNavigation;