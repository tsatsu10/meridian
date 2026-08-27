import { API_BASE_URL } from "@/constants/urls";

async function deleteMilestone(milestoneId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/milestone/milestones/${milestoneId}`,
    {
      credentials: "include",
      method: "DELETE",
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }
}

export default deleteMilestone;
