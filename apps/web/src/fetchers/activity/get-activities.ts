/**
 * 🎯 Activity Fetcher
 * Fetches recent workspace activities from team-awareness API
 */

import { API_BASE_URL } from "@/constants/urls";

export interface Activity {
  id: string;
  userId: string;
  workspaceId: string;
  projectId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityTitle?: string;
  description?: string;
  metadata?: any;
  isPublic: boolean;
  createdAt: string;
  user?: {
    id: string;
    username: string;
    email: string;
    avatarUrl?: string;
  };
}

export interface GetActivitiesParams {
  workspaceId: string;
  userId?: string;
  projectId?: string;
  entityType?: string;
  limit?: number;
  offset?: number;
}

export interface GetActivitiesResponse {
  activities: Activity[];
}

/**
 * Fetch recent activities for a workspace
 */
export async function getActivities(
  params: GetActivitiesParams
): Promise<GetActivitiesResponse> {
  try {
    const queryParams = new URLSearchParams();
    queryParams.set("workspaceId", params.workspaceId);

    if (params.userId) queryParams.set("userId", params.userId);
    if (params.projectId) queryParams.set("projectId", params.projectId);
    if (params.entityType) queryParams.set("entityType", params.entityType);
    if (params.limit != null) queryParams.set("limit", String(params.limit));
    if (params.offset != null) queryParams.set("offset", String(params.offset));

    const sessionToken =
      typeof localStorage !== "undefined"
        ? localStorage.getItem("sessionToken")
        : null;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (sessionToken) {
      headers.Authorization = `Bearer ${sessionToken}`;
    }

    const response = await fetch(
      `${API_BASE_URL}/team-awareness/activity?${queryParams.toString()}`,
      {
        credentials: "include",
        headers,
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch activities: ${response.statusText}`);
    }

    const data = await response.json();
    return data as GetActivitiesResponse;
  } catch (error) {
    console.error("Error fetching activities:", error);
    throw error;
  }
}

