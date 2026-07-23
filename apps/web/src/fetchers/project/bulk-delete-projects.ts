import { API_BASE_URL } from "../../constants/urls";

interface BulkDeleteProjectsRequest {
  projectIds: string[];
  workspaceId: string;
  reason?: string;
}

interface BulkOperationResult {
  success: boolean;
  count: number;
  items: Array<{ id: string; status: "success" | "failed"; error?: string }>;
}

const bulkDeleteProjects = async ({
  projectIds,
  workspaceId,
  reason,
}: BulkDeleteProjectsRequest): Promise<BulkOperationResult> => {
  const response = await fetch(`${API_BASE_URL}/projects/bulk/delete`, {
    // POST, not DELETE — see the matching comment on the backend route.
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ projectIds, workspaceId, reason }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.error?.message ||
        errorData?.error ||
        "Failed to delete projects",
    );
  }

  const result = (await response.json()) as BulkOperationResult;

  if (!result.success) {
    const firstError = result.items.find((i) => i.status === "failed")?.error;
    throw new Error(firstError || "Failed to delete projects");
  }

  return result;
};

export default bulkDeleteProjects;
