import { looseClient } from "@/lib/rpc-client";

// The generated AppType is missing label[":taskId"], so type the request locally
export type GetLabelsByTaskRequest = { taskId: string };

async function getLabelsByTask({ taskId }: GetLabelsByTaskRequest) {
  const response = await looseClient.label[":taskId"].$get({
    param: {
      taskId,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default getLabelsByTask;
