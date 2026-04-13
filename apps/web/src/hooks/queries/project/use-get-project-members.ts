import { useQuery } from "@tanstack/react-query";
import { client } from "@meridian/libs";

interface ProjectMember {
  id: string;
  projectId: string;
  userEmail: string;
  role: string;
  permissions: Record<string, any> | null;
  assignedAt: Date;
  assignedBy: string | null;
  hoursPerWeek: number;
  isActive: boolean;
  notificationSettings: Record<string, boolean> | null;
  userName: string;
  userCreatedAt: Date;
}

async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const response = await client.project[":projectId"].members.$get({
    param: { projectId },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

function useGetProjectMembers(projectId: string) {
  return useQuery({
    queryKey: ["project-members", projectId],
    queryFn: () => getProjectMembers(projectId),
    enabled: !!projectId,
  });
}

export default useGetProjectMembers; 