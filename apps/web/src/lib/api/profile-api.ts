import { API_URL } from '@/constants/urls'

export interface ProfileImageResponse {
  success: boolean
  data: {
    imageUrl: string
    message: string
  }
}

export interface ProfileImportResponse {
  success: boolean
  data: {
    message: string
    warnings: string[]
    errors: string[]
    imported: {
      personalInfo: number
      socialLinks: number
      skills: number
    }
  }
}

class ProfileAPI {
  private static getBaseUrl(): string {
    return API_URL || 'http://localhost:3007'
  }

  private static async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.getBaseUrl()}${endpoint}`
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token') || 'demo-token'}`,
      'X-User-Email': localStorage.getItem('userEmail') || 'admin@meridian.app',
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  // Upload profile image
  static async uploadProfileImage(
    userId: string, 
    imageData: string, 
    fileName: string, 
    fileSize: number
  ): Promise<string> {
    try {
      const response = await this.makeRequest<ProfileImageResponse>(
        `/settings/${userId}/profile-image`,
        {
          method: 'POST',
          body: JSON.stringify({ imageData, fileName, fileSize }),
        }
      )
      return response.data.imageUrl
    } catch (error) {
      console.error('Failed to upload profile image:', error)
      throw error
    }
  }

  // Remove profile image
  static async removeProfileImage(userId: string): Promise<void> {
    try {
      await this.makeRequest<{ success: boolean; data: { message: string } }>(
        `/settings/${userId}/profile-image`,
        {
          method: 'DELETE',
        }
      )
    } catch (error) {
      console.error('Failed to remove profile image:', error)
      throw error
    }
  }

  // Import profile data
  static async importProfile(userId: string, profileData: any): Promise<{
    warnings: string[]
    errors: string[]
    imported: {
      personalInfo: number
      socialLinks: number
      skills: number
    }
  }> {
    try {
      const response = await this.makeRequest<ProfileImportResponse>(
        `/settings/${userId}/import-profile`,
        {
          method: 'POST',
          body: JSON.stringify({ profileData }),
        }
      )
      return response.data
    } catch (error) {
      console.error('Failed to import profile:', error)
      throw error
    }
  }

  // Update avatar selection
  static async updateAvatarSelection(userId: string, avatarId: string | null): Promise<void> {
    try {
      await this.makeRequest<{ success: boolean; data: { message: string } }>(
        `/settings/${userId}/profile`,
        {
          method: 'PATCH',
          body: JSON.stringify({ 
            updates: { selectedAvatarId: avatarId },
            version: Date.now()
          }),
        }
      )
    } catch (error) {
      console.error('Failed to update avatar selection:', error)
      throw error
    }
  }
}

export default ProfileAPI