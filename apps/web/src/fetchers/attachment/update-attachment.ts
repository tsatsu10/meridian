// @epic-2.1-files: Update attachment API client
import { API_BASE_URL, API_URL } from '@/constants/urls';

export interface UpdateAttachmentRequest {
  id: string;
  name?: string;
  description?: string;
  userEmail: string;
}

export async function updateAttachment({ id, name, description, userEmail }: UpdateAttachmentRequest) {
  const response = await fetch(`${API_BASE_URL}/attachment/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, description, userEmail }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default updateAttachment; 