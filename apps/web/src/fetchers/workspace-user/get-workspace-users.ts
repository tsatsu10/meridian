import { client } from "@meridian/libs";
import { dedupeWorkspaceUsersForList } from "@/lib/workspace-users/dedupe-workspace-users";
import type { WorkspaceMember } from "@/types/workspace-user";
import type { InferRequestType } from "hono/client";

export type GetWorkspaceUsersRequest = InferRequestType<
  (typeof client)["workspace-user"][":workspaceId"]["$get"]
>;

function normalizeWorkspaceMember(raw: Record<string, unknown>): WorkspaceMember {
  const emailRaw = (raw.email ?? raw.userEmail ?? "") as string;
  const email = String(emailRaw).trim().toLowerCase();
  const name = (raw.name ?? raw.userName ?? null) as string | null;
  const id = typeof raw.id === "string" ? raw.id : null;
  const avatar = typeof raw.avatar === "string" ? raw.avatar : null;
  const joinedAt =
    typeof raw.joinedAt === "string"
      ? raw.joinedAt
      : raw.joinedAt != null
        ? String(raw.joinedAt)
        : "";
  const status = String(raw.status ?? "");
  const role = String(raw.role ?? "member");

  return {
    id,
    email,
    name,
    avatar,
    joinedAt,
    status,
    role,
    userEmail: email,
    userName: name,
  };
}

async function getWorkspaceUsers({ param }: GetWorkspaceUsersRequest) {
  const response = await client["workspace-user"][":workspaceId"].$get({
    param,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  const list = Array.isArray(data) ? data : [];
  const deduped = dedupeWorkspaceUsersForList(
    list as Record<string, unknown>[],
  );
  return deduped.map((row) =>
    normalizeWorkspaceMember(row as Record<string, unknown>),
  );
}

export default getWorkspaceUsers;
