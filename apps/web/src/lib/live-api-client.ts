/**
 * Live API Client - Direct connection to backend server
 * This bypasses all mocks and connects directly to the real backend
 */

import { getAppConfig } from '@/config/app-mode'
import { logger } from "@/lib/logger";

class LiveApiClient {
  private baseUrl: string
  private wsUrl: string

  constructor() {
    const config = getAppConfig()
    this.baseUrl = config.apiUrl
    this.wsUrl = config.wsUrl
    
    logger.debug('🚀 Live API Client initialized:', {
      baseUrl: this.baseUrl,
      wsUrl: this.wsUrl,
      mode: config.mode
    })
  }

  /**
   * Make a live API request
   */
  async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies for auth
      ...options,
    }

    try {
      logger.debug(`📡 Live API Request: ${options.method || 'GET'} ${url}`)
      
      const response = await fetch(url, defaultOptions)
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API Error ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      logger.debug(`✅ Live API Response: ${url}`, data)
      
      return data
    } catch (error) {
      console.error(`❌ Live API Error: ${url}`, error)
      throw error
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  /**
   * Get WebSocket URL
   */
  getWebSocketUrl(): string {
    return this.wsUrl
  }

  /**
   * Health check - test connection to backend
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.get('/health')
      logger.debug('✅ Backend health check passed')
      return true
    } catch (error) {
      console.error('❌ Backend health check failed:', error)
      return false
    }
  }
}

// Export singleton instance
export const liveApiClient = new LiveApiClient()

// Helper functions for common operations
export const liveApi = {
  // Authentication
  auth: {
    me: () => liveApiClient.get('/api/users/me'),
    signIn: (credentials: { email: string; password: string }) =>
      liveApiClient.post('/api/users/sign-in', credentials),
    signUp: (userData: { email: string; password: string; name: string }) =>
      liveApiClient.post('/api/users/sign-up', userData),
    signOut: () => liveApiClient.post('/api/users/sign-out'),
  },

  // Workspaces
  workspaces: {
    list: () => liveApiClient.get('/api/workspaces'),
    get: (id: string) => liveApiClient.get(`/api/workspaces/${id}`),
    create: (data: any) => liveApiClient.post('/api/workspaces', data),
    users: {
      list: (workspaceId: string) => liveApiClient.get(`/api/workspaces/${workspaceId}/users`),
      invite: (workspaceId: string, data: any) => 
        liveApiClient.post(`/api/workspaces/${workspaceId}/users/invite`, data),
      remove: (workspaceId: string, userId: string) => 
        liveApiClient.delete(`/api/workspaces/${workspaceId}/users/${userId}`),
      updateRole: (workspaceId: string, userId: string, role: string) => 
        liveApiClient.put(`/api/workspaces/${workspaceId}/users/${userId}/role`, { role }),
    },
  },

  // Projects
  projects: {
    list: (workspaceId: string) => liveApiClient.get(`/api/workspaces/${workspaceId}/projects`),
    get: (id: string) => liveApiClient.get(`/api/projects/${id}`),
    create: (workspaceId: string, data: any) => 
      liveApiClient.post(`/api/workspaces/${workspaceId}/projects`, data),
    update: (id: string, data: any) => liveApiClient.put(`/api/projects/${id}`, data),
    delete: (id: string) => liveApiClient.delete(`/api/projects/${id}`),
    teams: {
      list: (projectId: string) => liveApiClient.get(`/api/projects/${projectId}/teams`),
      create: (projectId: string, data: any) => 
        liveApiClient.post(`/api/projects/${projectId}/teams`, data),
      update: (projectId: string, teamId: string, data: any) => 
        liveApiClient.put(`/api/projects/${projectId}/teams/${teamId}`, data),
      delete: (projectId: string, teamId: string) => 
        liveApiClient.delete(`/api/projects/${projectId}/teams/${teamId}`),
      addMember: (projectId: string, teamId: string, data: any) => 
        liveApiClient.post(`/api/projects/${projectId}/teams/${teamId}/members`, data),
      removeMember: (projectId: string, teamId: string, memberId: string) => 
        liveApiClient.delete(`/api/projects/${projectId}/teams/${teamId}/members/${memberId}`),
    },
  },

  // Tasks
  tasks: {
    list: (projectId: string) => liveApiClient.get(`/api/projects/${projectId}/tasks`),
    get: (id: string) => liveApiClient.get(`/api/tasks/${id}`),
    create: (projectId: string, data: any) => 
      liveApiClient.post(`/api/projects/${projectId}/tasks`, data),
    update: (id: string, data: any) => liveApiClient.put(`/api/tasks/${id}`, data),
  },

  // Analytics
  analytics: {
    dashboard: () => liveApiClient.get('/api/analytics/dashboard'),
    project: (projectId: string) => liveApiClient.get(`/api/analytics/project/${projectId}`),
    notifications: (params: { timeRange?: string; workspaceId?: string } = {}) => {
      const query = new URLSearchParams()
      if (params.timeRange) query.append('timeRange', params.timeRange)
      if (params.workspaceId) query.append('workspaceId', params.workspaceId)
      return liveApiClient.get(`/api/analytics/notifications?${query.toString()}`)
    },
  },

  // Messages
  messages: {
    list: (channelId: string) => liveApiClient.get(`/api/channel/${channelId}/messages`),
    send: (channelId: string, data: any) => 
      liveApiClient.post(`/api/channel/${channelId}/messages`, data),
  },

  // Notifications
  notifications: {
    list: () => liveApiClient.get('/api/notifications'),
    markRead: (id: string) => liveApiClient.put(`/api/notifications/${id}/read`),
    getSettings: () => liveApiClient.get('/api/notifications/settings'),
    updateSettings: (settings: any) => liveApiClient.put('/api/notifications/settings', settings),
    preview: (type: string) => liveApiClient.get(`/api/notifications/preview/${type}`),
  },

  // Integrations
  integrations: {
    list: () => liveApiClient.get('/api/integrations'),
    connect: (integrationId: string, config: any) => 
      liveApiClient.post(`/api/integrations/${integrationId}/connect`, config),
    disconnect: (integrationId: string) => 
      liveApiClient.post(`/api/integrations/${integrationId}/disconnect`),
    getConfig: (integrationId: string) => 
      liveApiClient.get(`/api/integrations/${integrationId}/config`),
    updateConfig: (integrationId: string, config: any) => 
      liveApiClient.put(`/api/integrations/${integrationId}/config`, config),
  },

  // Calendar
  calendar: {
    events: {
      list: (params: { workspaceId?: string; startDate?: string; endDate?: string } = {}) => {
        const query = new URLSearchParams()
        if (params.workspaceId) query.append('workspaceId', params.workspaceId)
        if (params.startDate) query.append('startDate', params.startDate)
        if (params.endDate) query.append('endDate', params.endDate)
        return liveApiClient.get(`/api/calendar/events?${query.toString()}`)
      },
      create: (data: any) => liveApiClient.post('/api/calendar/events', data),
      update: (id: string, data: any) => liveApiClient.put(`/api/calendar/events/${id}`, data),
      delete: (id: string) => liveApiClient.delete(`/api/calendar/events/${id}`),
    },
    availability: {
      list: (params: { workspaceId?: string; date?: string } = {}) => {
        const query = new URLSearchParams()
        if (params.workspaceId) query.append('workspaceId', params.workspaceId)
        if (params.date) query.append('date', params.date)
        return liveApiClient.get(`/api/calendar/availability?${query.toString()}`)
      },
    },
  },

  // API Keys
  apiKeys: {
    list: () => liveApiClient.get('/api/api-keys'),
    create: (data: { name: string; permissions: string[] }) => 
      liveApiClient.post('/api/api-keys', data),
    delete: (id: string) => liveApiClient.delete(`/api/api-keys/${id}`),
    regenerate: (id: string) => liveApiClient.post(`/api/api-keys/${id}/regenerate`),
    updatePermissions: (id: string, permissions: string[]) => 
      liveApiClient.put(`/api/api-keys/${id}`, { permissions }),
  },

  // Webhooks
  webhooks: {
    list: () => liveApiClient.get('/api/webhooks'),
    create: (data: { url: string; events: string[] }) => 
      liveApiClient.post('/api/webhooks', data),
    update: (id: string, data: any) => liveApiClient.put(`/api/webhooks/${id}`, data),
    delete: (id: string) => liveApiClient.delete(`/api/webhooks/${id}`),
    test: (id: string) => liveApiClient.post(`/api/webhooks/${id}/test`),
  },

  // Health check
  health: () => liveApiClient.healthCheck(),
}