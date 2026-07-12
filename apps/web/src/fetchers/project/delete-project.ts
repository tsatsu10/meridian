import { looseClient } from "@/lib/rpc-client";

// The generated AppType is missing project[":id"], so type the request locally
export type DeleteProjectRequest = { id: string; workspaceId: string };

async function deleteProject({ id, workspaceId }: DeleteProjectRequest) {
  // The API requires workspaceId to scope the destructive delete
  const response = await looseClient.project[":id"].$delete({
    param: { id },
    query: { workspaceId },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();

  return data;
}

export default deleteProject;
