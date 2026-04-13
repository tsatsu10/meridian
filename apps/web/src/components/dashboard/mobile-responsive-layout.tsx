import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, 
  X, 
  ChevronLeft, 
  Home, 
  CheckSquare, 
  BarChart3, 
  Settings,
  Users,
  Calendar,
  FileText,
  Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MobileResponsiveLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  rightAction?: React.ReactNode;
  className?: string;
}

interface NavigationItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  badge?: number;
}

const navigationItems: NavigationItem[] = [
  { icon: Home, label: 'Dashboard', href: '/dashboard' },
  { icon: CheckSquare, label: 'Tasks', href: '/dashboard/all-tasks' },
  { icon: BarChart3, label: 'Analytics', href: '/dashboard/analytics' },
  { icon: Calendar, label: 'Calendar', href: '/dashboard/calendar' },
  { icon: Users, label: 'Teams', href: '/dashboard/teams' },
  { icon: FileText, label: 'Reports', href: '/dashboard/analytics' },
  { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
];

export function MobileResponsiveLayout({
  children,
  title,
  showBackButton = false,
  onBackClick,
  rightAction,
  className
}: MobileResponsiveLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [notifications, setNotifications] = useState(3);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {/* Mobile Header */}
      {isMobile && (
        <motion.header 
          className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              {showBackButton ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBackClick}
                  className="p-2 h-auto"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMobileMenu}
                  className="p-2 h-auto"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              )}
              
              {title && (
                <h1 className="text-lg font-semibold truncate max-w-[200px]">
                  {title}
                </h1>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Notifications */}
              <Button variant="ghost" size="sm" className="p-2 h-auto relative">
                <Bell className="h-5 w-5" />
                {notifications > 0 && (
                  <motion.span
                    className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    {notifications > 9 ? '9+' : notifications}
                  </motion.span>
                )}
              </Button>

              {rightAction}
            </div>
          </div>
        </motion.header>
      )}

      {/* Mobile Navigation Overlay */}
      <AnimatePresence>
        {isMobile && isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/50 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMobileMenu}
            />

            {/* Navigation Panel */}
            <motion.nav
              className="fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-background border-r z-50 overflow-y-auto"
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                      <span className="text-primary-foreground font-bold text-sm">K</span>
                    </div>
                    <span className="font-semibold text-lg">Meridian</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closeMobileMenu}
                    className="p-2 h-auto"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {/* Navigation Items */}
                <div className="space-y-2">
                  {navigationItems.map((item) => (
                    <motion.a
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent transition-colors"
                      onClick={closeMobileMenu}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <item.icon className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </motion.a>
                  ))}
                </div>

                {/* User Profile */}
                <div className="mt-8 pt-6 border-t">
                  <div className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent transition-colors">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">JD</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">John Doe</p>
                      <p className="text-sm text-muted-foreground truncate">john@meridian.app</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={cn(
        "flex-1",
        isMobile ? "pb-safe" : "",
        className
      )}>
        {children}
      </main>

      {/* Mobile Bottom Navigation (Alternative) */}
      {isMobile && (
        <motion.nav 
          className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t z-40 pb-safe"
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.1 }}
        >
          <div className="flex items-center justify-around px-2 py-2">
            {navigationItems.slice(0, 5).map((item) => (
              <motion.a
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-accent transition-colors min-w-0"
                whileTap={{ scale: 0.95 }}
              >
                <item.icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs font-medium truncate max-w-[60px]">
                  {item.label}
                </span>
              </motion.a>
            ))}
          </div>
        </motion.nav>
      )}
    </div>
  );
}

// Touch-friendly button variants
export const TouchButton = motion(Button);

// Swipe gesture hook for mobile interactions
export function useSwipeGesture(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  threshold = 50
) {
  const [startX, setStartX] = useState<number | null>(null);
  const [startY, setStartY] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!startX || !startY) return;

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    
    const deltaX = endX - startX;
    const deltaY = endY - startY;

    // Check if horizontal swipe is more significant than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
      if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }

    setStartX(null);
    setStartY(null);
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  };
}

// Responsive grid component
interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number;
  className?: string;
}

export function ResponsiveGrid({ 
  children, 
  cols = { sm: 1, md: 2, lg: 3, xl: 4 }, 
  gap = 4,
  className 
}: ResponsiveGridProps) {
  const gridClasses = cn(
    "grid",
    `gap-${gap}`,
    cols.sm && `grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
    className
  );

  return (
    <div className={gridClasses}>
      {children}
    </div>
  );
}

// Mobile-optimized card component
interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  onClick?: () => void;
}

export function MobileCard({ 
  children, 
  className, 
  interactive = false, 
  onClick 
}: MobileCardProps) {
  return (
    <motion.div
      className={cn(
        "bg-card rounded-lg border p-4 shadow-sm",
        interactive && "cursor-pointer hover:shadow-md transition-shadow",
        className
      )}
      onClick={onClick}
      whileTap={interactive ? { scale: 0.98 } : undefined}
      whileHover={interactive ? { y: -2 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      {children}
    </motion.div>
  );
} 