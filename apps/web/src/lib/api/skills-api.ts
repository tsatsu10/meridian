import { API_URL } from '@/constants/urls'

export interface SkillsResponse {
  success: boolean
  data: {
    skills: string[]
  }
  message?: string
}

export interface SkillUpdateResponse {
  success: boolean
  data: {
    skills: string[]
    message: string
  }
}

class SkillsAPI {
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

  // Get user skills
  static async getSkills(userId: string): Promise<string[]> {
    try {
      const response = await this.makeRequest<SkillsResponse>(
        `/settings/${userId}/skills`
      )
      return response.data.skills
    } catch (error) {
      console.error('Failed to get skills:', error)
      // Return empty array as fallback
      return []
    }
  }

  // Update all skills at once
  static async updateSkills(userId: string, skills: string[]): Promise<string[]> {
    try {
      const response = await this.makeRequest<SkillUpdateResponse>(
        `/settings/${userId}/skills`,
        {
          method: 'PATCH',
          body: JSON.stringify({ skills }),
        }
      )
      return response.data.skills
    } catch (error) {
      console.error('Failed to update skills:', error)
      throw error
    }
  }

  // Add a single skill
  static async addSkill(userId: string, skill: string): Promise<string[]> {
    try {
      const response = await this.makeRequest<SkillUpdateResponse>(
        `/settings/${userId}/skills`,
        {
          method: 'POST',
          body: JSON.stringify({ skill }),
        }
      )
      return response.data.skills
    } catch (error) {
      console.error('Failed to add skill:', error)
      throw error
    }
  }

  // Remove a single skill
  static async removeSkill(userId: string, skill: string): Promise<string[]> {
    try {
      const response = await this.makeRequest<SkillUpdateResponse>(
        `/settings/${userId}/skills/${encodeURIComponent(skill)}`,
        {
          method: 'DELETE',
        }
      )
      return response.data.skills
    } catch (error) {
      console.error('Failed to remove skill:', error)
      throw error
    }
  }
}

export default SkillsAPI