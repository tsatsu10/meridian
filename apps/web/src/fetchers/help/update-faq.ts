import { API_BASE_URL, API_URL } from '@/constants/urls';

export interface UpdateFAQInput {
  question?: string;
  answer?: string;
  category?: 'getting-started' | 'features' | 'integrations' | 'troubleshooting' | 'best-practices';
  order?: number;
}

export async function updateFAQ(id: string, data: UpdateFAQInput) {
  const response = await fetch(`${API_BASE_URL}/help/admin/faqs/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update FAQ");
  }

  return response.json();
}
