import { API_BASE_URL } from "../../constants/urls";
import type { TemplateWithTasks } from "../../types/templates";

export async function getTemplate(templateId: string): Promise<TemplateWithTasks> {
  const response = await fetch(`${API_BASE_URL}/templates/${templateId}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch template: ${response.statusText}`);
  }

  return response.json();
}

