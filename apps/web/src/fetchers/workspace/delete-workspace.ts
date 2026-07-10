import { client } from "@meridian/libs";

// The generated AppType is missing workspace[":id"], so type the request locally
type DeleteWorkspaceRequest = {
  id: string;
};

const deleteWorkspace = async ({ id }: DeleteWorkspaceRequest) => {
  const response = await (client as any).workspace[":id"].$delete({
    param: { id },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const workspace = await response.json();

  return workspace;
};

export default deleteWorkspace;
