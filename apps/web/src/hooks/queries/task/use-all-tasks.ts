import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";
import useWorkspaceStore from "@/store/workspace";

export interface AllTasksFilters {
  userEmail?: string;
  status?: string[];
  priority?: string[];
  assignedToMe?: boolean;
  projectIds?: string[];
  dueAfter?: Date;
  dueBefore?: Date;
  search?: string;
  limit?: number;
  offset?: number;
}

interface Task {
  id: string;
  title: string;
  number: number;
  description: string;
  status: string;
  priority: string;
  dueDate: Date | null;
  position: number;
  createdAt: Date;
  userEmail: string | null;
  assigneeName: string | null;
  assigneeEmail: string | null;
  projectId: string;
  parentId: string | null;
  project: {
    id: string;
    name: string;
    slug: string;
    icon: string;
    workspaceId: string;
  };
}

interface AllTasksResponse {
  tasks: Task[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    pages: number;
    currentPage: number;
  };
  filters: {
    projects: Array<{
      id: string;
      name: string;
      slug: string;
      icon: string;
      columns: Array<{
        id: string;
        name: string;
        color?: string;
        isDefault?: boolean;
      }>;
    }>;
    teamMembers: Array<{
      email: string;
      name: string;
    }>;
    statuses: string[];
    priorities: string[];
  };
}

export function useAllTasks(filters: AllTasksFilters = {}) {
  const { workspace } = useWorkspaceStore();

  const queryParams = new URLSearchParams();
  
  if (filters.userEmail) queryParams.append("userEmail", filters.userEmail);
  if (filters.status?.length) queryParams.append("status", filters.status.join(","));
  if (filters.priority?.length) queryParams.append("priority", filters.priority.join(","));
  if (filters.assignedToMe) queryParams.append("assignedToMe", "true");
  if (filters.projectIds?.length) queryParams.append("projectIds", filters.projectIds.join(","));
  if (filters.dueAfter) queryParams.append("dueAfter", filters.dueAfter.toISOString());
  if (filters.dueBefore) queryParams.append("dueBefore", filters.dueBefore.toISOString());
  if (filters.search) queryParams.append("search", filters.search);
  if (filters.limit) queryParams.append("limit", filters.limit.toString());
  if (filters.offset) queryParams.append("offset", filters.offset.toString());

  return useQuery<AllTasksResponse>({
    queryKey: ["all-tasks", workspace?.id, filters],
    queryFn: async () => {
      if (!workspace?.id) {
        throw new Error("No workspace selected");
      }

      const url = `/task/all/${workspace.id}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      return fetchApi(url);
    },
    enabled: !!workspace?.id,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}

export default useAllTasks; 