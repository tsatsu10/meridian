import React, { useState, useEffect, useMemo } from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Settings, 
  RefreshCw, 
  Layout, 
  Eye, 
  EyeOff,
  Save,
  Undo,
  Grid3X3,
  Maximize2,
  Download,
  Share,
  Filter,
  Search
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/cn';
import { toast } from 'sonner';

import { WidgetContainer, WidgetConfig, WidgetType, WidgetSize } from './widget-container';
import { WidgetLibrary, WidgetTemplate, WIDGET_TEMPLATES } from './widget-library';
import { WidgetRenderer } from './widget-renderer';
import { useRBACAuth } from '@/lib/permissions';

// Simple ID generation utility
const generateId = () => {
  return 'widget_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
};

export type DashboardLayout = 'grid' | 'masonry' | 'list';
export type DashboardTemplate = 'executive' | 'project-manager' | 'team-lead' | 'developer' | 'custom';

export interface DashboardConfig {
  id: string;
  name: string;
  layout: DashboardLayout;
  template: DashboardTemplate;
  widgets: WidgetConfig[];
  autoRefresh: boolean;
  refreshInterval: number; // in seconds
  isPublic: boolean;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WidgetDashboardProps {
  dashboardId?: string;
  initialConfig?: Partial<DashboardConfig>;
  isEditable?: boolean;
  className?: string;
  onConfigChange?: (config: DashboardConfig) => void;
  onWidgetInteraction?: (widgetId: string, action: string, data?: any) => void;
}

const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  id: 'default-dashboard',
  name: 'My Dashboard',
  layout: 'grid',
  template: 'custom',
  widgets: [],
  autoRefresh: true,
  refreshInterval: 300, // 5 minutes
  isPublic: false,
  permissions: [],
  createdAt: new Date(),
  updatedAt: new Date()
};

export const DASHBOARD_TEMPLATES: Record<DashboardTemplate, Partial<DashboardConfig> & { description: string }> = {
  executive: {
    name: 'Executive Dashboard',
    description: 'High-level metrics and KPIs for executives',
    widgets: [
      {
        id: 'exec-1',
        type: 'metric-card',
        title: 'Overall Project Health',
        size: 'small',
        position: { x: 0, y: 0 },
        isVisible: true,
        isExpanded: false,
        refreshInterval: 300
      },
      {
        id: 'exec-2',
        type: 'chart',
        title: 'Revenue Pipeline',
        size: 'large',
        position: { x: 1, y: 0 },
        isVisible: true,
        isExpanded: false,
        refreshInterval: 600
      },
      {
        id: 'exec-3',
        type: 'chart',
        title: 'Team Performance Overview',
        size: 'medium',
        position: { x: 0, y: 1 },
        isVisible: true,
        isExpanded: false,
        refreshInterval: 300
      }
    ] as WidgetConfig[]
  },
  'project-manager': {
    name: 'Project Manager Dashboard',
    description: 'Project-focused widgets for managing teams and deliverables',
    widgets: [
      {
        id: 'pm-1',
        type: 'chart',
        title: 'Project Health Overview',
        size: 'medium',
        position: { x: 0, y: 0 },
        isVisible: true,
        isExpanded: false
      },
      {
        id: 'pm-2',
        type: 'list',
        title: 'Upcoming Deadlines',
        size: 'medium',
        position: { x: 1, y: 0 },
        isVisible: true,
        isExpanded: false
      },
      {
        id: 'pm-3',
        type: 'team-activity',
        title: 'Team Activity Feed',
        size: 'large',
        position: { x: 0, y: 1 },
        isVisible: true,
        isExpanded: false
      }
    ] as WidgetConfig[]
  },
  'team-lead': {
    name: 'Team Lead Dashboard',
    description: 'Team-focused widgets for managing daily operations',
    widgets: [
      {
        id: 'tl-1',
        type: 'chart',
        title: 'Team Velocity Trend',
        size: 'large',
        position: { x: 0, y: 0 },
        isVisible: true,
        isExpanded: false
      },
      {
        id: 'tl-2',
        type: 'list',
        title: 'My Team Tasks',
        size: 'medium',
        position: { x: 1, y: 0 },
        isVisible: true,
        isExpanded: false
      },
      {
        id: 'tl-3',
        type: 'quick-actions',
        title: 'Quick Actions',
        size: 'small',
        position: { x: 0, y: 1 },
        isVisible: true,
        isExpanded: false
      }
    ] as WidgetConfig[]
  },
  developer: {
    name: 'Developer Dashboard',
    description: 'Development-focused widgets for individual contributors',
    widgets: [
      {
        id: 'dev-1',
        type: 'list',
        title: 'My Tasks',
        size: 'medium',
        position: { x: 0, y: 0 },
        isVisible: true,
        isExpanded: false
      },
      {
        id: 'dev-2',
        type: 'progress',
        title: 'Time Tracking',
        size: 'small',
        position: { x: 1, y: 0 },
        isVisible: true,
        isExpanded: false
      },
      {
        id: 'dev-3',
        type: 'calendar',
        title: 'Calendar Overview',
        size: 'medium',
        position: { x: 0, y: 1 },
        isVisible: true,
        isExpanded: false
      }
    ] as WidgetConfig[]
  },
  custom: {
    name: 'Custom Dashboard',
    description: 'Build your own dashboard from scratch',
    widgets: []
  }
};

