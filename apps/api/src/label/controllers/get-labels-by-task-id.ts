import { getDatabase } from "../../database/connection";

async function getLabelsByTaskId(taskId: string) {
  const db = getDatabase();
  const labels = await db.query.labelTable.findMany({
    where: (label, { eq }) => eq(label.taskId, taskId),
  });

  return labels;
}

export default getLabelsByTaskId;

