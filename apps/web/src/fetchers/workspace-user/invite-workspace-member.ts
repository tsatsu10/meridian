import { client } from "@meridian/libs";

// The generated AppType is missing workspace-user[":workspaceId"], so type the request locally
export type InviteWorkspaceMemberRequest = {
  workspaceId: string;
  userEmail: string;
};

const inviteWorkspaceMember = async ({
  workspaceId,
  userEmail,
}: InviteWorkspaceMemberRequest) => {
  const response = await (client as any)["workspace-user"][":workspaceId"].invite.$post({
    json: { userEmail },
    param: { workspaceId },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();

  return data;
};

export default inviteWorkspaceMember;
