// @epic-4.1-analytics: Custom Dashboard Widgets Manager
// @persona-jennifer: Executive needs personalized dashboard views
// @persona-david: Team lead needs customizable team metrics
// @persona-sarah: PM needs project-specific widget arrangements

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LayoutGrid,
  Plus,
  X,
  GripVertical,
  BarChart3,
  PieChart,
  LineChart,
  TrendingUp,
  Users,
  Target,
  Clock,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Settings,
  Save,
  RotateCcw
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { toast } from 'sonner'

// Widget type definitions
export type WidgetType = 
  | 'metric-card'
  | 'bar-chart'
  | 'line-chart'
  | 'pie-chart'
  | 'progress-bar'
  | 'list'
  | 'heatmap'
  | 'gauge';

export type WidgetSize = 'small' | 'medium' | 'large' | 'full';

export interface DashboardWidget {
  id: string
  type: WidgetType
  title: string
  description?: string
  size: WidgetSize
  dataSource: string
  config: Record<string, any>
  position: number
}

export interface WidgetTemplate {
  type: WidgetType
  title: string
  description: string
  icon: React.ReactNode
  defaultSize: WidgetSize
  dataSource: string
  configOptions: string[]
}

// Available widget templates
const widgetTemplates: WidgetTemplate[] = [
  {
    type: 'metric-card',
    title: 'Key Metric',
    description: 'Display a single important metric with trend',
    icon: <TrendingUp className="w-5 h-5" />,
    defaultSize: 'small',
    dataSource: 'analytics',
    configOptions: ['metric', 'timeRange', 'comparisonMode'],
  },
  {
    type: 'bar-chart',
    title: 'Bar Chart',
    description: 'Compare values across categories',
    icon: <BarChart3 className="w-5 h-5" />,
    defaultSize: 'medium',
    dataSource: 'analytics',
    configOptions: ['dataType', 'groupBy', 'timeRange'],
  },
  {
    type: 'line-chart',
    title: 'Trend Chart',
    description: 'Visualize trends over time',
    icon: <LineChart className="w-5 h-5" />,
    defaultSize: 'medium',
    dataSource: 'analytics',
    configOptions: ['metrics', 'timeRange', 'smoothing'],
  },
  {
    type: 'pie-chart',
    title: 'Pie Chart',
    description: 'Show proportional distribution',
    icon: <PieChart className="w-5 h-5" />,
    defaultSize: 'small',
    dataSource: 'analytics',
    configOptions: ['dataType', 'topN'],
  },
  {
    type: 'progress-bar',
    title: 'Progress Tracker',
    description: 'Track goal completion',
    icon: <Target className="w-5 h-5" />,
    defaultSize: 'small',
    dataSource: 'projects',
    configOptions: ['project', 'goalType'],
  },
  {
    type: 'list',
    title: 'Data List',
    description: 'Show ordered list of items',
    icon: <CheckCircle2 className="w-5 h-5" />,
    defaultSize: 'medium',
    dataSource: 'projects',
    configOptions: ['listType', 'sortBy', 'limit'],
  },
  {
    type: 'heatmap',
    title: 'Activity Heatmap',
    description: 'Visualize activity patterns',
    icon: <Activity className="w-5 h-5" />,
    defaultSize: 'large',
    dataSource: 'team',
    configOptions: ['timeRange', 'groupBy'],
  },
  {
    type: 'gauge',
    title: 'Performance Gauge',
    description: 'Display performance score',
    icon: <Sparkles className="w-5 h-5" />,
    defaultSize: 'small',
    dataSource: 'team',
    configOptions: ['metric', 'threshold'],
  },
];

interface CustomWidgetsManagerProps {
  isOpen: boolean
  onClose: () => void
  onLayoutChange?: (widgets: DashboardWidget[]) => void
}

