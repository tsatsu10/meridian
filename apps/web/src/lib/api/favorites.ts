/**
 * Favorites API
 * Manage user favorites/bookmarks
 */

import { logger } from "@/lib/logger";
import { API_BASE_URL } from "@/constants/urls";

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  const token = localStorage.getItem('auth-token') || localStorage.getItem('token');
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const userEmail = localStorage.getItem('user-email') || localStorage.getItem('userEmail');
  if (userEmail) {
    headers["X-User-Email"] = userEmail;
  }

  return headers;
}

export interface Favorite {
  id: string;
  userId: string;
  favoriteUserId?: string;
  favoriteChannelId?: string;
  type: 'user' | 'channel' | 'project' | 'task';
  createdAt: string;
  updatedAt: string;
}

/**
 * Get all favorites for the current user
 */
export async function getFavorites(): Promise<Favorite[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/favorites`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch favorites: ${response.statusText}`);
    }

    const data = await response.json();
    return data.favorites || data || [];
  } catch (error) {
    logger.error('Error fetching favorites:', error);
    throw error;
  }
}

/**
 * Add a user to favorites
 */
export async function addUserToFavorites(userId: string): Promise<Favorite> {
  try {
    const response = await fetch(`${API_BASE_URL}/favorites`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        favoriteUserId: userId,
        type: 'user',
      }),
    });

    if (!response.ok) {
      if (response.status === 409) {
        throw new Error('User is already in favorites');
      }
      throw new Error(`Failed to add favorite: ${response.statusText}`);
    }

    const data = await response.json();
    return data.favorite || data;
  } catch (error) {
    logger.error('Error adding user to favorites:', error);
    throw error;
  }
}

/**
 * Add a channel to favorites
 */
export async function addChannelToFavorites(channelId: string): Promise<Favorite> {
  try {
    const response = await fetch(`${API_BASE_URL}/favorites`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        favoriteChannelId: channelId,
        type: 'channel',
      }),
    });

    if (!response.ok) {
      if (response.status === 409) {
        throw new Error('Channel is already in favorites');
      }
      throw new Error(`Failed to add favorite: ${response.statusText}`);
    }

    const data = await response.json();
    return data.favorite || data;
  } catch (error) {
    logger.error('Error adding channel to favorites:', error);
    throw error;
  }
}

/**
 * Remove a favorite by ID
 */
export async function removeFavorite(favoriteId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/favorites/${favoriteId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to remove favorite: ${response.statusText}`);
    }
  } catch (error) {
    logger.error('Error removing favorite:', error);
    throw error;
  }
}

/**
 * Remove a user from favorites (by user ID)
 */
export async function removeUserFromFavorites(userId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/favorites/user/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('User not found in favorites');
      }
      throw new Error(`Failed to remove favorite: ${response.statusText}`);
    }
  } catch (error) {
    logger.error('Error removing user from favorites:', error);
    throw error;
  }
}

/**
 * Check if a user is in favorites
 */
export async function isUserInFavorites(userId: string): Promise<boolean> {
  try {
    const favorites = await getFavorites();
    return favorites.some(
      (fav) => fav.type === 'user' && fav.favoriteUserId === userId
    );
  } catch (error) {
    logger.error('Error checking if user is in favorites:', error);
    return false;
  }
}

/**
 * Check if a channel is in favorites
 */
export async function isChannelInFavorites(channelId: string): Promise<boolean> {
  try {
    const favorites = await getFavorites();
    return favorites.some(
      (fav) => fav.type === 'channel' && fav.favoriteChannelId === channelId
    );
  } catch (error) {
    logger.error('Error checking if channel is in favorites:', error);
    return false;
  }
}

