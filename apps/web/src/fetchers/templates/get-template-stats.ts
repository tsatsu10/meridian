import { API_BASE_URL } from "../../constants/urls";
import type { TemplateStats } from "../../types/templates";

export async function getTemplateStats(): Promise<TemplateStats> {
  const response = await fetch(`${API_BASE_URL}/templates/stats`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch template stats: ${response.statusText}`);
  }

  return response.json();
}

