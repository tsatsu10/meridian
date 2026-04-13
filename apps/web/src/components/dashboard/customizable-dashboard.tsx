// @epic-3.1-dashboards: Customizable dashboard layout with drag-and-drop widgets
import { useState, useCallback } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { ProductivityChart, TaskCompletionChart, ProjectHealthChart } from "./simple-charts";
import { Grid, Settings, Plus, X, GripVertical, Download, Filter, RefreshCw } from "lucide-react";

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'stats' | 'activity' | 'projects' | 'deadlines' | 'custom';
  title: string;
  size: 'small' | 'medium' | 'large';
  data?: any;
  settings?: Record<string, any>;
  position: { row: number; col: number; };
}

interface DashboardFilter {
  timeRange: '7d' | '30d' | '90d' | '1y';
  projectIds?: string[];
  userIds?: string[];
  priority?: string[];
}

interface CustomizableDashboardProps {
  widgets: DashboardWidget[];
  onWidgetsChange: (widgets: DashboardWidget[]) => void;
  availableWidgets?: DashboardWidget[];
  isEditing?: boolean;
  onEditingChange?: (editing: boolean) => void;
}

function SortableWidget({ widget, isEditing, onRemove }: {
  widget: DashboardWidget;
  isEditing: boolean;
  onRemove: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getSizeClasses = () => {
    switch (widget.size) {
      case 'small':
        return 'col-span-1 row-span-1';
      case 'medium':
        return 'col-span-2 row-span-1';
      case 'large':
        return 'col-span-2 row-span-2';
      default:
        return 'col-span-1 row-span-1';
    }
  };

  const renderWidgetContent = () => {
    const sampleData = [
      { label: 'Mon', value: 12 },
      { label: 'Tue', value: 19 },
      { label: 'Wed', value: 15 },
      { label: 'Thu', value: 25 },
      { label: 'Fri', value: 22 },
      { label: 'Sat', value: 18 },
      { label: 'Sun', value: 16 }
    ];

    switch (widget.type) {
      case 'chart':
        if (widget.title.includes('Productivity')) {
          return <ProductivityChart data={sampleData} />;
        }
        if (widget.title.includes('Completion')) {
          return <TaskCompletionChart data={sampleData} />;
        }
        if (widget.title.includes('Health')) {
          return <ProjectHealthChart data={sampleData} />;
        }
        return <ProductivityChart data={sampleData} />;

      case 'stats':
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2,350</div>
              <p className="text-xs text-muted-foreground">
                +12% from last month
              </p>
            </CardContent>
          </Card>
        );

      case 'activity':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">User completed Task {i + 1}</p>
                      <p className="text-xs text-muted-foreground">2 minutes ago</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 'projects':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Project {i + 1}</p>
                      <div className="flex items-center space-x-2">
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div className="bg-primary h-2 rounded-full" style={{ width: `${60 + i * 10}%` }} />
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline">{60 + i * 10}%</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 'deadlines':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Task {i + 1}</p>
                      <p className="text-xs text-muted-foreground">Due in {i + 1} days</p>
                    </div>
                    <Badge variant={i === 0 ? "destructive" : "outline"}>
                      {i === 0 ? "Urgent" : "Medium"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      default:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Custom widget content</p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group transition-all duration-200",
        getSizeClasses(),
        isEditing && "ring-2 ring-primary/20 rounded-lg"
      )}
      {...attributes}
    >
      {isEditing && (
        <div className="absolute top-2 right-2 z-10 flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            {...listeners}
          >
            <GripVertical className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(widget.id)}
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      {renderWidgetContent()}
    </div>
  );
}

export function CustomizableDashboard({
  widgets,
  onWidgetsChange,
  isEditing = false,
  onEditingChange
}: CustomizableDashboardProps) {
  const [filters, setFilters] = useState<DashboardFilter>({
    timeRange: '30d'
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = widgets.findIndex((widget) => widget.id === active.id);
      const newIndex = widgets.findIndex((widget) => widget.id === over.id);

      onWidgetsChange(arrayMove(widgets, oldIndex, newIndex));
    }
  }, [widgets, onWidgetsChange]);

  const addWidget = (type: DashboardWidget['type'], title: string) => {
    const newWidget: DashboardWidget = {
      id: `widget-${Date.now()}`,
      type,
      title,
      size: 'medium',
      position: { row: 0, col: 0 }
    };
    onWidgetsChange([...widgets, newWidget]);
  };

  const removeWidget = (id: string) => {
    onWidgetsChange(widgets.filter(w => w.id !== id));
  };

  const handleFilterChange = (key: keyof DashboardFilter, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleExportData = () => {
    // @epic-3.1-dashboards: Export dashboard data functionality
    const data = {
      widgets,
      filters,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold">Dashboard</h2>
          <div className="flex items-center space-x-2">
            {/* Time Range Filter */}
            <div className="flex items-center space-x-1">
              {(["7d", "30d", "90d", "1y"] as const).map((range) => (
                <Button
                  key={range}
                  variant={filters.timeRange === range ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleFilterChange('timeRange', range)}
                  className="h-7 px-2 text-xs"
                >
                  {range}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={handleExportData}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="ghost" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {onEditingChange && (
            <Button
              variant={isEditing ? "default" : "ghost"}
              size="sm"
              onClick={() => onEditingChange(!isEditing)}
            >
              <Settings className="mr-2 h-4 w-4" />
              {isEditing ? "Done" : "Edit"}
            </Button>
          )}
        </div>
      </div>

      {/* Add Widget Controls (only visible in edit mode) */}
      {isEditing && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Add Widget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => addWidget('chart', 'Team Productivity')}
              >
                <Plus className="mr-1 h-3 w-3" />
                Productivity Chart
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addWidget('chart', 'Task Completion')}
              >
                <Plus className="mr-1 h-3 w-3" />
                Task Completion
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addWidget('stats', 'Quick Stats')}
              >
                <Plus className="mr-1 h-3 w-3" />
                Stats Widget
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addWidget('activity', 'Recent Activity')}
              >
                <Plus className="mr-1 h-3 w-3" />
                Activity Feed
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addWidget('projects', 'Project Progress')}
              >
                <Plus className="mr-1 h-3 w-3" />
                Projects
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addWidget('deadlines', 'Upcoming Deadlines')}
              >
                <Plus className="mr-1 h-3 w-3" />
                Deadlines
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={widgets.map(w => w.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-4 gap-4 auto-rows-[200px]">
            {widgets.map((widget) => (
              <SortableWidget
                key={widget.id}
                widget={widget}
                isEditing={isEditing}
                onRemove={removeWidget}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Empty State */}
      {widgets.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Grid className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No widgets added</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Click "Edit" to start customizing your dashboard
            </p>
            {onEditingChange && (
              <Button onClick={() => onEditingChange(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Widget
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 