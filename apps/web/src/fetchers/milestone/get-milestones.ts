import { API_BASE_URL } from "@/constants/urls";

export interface MilestoneRow {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  dueDate: string;
  completedAt: string | null;
  projectId: string;
  riskLevel: string | null;
  riskDescription: string | null;
  successCriteria: string | null;
  dependencyTaskIds: string[];
  stakeholderIds: string[];
  createdBy: string | null;
  createdAt: string;
  updatedAt: string | null;
}

interface GetMilestonesResponse {
  milestones: MilestoneRow[];
  stats: {
    total: number;
    achieved: number;
    upcoming: number;
    missed: number;
  };
}

async function getMilestones(
  projectId: string,
): Promise<GetMilestonesResponse> {
  const response = await fetch(
    `${API_BASE_URL}/milestone/projects/${projectId}/milestones`,
    { credentials: "include" },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default getMilestones;
