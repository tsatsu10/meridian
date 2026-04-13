import { type MetricDefinition, type MetricQuery, type MetricResult, type MetricValue } from "@/types/metrics";
import { API_BASE_URL, API_URL } from '@/constants/urls';

// Predefined metrics
export const METRIC_DEFINITIONS: MetricDefinition[] = [
  // Project Metrics
  {
    id: "total-projects",
    name: "Total Projects",
    description: "Total number of projects in the workspace",
    category: "project",
    dataType: "count",
    aggregation: "count",
    defaultTimeframe: "all",
    formula: "SELECT COUNT(DISTINCT id) FROM projects WHERE workspace_id = :workspaceId"
  },
  {
    id: "active-projects",
    name: "Active Projects",
    description: "Number of projects currently in progress",
    category: "project",
    dataType: "count",
    aggregation: "count",
    defaultTimeframe: "all",
    formula: "SELECT COUNT(DISTINCT id) FROM projects WHERE workspace_id = :workspaceId AND status = 'in_progress'"
  },
  {
    id: "project-health",
    name: "Project Health Score",
    description: "Average health score across all projects",
    category: "project",
    dataType: "percentage",
    aggregation: "average",
    defaultTimeframe: "all",
    formula: "SELECT AVG(health_score) FROM projects WHERE workspace_id = :workspaceId",
    thresholds: {
      warning: 70,
      critical: 50
    }
  },
  {
    id: "project-completion-rate",
    name: "Project Completion Rate",
    description: "Percentage of projects completed on time",
    category: "project",
    dataType: "percentage",
    aggregation: "average",
    defaultTimeframe: "30d",
    formula: `
      SELECT 
        COUNT(CASE WHEN actual_end_date <= planned_end_date THEN 1 END) * 100.0 / COUNT(*)
      FROM projects
      WHERE workspace_id = :workspaceId
        AND status = 'completed'
        AND actual_end_date >= :startDate
        AND actual_end_date <= :endDate
    `,
    thresholds: {
      warning: 80,
      critical: 60
    }
  },

  // Task Metrics
  {
    id: "total-tasks",
    name: "Total Tasks",
    description: "Total number of tasks across all projects",
    category: "task",
    dataType: "count",
    aggregation: "count",
    defaultTimeframe: "all",
    formula: "SELECT COUNT(*) FROM tasks WHERE project_id IN (SELECT id FROM projects WHERE workspace_id = :workspaceId)"
  },
  {
    id: "completed-tasks",
    name: "Completed Tasks",
    description: "Number of tasks marked as complete",
    category: "task",
    dataType: "count",
    aggregation: "count",
    defaultTimeframe: "30d",
    formula: `
      SELECT COUNT(*) 
      FROM tasks 
      WHERE project_id IN (SELECT id FROM projects WHERE workspace_id = :workspaceId)
        AND status = 'completed'
        AND completed_at >= :startDate
        AND completed_at <= :endDate
    `
  },
  {
    id: "task-completion-rate",
    name: "Task Completion Rate",
    description: "Percentage of tasks completed on time",
    category: "task",
    dataType: "percentage",
    aggregation: "average",
    defaultTimeframe: "30d",
    formula: `
      SELECT 
        COUNT(CASE WHEN completed_at <= due_date THEN 1 END) * 100.0 / COUNT(*)
      FROM tasks
      WHERE project_id IN (SELECT id FROM projects WHERE workspace_id = :workspaceId)
        AND status = 'completed'
        AND completed_at >= :startDate
        AND completed_at <= :endDate
    `,
    thresholds: {
      warning: 85,
      critical: 70
    }
  },

  // Team Metrics
  {
    id: "team-velocity",
    name: "Team Velocity",
    description: "Average number of story points completed per sprint",
    category: "team",
    dataType: "number",
    aggregation: "average",
    defaultTimeframe: "30d",
    formula: `
      SELECT AVG(points_completed)
      FROM (
        SELECT 
          sprint_id,
          SUM(story_points) as points_completed
        FROM tasks
        WHERE project_id IN (SELECT id FROM projects WHERE workspace_id = :workspaceId)
          AND status = 'completed'
          AND completed_at >= :startDate
          AND completed_at <= :endDate
        GROUP BY sprint_id
      )
    `,
    unit: "points"
  },
  {
    id: "team-capacity",
    name: "Team Capacity",
    description: "Total available working hours for the team",
    category: "team",
    dataType: "time",
    aggregation: "sum",
    defaultTimeframe: "7d",
    formula: `
      SELECT SUM(capacity_hours)
      FROM team_members
      WHERE team_id IN (SELECT id FROM teams WHERE workspace_id = :workspaceId)
    `,
    unit: "hours"
  },
  {
    id: "team-utilization",
    name: "Team Utilization",
    description: "Percentage of team capacity being utilized",
    category: "team",
    dataType: "percentage",
    aggregation: "average",
    defaultTimeframe: "7d",
    formula: `
      WITH capacity AS (
        SELECT SUM(capacity_hours) as total_capacity
        FROM team_members
        WHERE team_id IN (SELECT id FROM teams WHERE workspace_id = :workspaceId)
      ),
      tracked_time AS (
        SELECT SUM(duration_hours) as total_tracked
        FROM time_entries
        WHERE user_id IN (
          SELECT user_id 
          FROM team_members 
          WHERE team_id IN (SELECT id FROM teams WHERE workspace_id = :workspaceId)
        )
        AND created_at >= :startDate
        AND created_at <= :endDate
      )
      SELECT (total_tracked * 100.0 / total_capacity)
      FROM capacity, tracked_time
    `,
    thresholds: {
      warning: 90,
      critical: 100
    }
  },

  // Time Metrics
  {
    id: "total-hours",
    name: "Total Hours Tracked",
    description: "Total hours tracked across all tasks",
    category: "time",
    dataType: "time",
    aggregation: "sum",
    defaultTimeframe: "30d",
    formula: `
      SELECT SUM(duration_hours)
      FROM time_entries
      WHERE project_id IN (SELECT id FROM projects WHERE workspace_id = :workspaceId)
        AND created_at >= :startDate
        AND created_at <= :endDate
    `,
    unit: "hours"
  },
  {
    id: "billable-hours",
    name: "Billable Hours",
    description: "Total billable hours tracked",
    category: "time",
    dataType: "time",
    aggregation: "sum",
    defaultTimeframe: "30d",
    formula: `
      SELECT SUM(duration_hours)
      FROM time_entries
      WHERE project_id IN (SELECT id FROM projects WHERE workspace_id = :workspaceId)
        AND is_billable = true
        AND created_at >= :startDate
        AND created_at <= :endDate
    `,
    unit: "hours"
  },
  {
    id: "time-utilization",
    name: "Time Utilization",
    description: "Percentage of tracked time that is billable",
    category: "time",
    dataType: "percentage",
    aggregation: "average",
    defaultTimeframe: "30d",
    formula: `
      WITH total_time AS (
        SELECT SUM(duration_hours) as total_hours
        FROM time_entries
        WHERE project_id IN (SELECT id FROM projects WHERE workspace_id = :workspaceId)
          AND created_at >= :startDate
          AND created_at <= :endDate
      ),
      billable_time AS (
        SELECT SUM(duration_hours) as billable_hours
        FROM time_entries
        WHERE project_id IN (SELECT id FROM projects WHERE workspace_id = :workspaceId)
          AND is_billable = true
          AND created_at >= :startDate
          AND created_at <= :endDate
      )
      SELECT (billable_hours * 100.0 / total_hours)
      FROM total_time, billable_time
    `,
    thresholds: {
      warning: 70,
      critical: 50
    }
  }
];

