// @epic-2.1-files: Delete attachment API client
import { API_BASE_URL, API_URL } from '@/constants/urls';

export interface DeleteAttachmentRequest {
  id: string;
  userEmail: string;
}

export async function deleteAttachment({ id, userEmail }: DeleteAttachmentRequest) {
  const response = await fetch(`${API_BASE_URL}/attachment/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userEmail }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default deleteAttachment; 