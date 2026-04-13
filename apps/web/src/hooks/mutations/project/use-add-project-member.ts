import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@meridian/libs";
import { toast } from "sonner";

interface AddProjectMemberData {
  projectId: string;
  userEmail: string;
  role?: "owner" | "admin" | "team-lead" | "senior" | "member" | "viewer";
  hoursPerWeek?: number;
  notificationSettings?: Record<string, boolean>;
}

async function addProjectMember(data: AddProjectMemberData) {
  const { projectId, ...memberData } = data;
  const response = await client.project[":projectId"].members.$post({
    param: { projectId },
    json: memberData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const result = await response.json();
  return result;
}

function useAddProjectMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addProjectMember,
    onSuccess: (data, variables) => {
      // Invalidate and refetch project members
      queryClient.invalidateQueries({
        queryKey: ["project-members", variables.projectId],
      });
      
      // Also invalidate workspace users in case the member list affects it
      queryClient.invalidateQueries({
        queryKey: ["workspace-users"],
      });

      toast.success("Team member added successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to add team member");
    },
  });
}

export default useAddProjectMember; 