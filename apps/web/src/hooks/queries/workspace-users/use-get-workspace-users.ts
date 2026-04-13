import getWorkspaceUsers from "@/fetchers/workspace-user/get-workspace-users";
import { useQuery } from "@tanstack/react-query";

function useGetWorkspaceUsers({ workspaceId }: { workspaceId: string }) {
  return useQuery({
    queryKey: ["workspace-users", workspaceId],
    queryFn: () => getWorkspaceUsers({ param: { workspaceId } }),
    enabled: !!workspaceId && workspaceId.length > 0,
  });
}

export default useGetWorkspaceUsers;
