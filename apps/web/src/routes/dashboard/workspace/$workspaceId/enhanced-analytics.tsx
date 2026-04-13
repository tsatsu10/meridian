// @epic-4.3-enhanced-dashboards: Demo page showcasing enhanced dashboard and analytics
// @role-workspace-manager: Advanced analytics dashboard demonstration
// @role-department-head: Department-level analytics showcase
// @role-project-manager: Project analytics and reporting demo

import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { RealTimeDashboard } from "@/components/dashboard/real-time-dashboard";
import { AdvancedFilterSystem } from "@/components/dashboard/advanced-filter-system";
import { ScatterPlot, Heatmap, GanttChart } from "@/components/dashboard/advanced-chart-library";
import { InteractiveChart } from "@/components/dashboard/interactive-chart";
import { CustomizableDashboard } from "@/components/dashboard/customizable-dashboard";
import { 
  TrendingUp, 
  BarChart3, 
  Activity, 
  Users,
  Calendar,
  Target,
  Zap,
  Eye
} from "lucide-react";
import type { DashboardWidget } from "@/components/dashboard/customizable-dashboard";
import type { ScatterDataPoint, HeatmapDataPoint, GanttDataPoint } from "@/components/dashboard/advanced-chart-library";
import type { FilterCriteria, SearchResult } from "@/components/dashboard/advanced-filter-system";

export const Route = createFileRoute("/dashboard/workspace/$workspaceId/enhanced-analytics")({
  component: EnhancedAnalyticsPage,
});

