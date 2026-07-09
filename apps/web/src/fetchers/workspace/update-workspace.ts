import { client } from "@meridian/libs";

// The generated AppType is missing workspace[":id"], so type the request locally
type UpdateWorkspaceRequest = {
  id: string;
  name: string;
  description?: string;
};

const updateWorkspace = async ({
  id,
  name,
  description,
}: UpdateWorkspaceRequest) => {
  const response = await (client as any).workspace[":id"].$put({
    param: { id },
    json: { name, description },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const workspace = await response.json();

  return workspace;
};

export default updateWorkspace;
