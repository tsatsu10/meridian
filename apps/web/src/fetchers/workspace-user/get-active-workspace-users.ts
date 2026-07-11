import { client } from "@meridian/libs";

// The generated AppType is missing workspace-user[":workspaceId"], so type locally
export type GetActiveWorkspaceUsersRequest = { workspaceId: string };

async function getActiveWorkspaceUsers({
  workspaceId,
}: GetActiveWorkspaceUsersRequest) {
  const response = await (client as any)["workspace-user"][
    ":workspaceId"
  ].active.$get({
    param: { workspaceId },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();

  return data;
}

export default getActiveWorkspaceUsers;
