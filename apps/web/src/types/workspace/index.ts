// The generated AppType is missing workspace[":id"], so this mirrors the API
// response (apps/api workspace/controllers/get-workspace.ts).
export type Workspace = {
  id: string;
  name: string;
  ownerId: string | null;
  ownerEmail: string | null;
  description: string | null;
  createdAt: string;
};

export default Workspace;
