// @epic-3.5-analytics: Custom Dashboard Configurator for Phase 3 Analytics
// Drag-and-drop dashboard builder with widget customization

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Grip,
  Plus,
  Trash2,
  Settings,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  Copy,
  Layout,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  Users,
  Target,
  Zap,
  Brain,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardWidget {
  id: string;
  type: 'chart' | 'metric' | 'list' | 'heatmap' | 'gauge' | 'table';
  title: string;
  subtitle?: string;
  size: 'small' | 'medium' | 'large' | 'xlarge';
  position: { x: number; y: number };
  config: {
    dataSource: string;
    chartType?: 'bar' | 'line' | 'pie' | 'donut' | 'area';
    metrics?: string[];
    filters?: Record<string, any>;
    refresh?: number;
    colors?: string[];
  };
  visible: boolean;
  locked?: boolean;
}

interface DashboardLayout {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  settings: {
    theme: 'light' | 'dark' | 'auto';
    gridSize: number;
    autoRefresh: boolean;
    refreshInterval: number;
  };
}

interface CustomDashboardConfiguratorProps {
  teamId: string;
  onSave?: (layout: DashboardLayout) => void;
  onPreview?: (layout: DashboardLayout) => void;
  initialLayout?: DashboardLayout;
}

const WIDGET_TEMPLATES: Omit<DashboardWidget, 'id' | 'position'>[] = [
  {
    type: 'chart',
    title: 'Performance Trends',
    subtitle: 'Team velocity over time',
    size: 'large',
    config: {
      dataSource: 'performance',
      chartType: 'line',
      metrics: ['velocity', 'efficiency'],
      refresh: 30000
    },
    visible: true
  },
  {
    type: 'metric',
    title: 'Team Velocity',
    size: 'small',
    config: {
      dataSource: 'performance',
      metrics: ['velocity'],
      refresh: 10000
    },
    visible: true
  },
  {
    type: 'chart',
    title: 'Workload Distribution',
    subtitle: 'Capacity by team member',
    size: 'medium',
    config: {
      dataSource: 'workload',
      chartType: 'bar',
      metrics: ['capacity'],
      colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']
    },
    visible: true
  },
  {
    type: 'chart',
    title: 'Task Status',
    subtitle: 'Completion breakdown',
    size: 'medium',
    config: {
      dataSource: 'tasks',
      chartType: 'pie',
      metrics: ['completed', 'inprogress', 'pending'],
      colors: ['#22c55e', '#3b82f6', '#6b7280']
    },
    visible: true
  },
  {
    type: 'list',
    title: 'Recent Activities',
    subtitle: 'Latest team actions',
    size: 'medium',
    config: {
      dataSource: 'activities',
      refresh: 5000
    },
    visible: true
  },
  {
    type: 'heatmap',
    title: 'Collaboration Matrix',
    subtitle: 'Team interaction patterns',
    size: 'large',
    config: {
      dataSource: 'collaboration',
      refresh: 60000
    },
    visible: true
  },
  {
    type: 'gauge',
    title: 'Team Health Score',
    subtitle: 'Overall performance indicator',
    size: 'medium',
    config: {
      dataSource: 'health',
      metrics: ['overall_score'],
      refresh: 30000,
      colors: ['#ef4444', '#f59e0b', '#22c55e']
    },
    visible: true
  },
  {
    type: 'table',
    title: 'Top Performers',
    subtitle: 'Most productive team members',
    size: 'large',
    config: {
      dataSource: 'performance',
      metrics: ['tasks_completed', 'efficiency', 'collaboration'],
      refresh: 60000
    },
    visible: true
  }
];

