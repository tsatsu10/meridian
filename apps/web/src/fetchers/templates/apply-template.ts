import { API_BASE_URL } from "../../constants/urls";
import type { TemplateApplicationInput, TemplateApplicationResult } from "../../types/templates";

export async function applyTemplate(
  templateId: string,
  input: TemplateApplicationInput
): Promise<TemplateApplicationResult> {
  const response = await fetch(`${API_BASE_URL}/templates/${templateId}/apply`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || 'Failed to apply template');
  }

  return response.json();
}