function EnhancedAnalyticsPage() {
  const { workspaceId } = Route.useParams();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // Sample data for demonstrations
  const scatterData: ScatterDataPoint[] = useMemo(() => [
    { x: 10, y: 20, z: 15, label: "Task A", category: "Frontend", metadata: { priority: "high" } },
    { x: 15, y: 25, z: 20, label: "Task B", category: "Backend", metadata: { priority: "medium" } },
    { x: 20, y: 15, z: 10, label: "Task C", category: "Frontend", metadata: { priority: "low" } },
    { x: 25, y: 30, z: 25, label: "Task D", category: "DevOps", metadata: { priority: "high" } },
    { x: 30, y: 35, z: 30, label: "Task E", category: "Backend", metadata: { priority: "medium" } },
    { x: 35, y: 25, z: 15, label: "Task F", category: "Design", metadata: { priority: "low" } },
    { x: 40, y: 40, z: 35, label: "Task G", category: "Frontend", metadata: { priority: "high" } },
    { x: 45, y: 20, z: 20, label: "Task H", category: "QA", metadata: { priority: "medium" } }
  ], []);

  const heatmapData: HeatmapDataPoint[] = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const hours = ['9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
    
    return days.flatMap(day => 
      hours.map(hour => ({
        x: hour,
        y: day,
        value: Math.floor(Math.random() * 10) + 1,
        label: `${day} ${hour} - ${Math.floor(Math.random() * 10) + 1} tasks`
      }))
    );
  }, []);

  const ganttData: GanttDataPoint[] = useMemo(() => [
    {
      id: '1',
      name: 'Phase 4.3 Implementation',
      startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      progress: 75,
      assignee: 'Development Team',
      priority: 'high',
      status: 'in_progress',
      dependencies: []
    },
    {
      id: '2',
      name: 'Advanced Chart Library',
      startDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      progress: 100,
      assignee: 'Frontend Team',
      priority: 'high',
      status: 'completed',
      dependencies: []
    },
    {
      id: '3',
      name: 'Real-time Dashboard',
      startDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      progress: 85,
      assignee: 'Full-stack Team',
      priority: 'high',
      status: 'in_progress',
      dependencies: ['2']
    },
    {
      id: '4',
      name: 'Advanced Filter System',
      startDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      progress: 70,
      assignee: 'Frontend Team',
      priority: 'medium',
      status: 'in_progress',
      dependencies: ['2']
    },
    {
      id: '5',
      name: 'Testing & Documentation',
      startDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
      progress: 0,
      assignee: 'QA Team',
      priority: 'medium',
      status: 'not-started',
      dependencies: ['3', '4']
    }
  ], []);

  const productivityData = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      label: `Day ${i + 1}`,
      value: Math.floor(Math.random() * 50) + 50,
      timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString()
    }));
  }, []);

  const sampleWidgets: DashboardWidget[] = useMemo(() => [
    {
      id: 'productivity-chart',
      type: 'chart',
      title: 'Team Productivity',
      size: 'large',
      position: { row: 0, col: 0 }
    },
    {
      id: 'task-stats',
      type: 'stats',
      title: 'Task Statistics',
      size: 'medium',
      position: { row: 0, col: 2 }
    },
    {
      id: 'recent-activity',
      type: 'activity',
      title: 'Recent Activity',
      size: 'medium',
      position: { row: 1, col: 0 }
    },
    {
      id: 'project-progress',
      type: 'projects',
      title: 'Project Progress',
      size: 'medium',
      position: { row: 1, col: 2 }
    }
  ], []);

  const [widgets, setWidgets] = useState<DashboardWidget[]>(sampleWidgets);

  const availableFilterFields = [
    { field: 'status', label: 'Status', type: 'select' as const, options: [
      { value: 'pending', label: 'Pending' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' },
      { value: 'blocked', label: 'Blocked' }
    ]},
    { field: 'priority', label: 'Priority', type: 'select' as const, options: [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' }
    ]},
    { field: 'assignee', label: 'Assignee', type: 'text' as const },
    { field: 'category', label: 'Category', type: 'multiselect' as const, options: [
      { value: 'frontend', label: 'Frontend' },
      { value: 'backend', label: 'Backend' },
      { value: 'design', label: 'Design' },
      { value: 'devops', label: 'DevOps' },
      { value: 'qa', label: 'QA' }
    ]},
    { field: 'progress', label: 'Progress', type: 'range' as const },
    { field: 'created_date', label: 'Created Date', type: 'date' as const },
    { field: 'is_urgent', label: 'Urgent', type: 'boolean' as const }
  ];

  const handleFilterChange = (data: any[]) => {
    setFilteredData(data);
  };

  const handleSearchResults = (results: SearchResult[]) => {
    setSearchResults(results);
  };

  const handleWidgetsChange = (newWidgets: DashboardWidget[]) => {
    setWidgets(newWidgets);
  };

  const handleDrillDown = (dataPoint: any) => {// In a real implementation, this would navigate to detailed view
  };

  const handleExport = () => {// In a real implementation, this would trigger data export
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Enhanced Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">Phase 4.3: Advanced dashboard components and real-time analytics</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="flex items-center space-x-1">
              <Activity className="h-3 w-3" />
              <span>Phase 4.3</span>
            </Badge>
            <Badge variant="default" className="flex items-center space-x-1">
              <Zap className="h-3 w-3" />
              <span>Live Demo</span>
            </Badge>
          </div>
        </div>

        {/* Feature Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Advanced Charts</h3>
                  <p className="text-sm text-gray-600">Scatter, Heatmap, Gantt</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Activity className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Real-time Updates</h3>
                  <p className="text-sm text-gray-600">Live data streaming</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Target className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Advanced Filters</h3>
                  <p className="text-sm text-gray-600">Multi-criteria search</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Eye className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Customizable Views</h3>
                  <p className="text-sm text-gray-600">Drag & drop layouts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="charts">Advanced Charts</TabsTrigger>
            <TabsTrigger value="realtime">Real-time</TabsTrigger>
            <TabsTrigger value="filters">Advanced Filters</TabsTrigger>
            <TabsTrigger value="customizable">Customizable</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Productivity Trends</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <InteractiveChart
                    title="30-Day Productivity Overview"
                    data={productivityData}
                    chartType="area"
                    showTrend={true}
                    height={300}
                    onExport={handleExport}
                    onDrillDown={handleDrillDown}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>Team Performance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScatterPlot
                    title="Effort vs Quality Correlation"
                    data={scatterData}
                    xAxisLabel="Effort (hours)"
                    yAxisLabel="Quality Score"
                    showTrendLine={true}
                    bubbleMode={true}
                    height={300}
                    onExport={handleExport}
                    onDrillDown={handleDrillDown}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="charts" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <ScatterPlot
                title="Task Complexity vs Performance"
                data={scatterData}
                xAxisLabel="Complexity Score"
                yAxisLabel="Performance Rating"
                showTrendLine={true}
                colorBy="category"
                bubbleMode={false}
                height={400}
                onExport={handleExport}
                onDrillDown={handleDrillDown}
              />
              
              <Heatmap
                title="Team Activity Heatmap"
                data={heatmapData}
                colorScheme="blue"
                showValues={true}
                height={400}
                onExport={handleExport}
                onDrillDown={handleDrillDown}
              />
            </div>
            
            <GanttChart
              title="Phase 4.3 Implementation Timeline"
              data={ganttData}
              showDependencies={true}
              groupBy="assignee"
              height={500}
              onExport={handleExport}
              onDrillDown={handleDrillDown}
            />
          </TabsContent>

          <TabsContent value="realtime" className="space-y-6">
            <RealTimeDashboard
              workspaceId={workspaceId}
              autoRefresh={true}
              refreshInterval={5000}
            />
          </TabsContent>

          <TabsContent value="filters" className="space-y-6">
            <AdvancedFilterSystem
              data={ganttData}
              onFilterChange={handleFilterChange}
              onSearchResults={handleSearchResults}
              availableFields={availableFilterFields}
              globalSearch={true}
            />
            
            {filteredData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Filtered Results ({filteredData.length} items)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {filteredData.slice(0, 5).map((item, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <h4 className="font-medium">{item.name || item.title || `Item ${index + 1}`}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {JSON.stringify(item, null, 2).substring(0, 100)}...
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {searchResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Search Results ({searchResults.length} items)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {searchResults.map((result) => (
                      <div key={result.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{result.title}</h4>
                          <Badge variant="outline">{result.type}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{result.description}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-xs text-gray-400">
                            {result.breadcrumb.join(' > ')}
                          </span>
                          <span className="text-xs text-gray-400">
                            {Math.round(result.relevanceScore * 100)}% match
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="customizable" className="space-y-6">
            <CustomizableDashboard
              widgets={widgets}
              onWidgetsChange={handleWidgetsChange}
              isEditing={false}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 