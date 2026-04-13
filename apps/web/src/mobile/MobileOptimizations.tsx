import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, 
  X, 
  Search, 
  Plus, 
  Filter, 
  SortAsc, 
  SortDesc,
  Grid,
  List,
  MoreVertical,
  Share2,
  Download,
  Settings,
  Bell,
  User,
  Home,
  Calendar,
  BarChart3,
  Users,
  Folder,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { pwaManager } from './PWAManager';
import { offlineManager } from './OfflineManager';
import { syncManager } from './SyncManager';

interface MobileOptimizationsProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileOptimizations: React.FC<MobileOptimizationsProps> = ({
  children,
  className = ''
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [offlineStatus, setOfflineStatus] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced device type check to prevent excessive calls
  const checkDeviceType = useCallback(() => {
    try {
      const userAgent = navigator.userAgent;
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isTablet = /iPad|Android(?=.*\bMobile\b)(?=.*\bSafari\b)/i.test(userAgent);
      
      setIsMobile(isMobile);
      setIsTablet(isTablet);
    } catch (error) {
      console.warn('Error checking device type:', error);
      setIsMobile(false);
      setIsTablet(false);
    }
  }, []);

  // Safe sync status update with error handling
  const updateSyncStatus = useCallback(() => {
    try {
      // Only try to access managers if they're available
      if (typeof window !== 'undefined' && (window as any).pwaManager) {
        setSyncStatus((window as any).pwaManager?.getSyncStatus?.() || null);
        setOfflineStatus((window as any).offlineManager?.getSyncStatus?.() || null);
      }
    } catch (error) {
      console.warn('Error updating sync status:', error);
      setSyncStatus(null);
      setOfflineStatus(null);
    }
  }, []);

  useEffect(() => {
    // Initial device check
    checkDeviceType();

    // Debounced resize listener
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(checkDeviceType, 100);
    };

    window.addEventListener('resize', handleResize);

    // Initialize with timeout to prevent blocking
    initTimeoutRef.current = setTimeout(() => {
      try {
        updateSyncStatus();
        setIsInitialized(true);
      } catch (error) {
        console.warn('Mobile optimizations initialization failed:', error);
        setIsInitialized(true); // Continue anyway
      }
    }, 200);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeout) clearTimeout(resizeTimeout);
      if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);
    };
  }, [checkDeviceType, updateSyncStatus]);

  useEffect(() => {
    if (searchOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [searchOpen]);

  const handleSearch = (query: string) => {
    try {
      // Trigger search event
      const searchEvent = new CustomEvent('mobile-search', { detail: { query } });
      window.dispatchEvent(searchEvent);
      setSearchOpen(false);
    } catch (error) {
      console.warn('Error handling search:', error);
      setSearchOpen(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleSync = async () => {
    try {
      if ((window as any).syncManager?.forceSync) {
        await (window as any).syncManager.forceSync();
      }
    } catch (error) {
      console.warn('Error during sync:', error);
    }
  };

  // If not mobile/tablet, render children directly without mobile optimizations
  if (!isMobile && !isTablet) {
    return <div className={className}>{children}</div>;
  }

  // If not initialized yet, show a simple loading state
  if (!isInitialized) {
    return (
      <div className={`flex flex-col h-screen ${className}`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading mobile optimizations...</p>
          </div>
        </div>
      </div>
    );
  }

  const MobileHeader = () => (
    <motion.header 
      className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetHeader>
                <SheetTitle>Meridian</SheetTitle>
              </SheetHeader>
              <MobileSidebar onClose={() => setSidebarOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Dashboard</h1>
            {offlineStatus && !offlineStatus.isOnline && (
              <Badge variant="secondary" className="text-xs">
                Offline
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="p-2"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <Search className="w-5 h-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleSync}>
                <Share2 className="w-4 h-4 mr-2" />
                Sync Now
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3"
          >
            <div className="relative">
              <Input
                ref={searchRef}
                placeholder="Search tasks, projects..."
                className="pr-10"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch(e.currentTarget.value);
                  }
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 p-1"
                onClick={() => setSearchOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );

  const MobileSidebar = ({ onClose }: { onClose: () => void }) => (
    <nav className="mt-6 space-y-2">
      <MobileNavItem icon={Home} label="Dashboard" href="/" onClick={onClose} />
      <MobileNavItem icon={Calendar} label="Calendar" href="/calendar" onClick={onClose} />
      <MobileNavItem icon={BarChart3} label="Analytics" href="/analytics" onClick={onClose} />
      <MobileNavItem icon={Users} label="Team" href="/team" onClick={onClose} />
      <MobileNavItem icon={Folder} label="Projects" href="/projects" onClick={onClose} />
      <MobileNavItem icon={CheckCircle} label="Tasks" href="/tasks" onClick={onClose} />
      <MobileNavItem icon={Clock} label="Time Tracking" href="/time" onClick={onClose} />
      <MobileNavItem icon={Settings} label="Settings" href="/settings" onClick={onClose} />
    </nav>
  );

  const MobileNavItem = ({ 
    icon: Icon, 
    label, 
    href, 
    onClick 
  }: { 
    icon: any; 
    label: string; 
    href: string; 
    onClick: () => void;
  }) => (
    <a
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </a>
  );

  const MobileToolbar = () => (
    <motion.div 
      className="sticky top-16 z-40 bg-white border-b border-gray-200 px-4 py-2"
      initial={{ y: -50 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>All Tasks</DropdownMenuItem>
              <DropdownMenuItem>My Tasks</DropdownMenuItem>
              <DropdownMenuItem>Overdue</DropdownMenuItem>
              <DropdownMenuItem>Completed</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {sortOrder === 'asc' ? <SortAsc className="w-4 h-4 mr-2" /> : <SortDesc className="w-4 h-4 mr-2" />}
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleSort('date')}>
                Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort('priority')}>
                Priority {sortBy === 'priority' && (sortOrder === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort('name')}>
                Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  );

  const MobileFAB = () => (
    <motion.div
      className="fixed bottom-6 right-6 z-50"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <Button
        size="lg"
        className="rounded-full w-14 h-14 shadow-lg"
        onClick={() => {
          try {
            const newTaskEvent = new CustomEvent('mobile-new-task');
            window.dispatchEvent(newTaskEvent);
          } catch (error) {
            console.warn('Error creating new task event:', error);
          }
        }}
      >
        <Plus className="w-6 h-6" />
      </Button>
    </motion.div>
  );

  const SyncIndicator = () => {
    if (!syncStatus) return null;

    return (
      <motion.div
        className="fixed top-20 right-4 z-50"
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="w-64 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {syncStatus.isSyncing ? (
                <>
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                  Syncing...
                </>
              ) : !syncStatus.isOnline ? (
                <>
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                  Offline
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Online
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xs text-gray-600 space-y-1">
              <div>Pending: {syncStatus.pendingActions}</div>
              <div>Last sync: {new Date(syncStatus.lastSyncTime).toLocaleTimeString()}</div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const MobileContent = () => (
    <motion.div
      className="flex-1 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <div className="h-full overflow-y-auto">
        {children}
      </div>
    </motion.div>
  );

  return (
    <div className={`flex flex-col h-screen ${className}`}>
      <MobileHeader />
      <MobileToolbar />
      <MobileContent />
      <MobileFAB />
      <SyncIndicator />
    </div>
  );
};

// Mobile-optimized components
export const MobileCard = ({ 
  children, 
  className = '',
  onClick,
  ...props 
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  [key: string]: any;
}) => (
  <motion.div
    whileTap={{ scale: 0.98 }}
    className={`touch-manipulation ${className}`}
    onClick={onClick}
    {...props}
  >
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        {children}
      </CardContent>
    </Card>
  </motion.div>
);

export const MobileList = ({ 
  items, 
  renderItem, 
  className = '' 
}: {
  items: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  className?: string;
}) => (
  <div className={`space-y-2 ${className}`}>
    {items.map((item, index) => (
      <motion.div
        key={item.id || index}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
      >
        {renderItem(item, index)}
      </motion.div>
    ))}
  </div>
);

export const MobileGrid = ({ 
  items, 
  renderItem, 
  columns = 2,
  className = '' 
}: {
  items: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  columns?: number;
  className?: string;
}) => (
  <div 
    className={`grid gap-3 ${className}`}
    style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
  >
    {items.map((item, index) => (
      <motion.div
        key={item.id || index}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
      >
        {renderItem(item, index)}
      </motion.div>
    ))}
  </div>
);

export const MobileTabs = ({ 
  tabs, 
  activeTab, 
  onTabChange,
  className = '' 
}: {
  tabs: { id: string; label: string; icon?: any }[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}) => (
  <div className={`flex bg-gray-100 rounded-lg p-1 ${className}`}>
    {tabs.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onTabChange(tab.id)}
        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
          activeTab === tab.id
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        {tab.icon && <tab.icon className="w-4 h-4" />}
        {tab.label}
      </button>
    ))}
  </div>
);

export const MobilePullToRefresh = ({ 
  onRefresh, 
  children 
}: {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      currentY.current = e.touches[0].clientY;
      const distance = Math.max(0, currentY.current - startY.current);
      setPullDistance(Math.min(distance * 0.5, 100));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 50) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
    setPullDistance(0);
  };

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <motion.div
        className="absolute top-0 left-0 right-0 flex items-center justify-center py-2 bg-blue-50"
        style={{ y: -100 + pullDistance }}
      >
        {isRefreshing ? (
          <div className="flex items-center gap-2 text-blue-600">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            Refreshing...
          </div>
        ) : (
          <div className="text-blue-600">
            {pullDistance > 50 ? 'Release to refresh' : 'Pull to refresh'}
          </div>
        )}
      </motion.div>
      <div style={{ paddingTop: pullDistance }}>
        {children}
      </div>
    </div>
  );
}; 