import { client } from "@meridian/libs";
import { logger } from "@/lib/logger";

export type GetProjectsListParams = {
  workspaceId: string;
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
  archivedOnly?: boolean;
  q?: string;
  status?: string[];
  priority?: string[];
  ownerIds?: string[];
  teamMemberIds?: string[];
  sortBy?: "name" | "status" | "priority" | "dueDate" | "progress";
  sortOrder?: "asc" | "desc";
};

async function getProjects(params: GetProjectsListParams) {
  if (!params.workspaceId) {
    logger.warn("getProjects called without workspaceId");
    return [];
  }

  const query: Record<string, string> = {
    workspaceId: params.workspaceId,
  };

  if (params.limit !== undefined) query.limit = String(params.limit);
  if (params.offset !== undefined) query.offset = String(params.offset);
  if (params.includeArchived !== undefined) {
    query.includeArchived = String(params.includeArchived);
  }
  if (params.archivedOnly !== undefined) {
    query.archivedOnly = String(params.archivedOnly);
  }
  if (params.q?.trim()) query.q = params.q.trim();
  if (params.status?.length) query.status = params.status.join(",");
  if (params.priority?.length) query.priority = params.priority.join(",");
  if (params.ownerIds?.length) query.ownerIds = params.ownerIds.join(",");
  if (params.teamMemberIds?.length) {
    query.teamMemberIds = params.teamMemberIds.join(",");
  }
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.sortOrder) query.sortOrder = params.sortOrder;

  const response = await client.project.$get({ query });

  if (!response.ok) {
    const error = await response.text();
    logger.error("getProjects API error", { error });
    throw new Error(error);
  }

  const data = await response.json();

  if (data && typeof data === "object" && "projects" in data && "pagination" in data) {
    return data as {
      projects: unknown[];
      pagination: {
        total: number;
        limit: number;
        offset: number;
        pages: number;
        currentPage: number;
      };
    };
  }

  return Array.isArray(data) ? data : [];
}

export default getProjects;
