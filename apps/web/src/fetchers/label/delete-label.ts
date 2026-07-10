import { client } from "@meridian/libs";

// The generated AppType is missing label[":id"], so type the request locally
export type DeleteLabelRequest = { id: string };

async function deleteLabel({ id }: DeleteLabelRequest) {
  const response = await (client as any).label[":id"].$delete({
    param: { id },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();

  return data;
}

export default deleteLabel;
