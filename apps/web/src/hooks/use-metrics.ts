import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { metricLibrary } from "@/services/metric-library";
import type {
  MetricDefinition,
  MetricQuery,
  MetricResult,
  MetricValue,
  MetricCategory,
  MetricTimeframe
} from "@/types/metrics";

interface UseMetricsOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

interface UseMetricValueOptions extends UseMetricsOptions {
  context?: MetricValue["context"];
  timeframe?: MetricTimeframe;
}

export function useMetricDefinitions(options: UseMetricsOptions = {}) {
  return useQuery({
    queryKey: ["metric-definitions"],
    queryFn: () => metricLibrary.getMetricDefinitions(),
    ...options
  });
}

export function useMetricsByCategory(category: MetricCategory, options: UseMetricsOptions = {}) {
  return useQuery({
    queryKey: ["metric-definitions", category],
    queryFn: () => metricLibrary.getMetricsByCategory(category),
    ...options
  });
}

export function useMetricDefinition(metricId: string, options: UseMetricsOptions = {}) {
  return useQuery({
    queryKey: ["metric-definition", metricId],
    queryFn: () => metricLibrary.getMetricDefinition(metricId),
    ...options
  });
}

export function useMetricValue(metricId: string, options: UseMetricValueOptions = {}) {
  const { context, timeframe, ...queryOptions } = options;

  return useQuery({
    queryKey: ["metric-value", metricId, context, timeframe],
    queryFn: () => metricLibrary.getMetricValue(metricId, context),
    ...queryOptions
  });
}

export function useMetricValues(metricIds: string[], options: UseMetricValueOptions = {}) {
  const { context, timeframe, ...queryOptions } = options;

  return useQueries({
    queries: metricIds.map(metricId => ({
      queryKey: ["metric-value", metricId, context, timeframe],
      queryFn: () => metricLibrary.getMetricValue(metricId, context),
      ...queryOptions
    }))
  });
}

export function useMetricQuery(query: MetricQuery, options: UseMetricsOptions = {}) {
  return useQuery({
    queryKey: ["metric-query", query],
    queryFn: () => metricLibrary.queryMetrics(query),
    ...options
  });
}

export function useCalculateDerivedMetric(
  formula: string,
  context: Record<string, unknown>,
  options: UseMetricsOptions = {}
) {
  return useQuery({
    queryKey: ["derived-metric", formula, context],
    queryFn: () => metricLibrary.calculateDerivedMetric(formula, context),
    ...options
  });
}

export function useSearchMetrics(searchQuery: string) {
  return useQuery({
    queryKey: ["metric-search", searchQuery],
    queryFn: () => metricLibrary.searchMetrics(searchQuery),
    enabled: searchQuery.length > 0
  });
} 