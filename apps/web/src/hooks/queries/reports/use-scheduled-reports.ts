import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "@/constants/urls";

export interface ScheduledReport {
  id: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  frequency: "daily" | "weekly" | "monthly";
  time: string;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  recipients: string[];
  format: "pdf" | "excel" | "csv";
  sections: string[];
  isActive: boolean;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  createdAt: string;
  createdBy: string;
}

export interface ScheduledReportInput {
  name: string;
  description?: string;
  frequency: "daily" | "weekly" | "monthly";
  time: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  format: "pdf" | "excel" | "csv";
  recipients: string[];
  sections: string[];
  isActive: boolean;
}

async function parseOrThrow(response: Response) {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error?.message || body?.error || "Request failed");
  }
  return response.json();
}

export function useScheduledReports(workspaceId: string | undefined) {
  return useQuery<ScheduledReport[]>({
    queryKey: ["scheduled-reports", workspaceId],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/reports/scheduled/${workspaceId}`,
      );
      const body = await parseOrThrow(response);
      return body.data as ScheduledReport[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateScheduledReport(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ScheduledReportInput) => {
      const response = await fetch(
        `${API_BASE_URL}/reports/scheduled/${workspaceId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      const body = await parseOrThrow(response);
      return body.data as ScheduledReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["scheduled-reports", workspaceId],
      });
    },
  });
}

export function useUpdateScheduledReport(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      reportId,
      ...input
    }: Partial<ScheduledReportInput> & { reportId: string }) => {
      const response = await fetch(
        `${API_BASE_URL}/reports/scheduled/${workspaceId}/${reportId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      const body = await parseOrThrow(response);
      return body.data as ScheduledReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["scheduled-reports", workspaceId],
      });
    },
  });
}

export function useDeleteScheduledReport(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reportId: string) => {
      const response = await fetch(
        `${API_BASE_URL}/reports/scheduled/${workspaceId}/${reportId}`,
        { method: "DELETE" },
      );
      return parseOrThrow(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["scheduled-reports", workspaceId],
      });
    },
  });
}

export function useRunScheduledReportNow(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reportId: string) => {
      const response = await fetch(
        `${API_BASE_URL}/reports/scheduled/${workspaceId}/${reportId}/run`,
        { method: "POST" },
      );
      const body = await parseOrThrow(response);
      return body.data as {
        sent: boolean;
        recipientCount: number;
        error?: string;
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["scheduled-reports", workspaceId],
      });
    },
  });
}
