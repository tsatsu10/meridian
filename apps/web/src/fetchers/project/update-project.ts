import { looseClient } from "@/lib/rpc-client";

// The generated AppType is missing project[":id"], so type the request locally
export type UpdateProjectRequest = {
  id: string;
  name: string;
  icon?: string | null;
  slug: string;
  description?: string | null;
};

async function updateProject({
  id,
  name,
  icon,
  slug,
  description,
}: UpdateProjectRequest) {
  const response = await looseClient.project[":id"].$put({
    param: { id },
    json: { name, icon, slug, description },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();

  return data;
}

export default updateProject;