export default function CustomDashboardConfigurator({
  teamId,
  onSave,
  onPreview,
  initialLayout
}: CustomDashboardConfiguratorProps) {
  const [layout, setLayout] = useState<DashboardLayout>(initialLayout || {
    id: `dashboard-${teamId}-${Date.now()}`,
    name: 'Custom Team Dashboard',
    description: 'Personalized analytics dashboard',
    widgets: [],
    settings: {
      theme: 'auto',
      gridSize: 12,
      autoRefresh: true,
      refreshInterval: 30000
    }
  });

  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [activeTab, setActiveTab] = useState('widgets');
  
  const gridRef = useRef<HTMLDivElement>(null);

  const generateId = () => `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addWidget = useCallback((template: Omit<DashboardWidget, 'id' | 'position'>) => {
    const newWidget: DashboardWidget = {
      ...template,
      id: generateId(),
      position: { x: 0, y: layout.widgets.length * 2 }
    };

    setLayout(prev => ({
      ...prev,
      widgets: [...prev.widgets, newWidget]
    }));
  }, [layout.widgets.length]);

  const updateWidget = useCallback((widgetId: string, updates: Partial<DashboardWidget>) => {
    setLayout(prev => ({
      ...prev,
      widgets: prev.widgets.map(widget =>
        widget.id === widgetId ? { ...widget, ...updates } : widget
      )
    }));
  }, []);

  const removeWidget = useCallback((widgetId: string) => {
    setLayout(prev => ({
      ...prev,
      widgets: prev.widgets.filter(widget => widget.id !== widgetId)
    }));
    setSelectedWidget(null);
  }, []);

  const duplicateWidget = useCallback((widgetId: string) => {
    const widget = layout.widgets.find(w => w.id === widgetId);
    if (widget) {
      const duplicate: DashboardWidget = {
        ...widget,
        id: generateId(),
        title: `${widget.title} (Copy)`,
        position: { x: widget.position.x + 1, y: widget.position.y + 1 }
      };
      setLayout(prev => ({
        ...prev,
        widgets: [...prev.widgets, duplicate]
      }));
    }
  }, [layout.widgets]);

  const getWidgetIcon = (type: string) => {
    switch (type) {
      case 'chart': return <BarChart3 className="h-4 w-4" />;
      case 'metric': return <Target className="h-4 w-4" />;
      case 'list': return <Activity className="h-4 w-4" />;
      case 'heatmap': return <Zap className="h-4 w-4" />;
      case 'gauge': return <Users className="h-4 w-4" />;
      case 'table': return <Layout className="h-4 w-4" />;
      default: return <BarChart3 className="h-4 w-4" />;
    }
  };

  const getSizeClass = (size: string) => {
    switch (size) {
      case 'small': return 'col-span-3 row-span-2';
      case 'medium': return 'col-span-6 row-span-3';
      case 'large': return 'col-span-9 row-span-4';
      case 'xlarge': return 'col-span-12 row-span-5';
      default: return 'col-span-6 row-span-3';
    }
  };

  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    setDraggedWidget(widgetId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetWidgetId?: string) => {
    e.preventDefault();
    if (draggedWidget && targetWidgetId && draggedWidget !== targetWidgetId) {
      const draggedIndex = layout.widgets.findIndex(w => w.id === draggedWidget);
      const targetIndex = layout.widgets.findIndex(w => w.id === targetWidgetId);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const newWidgets = [...layout.widgets];
        const [draggedItem] = newWidgets.splice(draggedIndex, 1);
        newWidgets.splice(targetIndex, 0, draggedItem);
        
        setLayout(prev => ({ ...prev, widgets: newWidgets }));
      }
    }
    setDraggedWidget(null);
  };

  const saveLayout = () => {
    onSave?.(layout);
  };

  const previewLayout = () => {
    setIsPreviewMode(!isPreviewMode);
    onPreview?.(layout);
  };

  const resetLayout = () => {
    setLayout({
      ...layout,
      widgets: []
    });
    setSelectedWidget(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layout className="h-5 w-5" />
              <span>Dashboard Configurator</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={resetLayout}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
              <Button variant="outline" size="sm" onClick={previewLayout}>
                {isPreviewMode ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                {isPreviewMode ? 'Edit' : 'Preview'}
              </Button>
              <Button onClick={saveLayout}>
                <Save className="h-4 w-4 mr-1" />
                Save Layout
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="widgets">Widgets</TabsTrigger>
              <TabsTrigger value="layout">Layout</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="widgets" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Widget Library */}
                <div className="lg:col-span-1">
                  <h3 className="text-lg font-medium mb-4">Widget Library</h3>
                  <div className="space-y-2">
                    {WIDGET_TEMPLATES.map((template, index) => (
                      <Card 
                        key={index}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => addWidget(template)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center space-x-2">
                            {getWidgetIcon(template.type)}
                            <div className="flex-1">
                              <div className="text-sm font-medium">{template.title}</div>
                              <div className="text-xs text-gray-500">{template.subtitle}</div>
                            </div>
                            <Plus className="h-4 w-4 text-gray-400" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Dashboard Preview */}
                <div className="lg:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">Dashboard Preview</h3>
                    <Badge variant="secondary">
                      {layout.widgets.length} widgets
                    </Badge>
                  </div>
                  
                  <div 
                    ref={gridRef}
                    className={cn(
                      "grid gap-4 min-h-96 p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg",
                      `grid-cols-${layout.settings.gridSize}`
                    )}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e)}
                  >
                    {layout.widgets.length === 0 ? (
                      <div className="col-span-full flex items-center justify-center py-12 text-gray-500">
                        <div className="text-center">
                          <Layout className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Drag widgets from the library to start building your dashboard</p>
                        </div>
                      </div>
                    ) : (
                      layout.widgets.map((widget) => (
                        <Card
                          key={widget.id}
                          className={cn(
                            getSizeClass(widget.size),
                            "relative group transition-all",
                            selectedWidget === widget.id && "ring-2 ring-blue-500",
                            !widget.visible && "opacity-50",
                            !isPreviewMode && "cursor-move"
                          )}
                          draggable={!isPreviewMode && !widget.locked}
                          onDragStart={(e) => handleDragStart(e, widget.id)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, widget.id)}
                          onClick={() => !isPreviewMode && setSelectedWidget(widget.id)}
                        >
                          {!isPreviewMode && (
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <div className="flex space-x-1">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateWidget(widget.id, { visible: !widget.visible });
                                  }}
                                >
                                  {widget.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    duplicateWidget(widget.id);
                                  }}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeWidget(widget.id);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          {!isPreviewMode && (
                            <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Grip className="h-4 w-4 text-gray-400" />
                            </div>
                          )}

                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center space-x-2">
                              {getWidgetIcon(widget.type)}
                              <span>{widget.title}</span>
                            </CardTitle>
                            {widget.subtitle && (
                              <p className="text-xs text-gray-500">{widget.subtitle}</p>
                            )}
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded">
                              <div className="text-center text-gray-500">
                                <div className="text-xs mb-1">{widget.type.toUpperCase()}</div>
                                <div className="text-xs opacity-75">
                                  {widget.config.dataSource} • {widget.size}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="layout" className="space-y-4">
              {selectedWidget && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Widget Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(() => {
                      const widget = layout.widgets.find(w => w.id === selectedWidget);
                      if (!widget) return null;

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Title</label>
                            <input
                              type="text"
                              value={widget.title}
                              onChange={(e) => updateWidget(widget.id, { title: e.target.value })}
                              className="w-full p-2 border rounded-md"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Size</label>
                            <select
                              value={widget.size}
                              onChange={(e) => updateWidget(widget.id, { size: e.target.value as any })}
                              className="w-full p-2 border rounded-md"
                            >
                              <option value="small">Small</option>
                              <option value="medium">Medium</option>
                              <option value="large">Large</option>
                              <option value="xlarge">Extra Large</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Data Source</label>
                            <select
                              value={widget.config.dataSource}
                              onChange={(e) => updateWidget(widget.id, { 
                                config: { ...widget.config, dataSource: e.target.value }
                              })}
                              className="w-full p-2 border rounded-md"
                            >
                              <option value="performance">Performance</option>
                              <option value="workload">Workload</option>
                              <option value="tasks">Tasks</option>
                              <option value="activities">Activities</option>
                              <option value="collaboration">Collaboration</option>
                              <option value="health">Health</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Refresh Interval (ms)</label>
                            <input
                              type="number"
                              value={widget.config.refresh || 30000}
                              onChange={(e) => updateWidget(widget.id, { 
                                config: { ...widget.config, refresh: parseInt(e.target.value) }
                              })}
                              className="w-full p-2 border rounded-md"
                              min="1000"
                              step="1000"
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Dashboard Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Dashboard Name</label>
                      <input
                        type="text"
                        value={layout.name}
                        onChange={(e) => setLayout({ ...layout, name: e.target.value })}
                        className="w-full p-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Description</label>
                      <input
                        type="text"
                        value={layout.description}
                        onChange={(e) => setLayout({ ...layout, description: e.target.value })}
                        className="w-full p-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Theme</label>
                      <select
                        value={layout.settings.theme}
                        onChange={(e) => setLayout({
                          ...layout,
                          settings: { ...layout.settings, theme: e.target.value as any }
                        })}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="auto">Auto</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Grid Columns</label>
                      <select
                        value={layout.settings.gridSize}
                        onChange={(e) => setLayout({
                          ...layout,
                          settings: { ...layout.settings, gridSize: parseInt(e.target.value) }
                        })}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value={8}>8 Columns</option>
                        <option value={12}>12 Columns</option>
                        <option value={16}>16 Columns</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={layout.settings.autoRefresh}
                      onChange={(e) => setLayout({
                        ...layout,
                        settings: { ...layout.settings, autoRefresh: e.target.checked }
                      })}
                      className="rounded"
                    />
                    <label className="text-sm font-medium">Enable Auto Refresh</label>
                  </div>
                  
                  {layout.settings.autoRefresh && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Global Refresh Interval (ms)</label>
                      <input
                        type="number"
                        value={layout.settings.refreshInterval}
                        onChange={(e) => setLayout({
                          ...layout,
                          settings: { ...layout.settings, refreshInterval: parseInt(e.target.value) }
                        })}
                        className="w-full p-2 border rounded-md"
                        min="5000"
                        step="5000"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}