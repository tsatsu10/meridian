import { API_BASE_URL, API_URL } from '@/constants/urls';

export async function deleteArticle(id: string) {
  const response = await fetch(`${API_BASE_URL}/help/admin/articles/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete article");
  }

  return response.json();
}
