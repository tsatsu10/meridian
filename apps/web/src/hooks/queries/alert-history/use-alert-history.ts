import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";

interface AlertHistoryParams {
  workspaceId: string;
  limit?: number;
  offset?: number;
  status?: 'active' | 'resolved' | 'acknowledged' | 'dismissed';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  alertType?: 'overdue' | 'blocked' | 'resource_conflict' | 'deadline_risk' | 'dependency_chain' | 'quality_risk';
}

export function useAlertHistory(params: AlertHistoryParams) {
  const { workspaceId, limit = 50, offset = 0, status, severity, alertType } = params;

  return useQuery({
    queryKey: ["alert-history", workspaceId, limit, offset, status, severity, alertType],
    queryFn: async () => {
      const searchParams = new URLSearchParams();

      if (limit) searchParams.set('limit', limit.toString());
      if (offset) searchParams.set('offset', offset.toString());
      if (status) searchParams.set('status', status);
      if (severity) searchParams.set('severity', severity);
      if (alertType) searchParams.set('alertType', alertType);

      return await fetchApi(`/risk-detection/history/${workspaceId}?${searchParams.toString()}`);
    },
    enabled: !!workspaceId && workspaceId.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes - history data doesn't change frequently
    gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
    refetchOnWindowFocus: false, // History data is less critical
    refetchOnMount: false, // Don't refetch on every mount
    placeholderData: (previousData) => previousData,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}

// Hook for alert history statistics only
export function useAlertHistoryStats(workspaceId: string) {
  return useQuery({
    queryKey: ["alert-history-stats", workspaceId],
    queryFn: async () => {
      const data = await fetchApi(`/risk-detection/history/${workspaceId}?limit=1`);
      return data.statistics;
    },
    enabled: !!workspaceId && workspaceId.length > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes - stats change slowly
    gcTime: 60 * 60 * 1000, // 1 hour garbage collection
    refetchInterval: 5 * 60 * 1000, // 5 minutes - periodic stats refresh
    placeholderData: (previousData) => previousData,
    retry: 2,
  });
}