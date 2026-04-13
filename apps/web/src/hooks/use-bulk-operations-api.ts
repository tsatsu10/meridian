import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { API_BASE_URL } from "@/constants/urls";

/**
 * React Query hooks for bulk project operations
 * All hooks support debouncing, caching, and error handling
 */

/**
 * Hook for bulk updating projects
 */
export function useBulkUpdateProjects() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      projectIds: string[];
      updates: {
        status?: string;
        priority?: string;
        health?: string;
        dueDate?: Date | null;
        description?: string;
      };
    }) => {
      const response = await fetch(`${API_BASE_URL}/projects/bulk/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          projectIds: payload.projectIds,
          updates: {
            status: payload.updates.status,
            priority: payload.updates.priority,
            health: payload.updates.health,
            dueDate: payload.updates.dueDate?.toISOString() || null,
            description: payload.updates.description,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Bulk update failed: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: (result) => {
      // Invalidate project queries to refetch
      queryClient.invalidateQueries({ queryKey: ["projects"] });

      // Emit event for real-time updates
      if (window.dispatchEvent) {
        window.dispatchEvent(
          new CustomEvent("bulk-operation:success", {
            detail: result,
          })
        );
      }
    },
    onError: (error) => {
      console.error("Bulk update mutation error:", error);
      if (window.dispatchEvent) {
        window.dispatchEvent(
          new CustomEvent("bulk-operation:error", {
            detail: { error: error instanceof Error ? error.message : String(error) },
          })
        );
      }
    },
  });
}

/**
 * Hook for bulk deleting projects
 */
export function useBulkDeleteProjects() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { projectIds: string[]; reason?: string }) => {
      const response = await fetch(`${API_BASE_URL}/projects/bulk/delete`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Bulk delete failed: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: (result) => {
      // Invalidate project queries
      queryClient.invalidateQueries({ queryKey: ["projects"] });

      // Emit event for real-time updates
      if (window.dispatchEvent) {
        window.dispatchEvent(
          new CustomEvent("bulk-operation:success", {
            detail: result,
          })
        );
      }
    },
    onError: (error) => {
      console.error("Bulk delete mutation error:", error);
      if (window.dispatchEvent) {
        window.dispatchEvent(
          new CustomEvent("bulk-operation:error", {
            detail: { error: error instanceof Error ? error.message : String(error) },
          })
        );
      }
    },
  });
}

/**
 * Hook for bulk creating projects
 */
export function useBulkCreateProjects() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      projects: Array<{
        name: string;
        workspaceId: string;
        ownerId: string;
        icon?: string;
        slug?: string;
        status?: string;
        priority?: string;
      }>;
    }) => {
      const response = await fetch(`${API_BASE_URL}/projects/bulk/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Bulk create failed: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: (result) => {
      // Invalidate project queries
      queryClient.invalidateQueries({ queryKey: ["projects"] });

      // Emit event for real-time updates
      if (window.dispatchEvent) {
        window.dispatchEvent(
          new CustomEvent("bulk-operation:success", {
            detail: result,
          })
        );
      }
    },
    onError: (error) => {
      console.error("Bulk create mutation error:", error);
      if (window.dispatchEvent) {
        window.dispatchEvent(
          new CustomEvent("bulk-operation:error", {
            detail: { error: error instanceof Error ? error.message : String(error) },
          })
        );
      }
    },
  });
}

/**
 * Hook for bulk exporting projects
 */
export function useBulkExportProjects() {
  return useCallback(async (projectIds: string[]) => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects?ids=${projectIds.join(",")}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const projects = await response.json();

      // Generate CSV
      const csv = generateProjectsCSV(projects);

      // Download
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `projects-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Emit event
      if (window.dispatchEvent) {
        window.dispatchEvent(
          new CustomEvent("bulk-operation:success", {
            detail: { type: "export", count: projectIds.length },
          })
        );
      }
    } catch (error) {
      console.error("Bulk export error:", error);
      if (window.dispatchEvent) {
        window.dispatchEvent(
          new CustomEvent("bulk-operation:error", {
            detail: { error: error instanceof Error ? error.message : String(error) },
          })
        );
      }
    }
  }, []);
}

/**
 * Helper function to generate CSV from projects
 */
function generateProjectsCSV(projects: any[]): string {
  const headers = ["ID", "Name", "Status", "Priority", "Owner", "Created At"];
  const rows = projects.map((p) => [p.id, p.name, p.status, p.priority, p.ownerId, p.createdAt]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((cell) => (typeof cell === "string" && cell.includes(",") ? `"${cell}"` : cell))
        .join(",")
    ),
  ].join("\n");

  return csvContent;
}

/**
 * Combined hook for all bulk operations
 */
export function useBulkOperations() {
  const bulkUpdate = useBulkUpdateProjects();
  const bulkDelete = useBulkDeleteProjects();
  const bulkCreate = useBulkCreateProjects();
  const bulkExport = useBulkExportProjects();

  return {
    bulkUpdate,
    bulkDelete,
    bulkCreate,
    bulkExport,
    isLoading:
      bulkUpdate.isPending || bulkDelete.isPending || bulkCreate.isPending,
  };
}
