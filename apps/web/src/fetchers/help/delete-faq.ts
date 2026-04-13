import { API_BASE_URL, API_URL } from '@/constants/urls';

export async function deleteFAQ(id: string) {
  const response = await fetch(`${API_BASE_URL}/help/admin/faqs/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete FAQ");
  }

  return response.json();
}
