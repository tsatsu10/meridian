import { API_BASE_URL } from "../../constants/urls";

export async function rateTemplate(
  templateId: string,
  rating: number
): Promise<{ success: boolean; averageRating: number }> {
  const response = await fetch(`${API_BASE_URL}/templates/${templateId}/rate`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rating }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || 'Failed to rate template');
  }

  return response.json();
}