export function CustomWidgetsManager({
  isOpen,
  onClose,
  onLayoutChange,
}: CustomWidgetsManagerProps) {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([])
  const [showAddWidget, setShowAddWidget] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<WidgetTemplate | null>(null)
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null)

  // Load widgets from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('customDashboardWidgets')
    if (saved) {
      try {
        setWidgets(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load widgets:', e)
      }
    } else {
      // Set default widgets
      setWidgets(getDefaultWidgets())
    }
  }, [])

  // Save widgets to localStorage
  const saveWidgets = (updatedWidgets: DashboardWidget[]) => {
    setWidgets(updatedWidgets)
    localStorage.setItem('customDashboardWidgets', JSON.stringify(updatedWidgets))
    onLayoutChange?.(updatedWidgets)
  }

  // Get default widget layout
  const getDefaultWidgets = (): DashboardWidget[] => {
    return [
      {
        id: 'widget-1',
        type: 'metric-card',
        title: 'Total Projects',
        size: 'small',
        dataSource: 'projects',
        config: { metric: 'totalProjects', showTrend: true },
        position: 0,
      },
      {
        id: 'widget-2',
        type: 'metric-card',
        title: 'Team Productivity',
        size: 'small',
        dataSource: 'team',
        config: { metric: 'avgProductivity', showTrend: true },
        position: 1,
      },
      {
        id: 'widget-3',
        type: 'line-chart',
        title: 'Project Trends',
        size: 'large',
        dataSource: 'analytics',
        config: { metrics: ['productivity', 'tasksCompleted'], timeRange: '30d' },
        position: 2,
      },
      {
        id: 'widget-4',
        type: 'bar-chart',
        title: 'Team Performance',
        size: 'medium',
        dataSource: 'team',
        config: { dataType: 'utilization', groupBy: 'user' },
        position: 3,
      },
    ]
  }

  // Add new widget
  const handleAddWidget = (template: WidgetTemplate) => {
    const newWidget: DashboardWidget = {
      id: `widget-${Date.now()}`,
      type: template.type,
      title: template.title,
      description: template.description,
      size: template.defaultSize,
      dataSource: template.dataSource,
      config: {},
      position: widgets.length,
    }
    saveWidgets([...widgets, newWidget])
    setShowAddWidget(false)
    setSelectedTemplate(null)
    toast.success('Widget added successfully')
  }

  // Remove widget
  const handleRemoveWidget = (widgetId: string) => {
    const updatedWidgets = widgets
      .filter(w => w.id !== widgetId)
      .map((w, index) => ({ ...w, position: index }))
    saveWidgets(updatedWidgets)
    toast.success('Widget removed')
  }

  // Update widget size
  const handleUpdateSize = (widgetId: string, size: WidgetSize) => {
    const updatedWidgets = widgets.map(w =>
      w.id === widgetId ? { ...w, size } : w
    )
    saveWidgets(updatedWidgets)
  }

  // Drag and drop handlers
  const handleDragStart = (widgetId: string) => {
    setDraggedWidgetId(widgetId)
  }

  const handleDragOver = (e: React.DragEvent, targetWidgetId: string) => {
    e.preventDefault()
    if (!draggedWidgetId || draggedWidgetId === targetWidgetId) return

    const draggedIndex = widgets.findIndex(w => w.id === draggedWidgetId)
    const targetIndex = widgets.findIndex(w => w.id === targetWidgetId)

    if (draggedIndex === -1 || targetIndex === -1) return

    const reorderedWidgets = [...widgets]
    const [removed] = reorderedWidgets.splice(draggedIndex, 1)
    reorderedWidgets.splice(targetIndex, 0, removed)

    const updatedWidgets = reorderedWidgets.map((w, index) => ({
      ...w,
      position: index,
    }))

    setWidgets(updatedWidgets)
  }

  const handleDragEnd = () => {
    if (draggedWidgetId) {
      localStorage.setItem('customDashboardWidgets', JSON.stringify(widgets))
      onLayoutChange?.(widgets)
    }
    setDraggedWidgetId(null)
  }

  // Reset to default layout
  const handleResetLayout = () => {
    const defaultWidgets = getDefaultWidgets()
    saveWidgets(defaultWidgets)
    toast.success('Layout reset to default')
  }

  // Get size class for widget preview
  const getSizeClass = (size: WidgetSize) => {
    switch (size) {
      case 'small':
        return 'col-span-1'
      case 'medium':
        return 'col-span-2'
      case 'large':
        return 'col-span-3'
      case 'full':
        return 'col-span-4'
      default:
        return 'col-span-1'
    }
  }

  // Get size label
  const getSizeLabel = (size: WidgetSize) => {
    return size.charAt(0).toUpperCase() + size.slice(1)
  }

  return (
    <>
      <Dialog open={isOpen && !showAddWidget} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutGrid className="w-5 h-5" />
              Customize Dashboard
            </DialogTitle>
            <DialogDescription>
              Add, remove, and arrange widgets to personalize your analytics dashboard
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 flex flex-col gap-4">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowAddWidget(true)}
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Widget
                </Button>
                <Button
                  onClick={handleResetLayout}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset Layout
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                {widgets.length} {widgets.length === 1 ? 'widget' : 'widgets'}
              </div>
            </div>

            {/* Widgets Grid Preview */}
            <ScrollArea className="flex-1 border rounded-lg p-4 bg-muted/20">
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-3">
                  Drag to reorder widgets
                </div>
                
                {widgets.length === 0 ? (
                  <div className="text-center py-12">
                    <LayoutGrid className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground mb-4">
                      No widgets added yet. Add your first widget to get started.
                    </p>
                    <Button
                      onClick={() => setShowAddWidget(true)}
                      variant="outline"
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Widget
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {widgets
                      .sort((a, b) => a.position - b.position)
                      .map((widget) => (
                        <Card
                          key={widget.id}
                          draggable
                          onDragStart={() => handleDragStart(widget.id)}
                          onDragOver={(e) => handleDragOver(e, widget.id)}
                          onDragEnd={handleDragEnd}
                          className={cn(
                            "cursor-move transition-all hover:shadow-md",
                            draggedWidgetId === widget.id && "opacity-50"
                          )}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1">
                                <GripVertical className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <CardTitle className="text-sm">
                                      {widget.title}
                                    </CardTitle>
                                    <Badge variant="outline" className="text-xs">
                                      {widget.type}
                                    </Badge>
                                  </div>
                                  {widget.description && (
                                    <p className="text-xs text-muted-foreground">
                                      {widget.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Select
                                  value={widget.size}
                                  onValueChange={(value: WidgetSize) =>
                                    handleUpdateSize(widget.id, value)
                                  }
                                >
                                  <SelectTrigger className="h-7 w-24 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="small">Small</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="large">Large</SelectItem>
                                    <SelectItem value="full">Full Width</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveWidget(widget.id)}
                                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="secondary" className="text-xs">
                                {getSizeLabel(widget.size)}
                              </Badge>
                              <span>•</span>
                              <span>Position: {widget.position + 1}</span>
                              <span>•</span>
                              <span>Source: {widget.dataSource}</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-xs text-muted-foreground">
              Changes are saved automatically
            </div>
            <Button onClick={onClose}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Widget Modal */}
      <Dialog open={showAddWidget} onOpenChange={setShowAddWidget}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Widget</DialogTitle>
            <DialogDescription>
              Choose a widget type to add to your dashboard
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="grid grid-cols-2 gap-3">
              {widgetTemplates.map((template) => (
                <Card
                  key={template.type}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md hover:border-primary",
                    selectedTemplate?.type === template.type &&
                      "border-primary ring-2 ring-primary/20"
                  )}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                        {template.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm mb-1">
                          {template.title}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {template.description}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {getSizeLabel(template.defaultSize)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {template.dataSource}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddWidget(false)
                setSelectedTemplate(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedTemplate && handleAddWidget(selectedTemplate)}
              disabled={!selectedTemplate}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Widget
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

