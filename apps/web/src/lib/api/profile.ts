import { API_BASE_URL } from "@/constants/urls";
import type { ProfileUpdateData, UserProfile, ProfileApiResponse } from "@/types/profile";

/**
 * Get authentication headers for API requests
 * Supports both localStorage tokens and httpOnly cookies
 */
function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  
  // Try to get token from localStorage (for API clients)
  const token = localStorage.getItem('auth-token') || localStorage.getItem('token');
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  // Add user email if available (for additional validation)
  const userEmail = localStorage.getItem('user-email') || localStorage.getItem('userEmail');
  if (userEmail) {
    headers["X-User-Email"] = userEmail;
  }
  
  return headers;
}

export async function updateProfile(data: ProfileUpdateData) {
  const response = await fetch(`${API_BASE_URL}/profile/settings`, {
    method: "PUT",
    headers: getAuthHeaders(),
    credentials: "include", // Send httpOnly cookies
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update profile' }));
    throw new Error(error.message || "Failed to update profile");
  }

  return response.json();
}

export async function getProfileSettings() {
  const response = await fetch(`${API_BASE_URL}/profile/settings`, {
    method: "GET",
    headers: getAuthHeaders(),
    credentials: "include", // Send httpOnly cookies
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch profile settings' }));
    throw new Error(error.message || "Failed to fetch profile settings");
  }

  return response.json();
}

/**
 * Upload avatar image with retry logic
 * @param file - Image file to upload
 * @param retries - Number of retry attempts (default: 2)
 * @returns URL of uploaded avatar
 */
export async function uploadAvatar(file: File, retries = 2): Promise<string> {
  const formData = new FormData();
  formData.append('avatar', file);
  
  // Get auth headers but exclude Content-Type (browser will set it with boundary for multipart)
  const authHeaders = getAuthHeaders();
  delete (authHeaders as Record<string, string>)['Content-Type'];
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${API_BASE_URL}/profile/avatar`, {
        method: "POST",
        headers: authHeaders,
        credentials: "include",
        body: formData
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to upload avatar' }));
        
        // Provide specific error messages based on status code
        if (response.status === 401) {
          throw new Error('Please sign in again to upload your avatar');
        } else if (response.status === 403) {
          throw new Error('You don\'t have permission to upload avatars');
        } else if (response.status === 413) {
          throw new Error('Image file is too large. Maximum size is 5MB');
        } else if (response.status === 415) {
          throw new Error('Invalid file type. Please upload a valid image (JPG, PNG, GIF)');
        } else if (response.status >= 500) {
          throw new Error('Server error. Please try again in a moment');
        }
        
        throw new Error(error.message || "Failed to upload avatar");
      }

      const result = await response.json();
      return result.avatarUrl || result.url;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Upload failed');
      
      // Don't retry on client errors (4xx)
      if (lastError.message.includes('sign in') || 
          lastError.message.includes('permission') ||
          lastError.message.includes('too large') ||
          lastError.message.includes('Invalid file')) {
        throw lastError;
      }
      
      // Wait before retrying (exponential backoff)
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }
  
  throw lastError || new Error('Failed to upload avatar after multiple attempts');
}

/**
 * Get user profile by ID with retry logic
 * @param userId - User ID to fetch profile for
 * @param retries - Number of retry attempts (default: 2)
 */
export async function getUserProfile(userId: string, retries = 2) {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${API_BASE_URL}/profile/${userId}`, {
        method: "GET",
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to fetch user profile' }));
        
        // Provide specific error messages
        if (response.status === 401) {
          throw new Error('Please sign in to view profiles');
        } else if (response.status === 403) {
          throw new Error('You don\'t have permission to view this profile');
        } else if (response.status === 404) {
          throw new Error('User profile not found');
        } else if (response.status >= 500) {
          throw new Error('Server error loading profile. Retrying...');
        }
        
        throw new Error(error.message || "Failed to fetch user profile");
      }

      return response.json();
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Failed to fetch profile');
      
      // Don't retry on client errors (4xx)
      if (lastError.message.includes('sign in') || 
          lastError.message.includes('permission') ||
          lastError.message.includes('not found')) {
        throw lastError;
      }
      
      // Wait before retrying
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }
  
  throw lastError || new Error('Failed to fetch profile after multiple attempts');
}
