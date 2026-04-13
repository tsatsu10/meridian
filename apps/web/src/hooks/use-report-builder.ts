import { useState, useCallback, useMemo } from "react";
import { type Metric, type MetricCategory } from "@/components/analytics/metric-selector";
import { type VisualizationType } from "@/components/analytics/visualization-selector";
import { useQuery, useMutation } from "@tanstack/react-query";

interface ReportConfig {
  name: string;
  description: string;
  metrics: string[];
  visualization: string;
}

interface UseReportBuilderOptions {
  onSaveSuccess?: () => void;
  onSaveError?: (error: Error) => void;
}

export function useReportBuilder(options: UseReportBuilderOptions = {}) {
  const [reportName, setReportName] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [selectedVisualization, setSelectedVisualization] = useState<string>();

  // Fetch available metrics
  const { data: metricCategories = [], isLoading: isLoadingMetrics } = useQuery({
    queryKey: ["metrics"],
    queryFn: async (): Promise<MetricCategory[]> => {
      // TODO: Replace with actual API call
      return [
        {
          name: "Project Metrics",
          description: "Key metrics about project health and progress",
          metrics: [
            {
              id: "total-projects",
              name: "Total Projects",
              description: "Total number of projects in the workspace",
              category: "project",
              dataType: "count"
            },
            {
              id: "active-projects",
              name: "Active Projects",
              description: "Number of projects currently in progress",
              category: "project",
              dataType: "count"
            },
            {
              id: "project-health",
              name: "Project Health Score",
              description: "Average health score across all projects",
              category: "project",
              dataType: "percentage"
            }
          ]
        },
        {
          name: "Task Metrics",
          description: "Metrics related to task management and completion",
          metrics: [
            {
              id: "total-tasks",
              name: "Total Tasks",
              description: "Total number of tasks across all projects",
              category: "task",
              dataType: "count"
            },
            {
              id: "completed-tasks",
              name: "Completed Tasks",
              description: "Number of tasks marked as complete",
              category: "task",
              dataType: "count"
            },
            {
              id: "task-completion-rate",
              name: "Task Completion Rate",
              description: "Percentage of tasks completed on time",
              category: "task",
              dataType: "percentage"
            }
          ]
        }
      ];
    }
  });

  // Fetch available visualizations
  const { data: visualizationTypes = [], isLoading: isLoadingVisualizations } = useQuery({
    queryKey: ["visualizations"],
    queryFn: async (): Promise<VisualizationType[]> => {
      // TODO: Replace with actual API call
      return [
        {
          id: "bar",
          name: "Bar Chart",
          description: "Compare values across categories",
          icon: () => null, // Icon will be provided by the component
          supportedDataTypes: ["number", "count", "currency", "time"],
          minMetrics: 1,
          maxMetrics: 5
        },
        {
          id: "line",
          name: "Line Chart",
          description: "Show trends over time",
          icon: () => null,
          supportedDataTypes: ["number", "percentage", "currency", "time"],
          minMetrics: 1,
          maxMetrics: 3
        },
        {
          id: "pie",
          name: "Pie Chart",
          description: "Show parts of a whole",
          icon: () => null,
          supportedDataTypes: ["number", "percentage", "count"],
          minMetrics: 1,
          maxMetrics: 1
        },
        {
          id: "gauge",
          name: "Gauge",
          description: "Display progress toward goals",
          icon: () => null,
          supportedDataTypes: ["percentage"],
          minMetrics: 1,
          maxMetrics: 1
        }
      ];
    }
  });

  // Save report configuration
  const { mutate: saveReport, isPending: isSaving } = useMutation({
    mutationFn: async (config: ReportConfig) => {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return config;
    },
    onSuccess: () => {
      options.onSaveSuccess?.();
    },
    onError: (error: Error) => {
      options.onSaveError?.(error);
    }
  });

  // Fetch report data for preview
  const { data: reportData = [], isLoading: isLoadingData } = useQuery({
    queryKey: ["report-data", selectedMetrics, selectedVisualization],
    enabled: selectedMetrics.length > 0 && !!selectedVisualization,
    queryFn: async () => {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return [];
    }
  });

  const handleMetricSelect = useCallback((metricId: string) => {
    setSelectedMetrics(prev =>
      prev.includes(metricId)
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId]
    );
  }, []);

  const handleVisualizationSelect = useCallback((visualizationId: string) => {
    setSelectedVisualization(visualizationId);
  }, []);

  const selectedMetricObjects = useMemo(() => {
    return metricCategories
      .flatMap(category => category.metrics)
      .filter(metric => selectedMetrics.includes(metric.id));
  }, [metricCategories, selectedMetrics]);

  const selectedMetricTypes = useMemo(() => {
    return [...new Set(selectedMetricObjects.map(metric => metric.dataType))];
  }, [selectedMetricObjects]);

  const handleSave = useCallback(() => {
    if (!reportName.trim()) {
      throw new Error("Report name is required");
    }

    if (selectedMetrics.length === 0) {
      throw new Error("At least one metric must be selected");
    }

    if (!selectedVisualization) {
      throw new Error("A visualization type must be selected");
    }

    saveReport({
      name: reportName,
      description: reportDescription,
      metrics: selectedMetrics,
      visualization: selectedVisualization
    });
  }, [reportName, reportDescription, selectedMetrics, selectedVisualization, saveReport]);

  const isLoading = isLoadingMetrics || isLoadingVisualizations || isLoadingData;

  return {
    // State
    reportName,
    reportDescription,
    selectedMetrics,
    selectedVisualization,
    metricCategories,
    visualizationTypes,
    reportData,
    selectedMetricObjects,
    selectedMetricTypes,

    // Loading states
    isLoading,
    isSaving,

    // Actions
    setReportName,
    setReportDescription,
    handleMetricSelect,
    handleVisualizationSelect,
    handleSave
  };
} 