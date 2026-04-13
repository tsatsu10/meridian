import { client } from "@meridian/libs";
import { API_BASE_URL, API_URL } from '@/constants/urls';

export interface DeleteStatusColumnRequest {
  projectId: string;
  columnId: string;
}

async function deleteStatusColumn({ projectId, columnId }: DeleteStatusColumnRequest) {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/status-columns/${columnId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default deleteStatusColumn; 