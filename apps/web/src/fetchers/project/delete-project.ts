import { client } from "@meridian/libs";

// The generated AppType is missing project[":id"], so type the request locally
export type DeleteProjectRequest = { id: string };

async function deleteProject({ id }: DeleteProjectRequest) {
  const response = await (client as any).project[":id"].$delete({ param: { id } });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();

  return data;
}

export default deleteProject;