export function WidgetDashboard({
  dashboardId,
  initialConfig,
  isEditable = true,
  className,
  onConfigChange,
  onWidgetInteraction
}: WidgetDashboardProps) {
  const { hasPermission, user } = useRBACAuth();
  const [config, setConfig] = useState<DashboardConfig>({
    ...DEFAULT_DASHBOARD_CONFIG,
    ...initialConfig,
    id: dashboardId || DEFAULT_DASHBOARD_CONFIG.id
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showHiddenWidgets, setShowHiddenWidgets] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [originalConfig, setOriginalConfig] = useState<DashboardConfig>(config);

  // Auto-refresh functionality
  useEffect(() => {
    if (config.autoRefresh && config.refreshInterval > 0 && !isEditing) {
      const interval = setInterval(() => {
        handleRefreshAll();
      }, config.refreshInterval * 1000);

      return () => clearInterval(interval);
    }
  }, [config.autoRefresh, config.refreshInterval, isEditing]);

  // Notify parent of config changes
  useEffect(() => {
    onConfigChange?.(config);
  }, [config, onConfigChange]);

  const filteredWidgets = useMemo(() => {
    let widgets = config.widgets;

    if (!showHiddenWidgets) {
      widgets = widgets.filter(w => w.isVisible);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      widgets = widgets.filter(w => 
        w.title.toLowerCase().includes(query) ||
        w.type.toLowerCase().includes(query)
      );
    }

    return widgets;
  }, [config.widgets, showHiddenWidgets, searchQuery]);

  const handleUpdateWidget = (updatedWidget: WidgetConfig) => {
    setConfig(prev => ({
      ...prev,
      widgets: prev.widgets.map(w => 
        w.id === updatedWidget.id ? updatedWidget : w
      ),
      updatedAt: new Date()
    }));
  };

  const handleRemoveWidget = (widgetId: string) => {
    setConfig(prev => ({
      ...prev,
      widgets: prev.widgets.filter(w => w.id !== widgetId),
      updatedAt: new Date()
    }));
  };

  const handleDuplicateWidget = (widget: WidgetConfig) => {
    const duplicated: WidgetConfig = {
      ...widget,
      id: generateId(),
      title: `${widget.title} (Copy)`,
      position: { x: widget.position.x + 1, y: widget.position.y }
    };

    setConfig(prev => ({
      ...prev,
      widgets: [...prev.widgets, duplicated],
      updatedAt: new Date()
    }));
  };

  const handleResizeWidget = (widgetId: string, size: WidgetSize) => {
    setConfig(prev => ({
      ...prev,
      widgets: prev.widgets.map(w => 
        w.id === widgetId ? { ...w, size, updatedAt: new Date() } : w
      ),
      updatedAt: new Date()
    }));
  };

  const handleRefreshWidget = async (widgetId: string) => {
    // Emit widget interaction event for parent to handle data refresh
    onWidgetInteraction?.(widgetId, 'refresh');
  };

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      // Refresh all visible widgets
      const refreshPromises = filteredWidgets.map(widget => 
        handleRefreshWidget(widget.id)
      );
      await Promise.all(refreshPromises);
      toast.success('Dashboard refreshed');
    } catch (error) {
      toast.error('Failed to refresh dashboard');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddWidget = (template: WidgetTemplate) => {
    const newWidget: WidgetConfig = {
      id: generateId(),
      type: template.type,
      title: template.title,
      size: template.defaultSize,
      position: { x: 0, y: config.widgets.length },
      isVisible: true,
      isExpanded: false,
      customProps: {},
      permissions: template.permissions
    };

    setConfig(prev => ({
      ...prev,
      widgets: [...prev.widgets, newWidget],
      updatedAt: new Date()
    }));

    toast.success(`${template.title} widget added`);
  };

  const handleReorderWidgets = (newOrder: WidgetConfig[]) => {
    setConfig(prev => ({
      ...prev,
      widgets: newOrder,
      updatedAt: new Date()
    }));
  };

  const handleStartEditing = () => {
    setOriginalConfig({ ...config });
    setIsEditing(true);
  };

  const handleSaveEditing = () => {
    setIsEditing(false);
    toast.success('Dashboard saved');
  };

  const handleCancelEditing = () => {
    setConfig(originalConfig);
    setIsEditing(false);
    toast.info('Changes discarded');
  };

  const handleApplyTemplate = (template: DashboardTemplate) => {
    const templateConfig = DASHBOARD_TEMPLATES[template];
    setConfig(prev => ({
      ...prev,
      name: templateConfig.name || prev.name,
      template,
      widgets: templateConfig.widgets || [],
      updatedAt: new Date()
    }));
    toast.success(`${templateConfig.name} template applied`);
  };

  const getLayoutClasses = () => {
    switch (config.layout) {
      case 'masonry':
        return 'columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4';
      case 'list':
        return 'grid grid-cols-1 gap-4';
      default: // grid
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';
    }
  };

  return (
    <div className={cn('w-full space-y-6', className)}>
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold">{config.name}</h1>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="outline">{config.template}</Badge>
              <Badge variant="outline">{config.layout}</Badge>
              {config.autoRefresh && (
                <Badge variant="outline" className="text-green-600">
                  Auto-refresh: {config.refreshInterval}s
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search widgets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-10"
            />
          </div>

          {/* Refresh All */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn(
              "h-4 w-4 mr-2",
              isRefreshing && "animate-spin"
            )} />
            Refresh
          </Button>

          {/* Edit Mode Toggle */}
          {isEditable && (
            <div className="flex items-center space-x-2">
              {isEditing ? (
                <>
                  <Button variant="outline" size="sm" onClick={handleCancelEditing}>
                    <Undo className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveEditing}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={handleStartEditing}>
                  <Settings className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          )}

          {/* Dashboard Settings */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Layout className="h-4 w-4 mr-2" />
                Layout
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setConfig(prev => ({ ...prev, layout: 'grid' }))}>
                <Grid3X3 className="h-4 w-4 mr-2" />
                Grid Layout
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setConfig(prev => ({ ...prev, layout: 'masonry' }))}>
                <Layout className="h-4 w-4 mr-2" />
                Masonry Layout
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setConfig(prev => ({ ...prev, layout: 'list' }))}>
                <Maximize2 className="h-4 w-4 mr-2" />
                List Layout
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <div className="px-2 py-1">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-hidden"
                    checked={showHiddenWidgets}
                    onCheckedChange={setShowHiddenWidgets}
                  />
                  <Label htmlFor="show-hidden" className="text-sm">
                    Show hidden widgets
                  </Label>
                </div>
              </div>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => setIsLibraryOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Widget
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Widgets Grid */}
      <div className={getLayoutClasses()}>
        {isEditing ? (
          <Reorder.Group
            values={filteredWidgets}
            onReorder={handleReorderWidgets}
            className={getLayoutClasses()}
          >
            <AnimatePresence>
              {filteredWidgets.map((widget) => (
                <WidgetContainer
                  key={widget.id}
                  widget={widget}
                  onUpdate={handleUpdateWidget}
                  onRemove={handleRemoveWidget}
                  onDuplicate={handleDuplicateWidget}
                  onResize={handleResizeWidget}
                  onRefresh={handleRefreshWidget}
                  isDraggable={true}
                  isEditing={isEditing}
                >
                  <WidgetRenderer
                    widget={widget}
                    onInteraction={(action, data) => 
                      onWidgetInteraction?.(widget.id, action, data)
                    }
                  />
                </WidgetContainer>
              ))}
            </AnimatePresence>
          </Reorder.Group>
        ) : (
          <AnimatePresence>
            {filteredWidgets.map((widget) => (
              <WidgetContainer
                key={widget.id}
                widget={widget}
                onUpdate={handleUpdateWidget}
                onRemove={handleRemoveWidget}
                onDuplicate={handleDuplicateWidget}
                onResize={handleResizeWidget}
                onRefresh={handleRefreshWidget}
                isDraggable={false}
                isEditing={false}
              >
                <WidgetRenderer
                  widget={widget}
                  onInteraction={(action, data) => 
                    onWidgetInteraction?.(widget.id, action, data)
                  }
                />
              </WidgetContainer>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Empty State */}
      {filteredWidgets.length === 0 && (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-center space-y-4">
              <div className="p-4 bg-muted rounded-full w-fit mx-auto">
                <Layout className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-medium">No widgets found</h3>
                <p className="text-muted-foreground">
                  {searchQuery 
                    ? 'Try adjusting your search query'
                    : 'Add your first widget to get started'
                  }
                </p>
              </div>
              {isEditable && (
                <Button onClick={() => setIsLibraryOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Widget
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Widget Library Modal */}
      <WidgetLibrary
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onAddWidget={handleAddWidget}
        userPermissions={user?.permissions ? Object.keys(user.permissions).filter(key => user.permissions[key as keyof typeof user.permissions]) : []}
      />
    </div>
  );
} 