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

// The generated AppType is missing project[":projectId"].members, so type the
// route locally instead of falling back to `any`.
type ProjectMembersRoute = {
  project: Record<
    string,
    {
      members: {
        $post: (arg: {
          param: { projectId: string };
          json: unknown;
        }) => Promise<Response>;
      };
    }
  >;
};

async function addProjectMember(data: AddProjectMemberData) {
  const { projectId, ...memberData } = data;
  const response = await (
    client as unknown as ProjectMembersRoute
  ).project[":projectId"].members.$post({
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
    onSuccess: (_data, variables) => {
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
    onError: (error: unknown) => {
      const message = (
        error as { response?: { data?: { message?: string } } }
      ).response?.data?.message;
      toast.error(message || "Failed to add team member");
    },
  });
}

export default useAddProjectMember;
