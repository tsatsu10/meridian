import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Activity } from "lucide-react";
import LazyAnalyticsWidget from "./LazyAnalyticsWidget";

interface WorkspacePerformanceSectionProps {
  dashboardData?: any;
  workspaceId?: string;
}

export default function WorkspacePerformanceSection({
  dashboardData,
  workspaceId
}: WorkspacePerformanceSectionProps) {
  const [selectedChart, setSelectedChart] = useState<'performance' | 'trends' | 'activity'>('performance');
  const [isExpanded, setIsExpanded] = useState(false);

  const renderChart = () => {
    if (!isExpanded) {
      return (
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-sm mb-3">Workspace Performance Analytics</p>
            <Button
              onClick={() => setIsExpanded(true)}
              variant="outline"
              size="sm"
            >
              Load Analytics
            </Button>
          </div>
        </div>
      );
    }

    switch (selectedChart) {
      case 'performance':
        return (
          <LazyAnalyticsWidget
            type="project"
            workspaceId={workspaceId}
            data={dashboardData}
            variant="compact"
          />
        );
      case 'trends':
        return (
          <LazyAnalyticsWidget
            type="visualization"
            chartType="line"
            data={dashboardData?.trends}
            title="Performance Trends"
          />
        );
      case 'activity':
        return (
          <LazyAnalyticsWidget
            type="insights"
            data={dashboardData?.activities}
            showMetrics={true}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Workspace Performance</CardTitle>
          {isExpanded && (
            <div className="flex space-x-1">
              <Button
                variant={selectedChart === 'performance' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedChart('performance')}
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                Performance
              </Button>
              <Button
                variant={selectedChart === 'trends' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedChart('trends')}
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                Trends
              </Button>
              <Button
                variant={selectedChart === 'activity' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedChart('activity')}
              >
                <Activity className="h-4 w-4 mr-1" />
                Activity
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {renderChart()}
      </CardContent>
    </Card>
  );
}