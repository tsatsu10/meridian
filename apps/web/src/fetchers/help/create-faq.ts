import { API_BASE_URL, API_URL } from '@/constants/urls';

export interface CreateFAQInput {
  question: string;
  answer: string;
  category: 'getting-started' | 'features' | 'integrations' | 'troubleshooting' | 'best-practices';
  order?: number;
}

export async function createFAQ(data: CreateFAQInput) {
  const response = await fetch(`${API_BASE_URL}/help/admin/faqs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create FAQ");
  }

  return response.json();
}
