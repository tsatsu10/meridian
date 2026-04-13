import getProjects from "@/fetchers/project/get-projects";
import type { GetProjectsListParams } from "@/fetchers/project/get-projects";
import { useQuery } from "@tanstack/react-query";

function useGetProjects(params: GetProjectsListParams) {
  const {
    workspaceId,
    limit,
    offset,
    includeArchived,
    archivedOnly,
    q,
    status,
    priority,
    ownerIds,
    teamMemberIds,
    sortBy,
    sortOrder,
  } = params;

  return useQuery({
    queryFn: async () => getProjects(params),
    queryKey: [
      "projects",
      workspaceId,
      limit,
      offset,
      includeArchived,
      archivedOnly,
      q ?? "",
      status?.join(",") ?? "",
      priority?.join(",") ?? "",
      ownerIds?.join(",") ?? "",
      teamMemberIds?.join(",") ?? "",
      sortBy ?? "",
      sortOrder ?? "",
    ],
    enabled: !!workspaceId && workspaceId.length > 0,
    staleTime: 30_000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export default useGetProjects;
export type { GetProjectsListParams };
