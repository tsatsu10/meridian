/**
 * Canonical workspace roster row — aligned with GET /api/workspace-user/:workspaceId
 * after normalization in get-workspace-users fetcher.
 */
export type WorkspaceMember = {
  id: string | null;
  /** workspace_user.id - a different id space from `id` (the user's id); required by the change-role/remove-member endpoints */
  workspaceUserId: string | null;
  email: string;
  name: string | null;
  avatar: string | null;
  joinedAt: string;
  status: string;
  role: string;
  /** Alias of email for legacy UI */
  userEmail: string;
  /** Alias of name for legacy UI */
  userName: string | null;
};

/** @deprecated Use WorkspaceMember */
export type WorkspaceUser = WorkspaceMember;

export default WorkspaceMember;
