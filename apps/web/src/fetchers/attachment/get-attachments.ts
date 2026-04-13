// @epic-2.1-files: Get attachments API client
import { API_BASE_URL, API_URL } from '@/constants/urls';

export async function getTaskAttachments(taskId: string) {
  const response = await fetch(`${API_BASE_URL}/attachment/task/${taskId}`);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export async function getCommentAttachments(commentId: string) {
  const response = await fetch(`${API_BASE_URL}/attachment/comment/${commentId}`);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export async function getAttachmentById(id: string) {
  const response = await fetch(`${API_BASE_URL}/attachment/${id}`);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
} 