class MetricLibraryService {
  private static instance: MetricLibraryService;

  private constructor() {}

  public static getInstance(): MetricLibraryService {
    if (!MetricLibraryService.instance) {
      MetricLibraryService.instance = new MetricLibraryService();
    }
    return MetricLibraryService.instance;
  }

  public async getMetricDefinitions(): Promise<MetricDefinition[]> {
    return METRIC_DEFINITIONS;
  }

  public async getMetricDefinition(metricId: string): Promise<MetricDefinition | undefined> {
    return METRIC_DEFINITIONS.find(metric => metric.id === metricId);
  }

  public async queryMetrics(query: MetricQuery): Promise<MetricResult[]> {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`${API_BASE_URL}/metrics/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(query),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch metric data");
      }

      return response.json();
    } catch (error) {
      console.error("Error querying metrics:", error);
      throw error;
    }
  }

  public async getMetricValue(metricId: string, context: MetricValue["context"]): Promise<MetricValue | null> {
    try {
      const definition = await this.getMetricDefinition(metricId);
      if (!definition) {
        throw new Error(`Metric definition not found: ${metricId}`);
      }

      // TODO: Replace with actual API call
      const response = await fetch(`${API_BASE_URL}/metrics/${metricId}/value`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timeframe: definition.defaultTimeframe,
          context,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch metric value");
      }

      return response.json();
    } catch (error) {
      console.error("Error getting metric value:", error);
      throw error;
    }
  }

  public async calculateDerivedMetric(
    formula: string,
    context: Record<string, unknown>
  ): Promise<number | null> {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`${API_BASE_URL}/metrics/calculate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formula,
          context,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to calculate derived metric");
      }

      const result = await response.json();
      return result.value;
    } catch (error) {
      console.error("Error calculating derived metric:", error);
      throw error;
    }
  }

  public getMetricsByCategory(category: string): MetricDefinition[] {
    return METRIC_DEFINITIONS.filter(metric => metric.category === category);
  }

  public searchMetrics(query: string): MetricDefinition[] {
    const searchTerms = query.toLowerCase().split(" ");
    return METRIC_DEFINITIONS.filter(metric => {
      const searchText = `${metric.name} ${metric.description} ${metric.category}`.toLowerCase();
      return searchTerms.every(term => searchText.includes(term));
    });
  }
}

export const metricLibrary = MetricLibraryService.getInstance(); 