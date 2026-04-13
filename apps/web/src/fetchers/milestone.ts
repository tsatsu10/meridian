// Milestone API fetchers

import { fetchApi } from '@/lib/fetch';

export async function fetchMilestones(projectId: string, limit = 20, offset = 0) {
  return fetchApi(`/milestone/projects/${projectId}/milestones`, {
    params: { limit: limit.toString(), offset: offset.toString() }
  });
}

export async function createMilestone(projectId: string, data: any) {
  return fetchApi(`/milestone/projects/${projectId}/milestones`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateMilestone(milestoneId: string, data: any) {
  return fetchApi(`/milestone/milestones/${milestoneId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function deleteMilestone(milestoneId: string) {
  return fetchApi(`/milestone/milestones/${milestoneId}`, {
    method: 'DELETE'
  });
} 