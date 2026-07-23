import { looseClient } from "@/lib/rpc-client";

// The generated AppType is missing workspace-user[":workspaceId"], so type the request locally
export type InviteWorkspaceMemberRequest = {
  workspaceId: string;
  userEmail: string;
  role?: string;
};

const inviteWorkspaceMember = async ({
  workspaceId,
  userEmail,
  role,
}: InviteWorkspaceMemberRequest) => {
  const response = await looseClient["workspace-user"][
    ":workspaceId"
  ].invite.$post({
    json: { userEmail, ...(role ? { role } : {}) },
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
