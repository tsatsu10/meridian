import { API_BASE_URL, API_URL } from '@/constants/urls';

export interface CreateStatusColumnRequest {
  projectId: string;
  name: string;
  color?: string;
  position?: number;
}

export interface StatusColumn {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  color: string;
  position: number;
  isDefault: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

async function createStatusColumn({ projectId, name, color, position }: CreateStatusColumnRequest): Promise<StatusColumn> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/status-columns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      color,
      position,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default createStatusColumn;