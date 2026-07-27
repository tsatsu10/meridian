import { API_BASE_URL } from "@/constants/urls";
import type { MilestoneRow } from "./get-milestones";

export interface UpdateMilestoneRequest {
  milestoneId: string;
  title?: string;
  description?: string;
  type?: string;
  status?: string;
  dueDate?: string;
  riskLevel?: string;
  successCriteria?: string;
  dependencyTaskIds?: string[];
  stakeholderIds?: string[];
}

async function updateMilestone(
  request: UpdateMilestoneRequest,
): Promise<MilestoneRow> {
  const { milestoneId, ...body } = request;
  const response = await fetch(
    `${API_BASE_URL}/milestone/milestones/${milestoneId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default updateMilestone;
