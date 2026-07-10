import { client } from "@meridian/libs";

// The generated AppType is missing project[":id"], so type the request locally
export type GetProjectRequest = {
  id: string;
  workspaceId: string;
};

async function getProject({ id, workspaceId }: GetProjectRequest) {
  const response = await (client as any).project[":id"].$get({
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

export default getProject;
