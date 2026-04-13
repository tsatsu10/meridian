/**
 * Smart API Client - Automatically switches between mock and live backend
 * Uses environment variables to determine which client to use
 */

import { client } from "@meridian/libs"
import { liveApi, liveApiClient } from './live-api-client'
import { shouldUseMocks, getAppConfig } from '@/config/app-mode'
import { API_URL } from '@/constants/urls'

/**
 * Determines if we're in a test environment
 */
function isTestEnvironment(): boolean {
  return typeof window !== 'undefined' && 
         (window as any).__vitest__ || 
         process.env.NODE_ENV === 'test' ||
         typeof global !== 'undefined' && 
         (global as any).__vitest__
}

/**
 * Smart API client that switches between mock and live
 */
class SmartApiClient {
  private useLive: boolean

  constructor() {
    // Use live API unless explicitly in test mode or mocks are enabled
    this.useLive = !isTestEnvironment() && !shouldUseMocks()
    
    const config = getAppConfig()
    console.log('🤖 Smart API Client initialized:', {
      useLive: this.useLive,
      isTest: isTestEnvironment(),
      useMocks: shouldUseMocks(),
      mode: config.mode
    })
  }

  /**
   * Authentication methods
   */
  auth = {
    me: async () => {
      if (this.useLive) {
        return liveApi.auth.me()
      }
      // Use the existing Hono client for mocks in tests
      const response = await client.auth.me.$get()
      if (!response.ok) throw new Error('Auth failed')
      return response.json()
    },

    signIn: async (credentials: { email: string; password: string }) => {
      if (this.useLive) {
        return liveApi.auth.signIn(credentials)
      }
      // Mock implementation for tests
      const response = await client.auth.signin.$post({ json: credentials })
      if (!response.ok) throw new Error('Sign in failed')
      return response.json()
    },

    signUp: async (userData: { email: string; password: string; name: string }) => {
      if (this.useLive) {
        return liveApi.auth.signUp(userData)
      }
      // Mock implementation for tests
      const response = await client.auth.signup.$post({ json: userData })
      if (!response.ok) throw new Error('Sign up failed')
      return response.json()
    },

    signOut: async () => {
      if (this.useLive) {
        return liveApi.auth.signOut()
      }
      // Mock implementation for tests
      const response = await client.auth.signout.$post()
      if (!response.ok) throw new Error('Sign out failed')
      return response.json()
    },

    twoFactor: {
      generate: async () => {
        const response = await fetch(`${API_URL}/auth/two-factor/generate`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error('Failed to generate 2FA secret');
        return response.json();
      },

      verify: async (data: { secret: string; token: string }) => {
        const response = await fetch(`${API_URL}/auth/two-factor/verify`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to verify 2FA');
        return response.json();
      },

      disable: async (data: { password: string }) => {
        const response = await fetch(`${API_URL}/auth/two-factor/disable`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to disable 2FA');
        return response.json();
      },

      verifyLogin: async (data: { userId: string; token?: string; backupCode?: string }) => {
        const response = await fetch(`${API_URL}/auth/two-factor/verify-login`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to verify 2FA login');
        return response.json();
      },

      regenerateBackupCodes: async () => {
        const response = await fetch(`${API_URL}/auth/two-factor/backup-codes/regenerate`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error('Failed to regenerate backup codes');
        return response.json();
      },

      getStatus: async () => {
        const response = await fetch(`${API_URL}/auth/two-factor/status`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error('Failed to get 2FA status');
        return response.json();
      }
    }
  }

  /**
   * Workspace methods
   */
  workspaces = {
    list: async () => {
      if (this.useLive) {
        return liveApi.workspaces.list()
      }
      const response = await client.workspace.$get()
      if (!response.ok) throw new Error('Failed to fetch workspaces')
      return response.json()
    },

    get: async (id: string) => {
      if (this.useLive) {
        return liveApi.workspaces.get(id)
      }
      const response = await client.workspace[':workspaceId'].$get({ param: { workspaceId: id } })
      if (!response.ok) throw new Error('Failed to fetch workspace')
      return response.json()
    },

    create: async (data: any) => {
      if (this.useLive) {
        return liveApi.workspaces.create(data)
      }
      const response = await client.workspace.$post({ json: data })
      if (!response.ok) throw new Error('Failed to create workspace')
      return response.json()
    },

    users: {
      list: async (workspaceId: string) => {
        if (this.useLive) {
          return liveApi.workspaces.users.list(workspaceId)
        }
        // Mock users for tests
        return [
          {
            id: '1',
            name: 'Test User',
            email: 'test@example.com',
            status: 'online',
            role: 'member',
            avatar: '',
            lastSeen: new Date().toISOString(),
          }
        ]
      },

      invite: async (workspaceId: string, data: any) => {
        if (this.useLive) {
          return liveApi.workspaces.users.invite(workspaceId, data)
        }
        // Mock implementation for tests
        return { success: true, user: { id: `user-${Date.now()}`, ...data } }
      },

      remove: async (workspaceId: string, userId: string) => {
        if (this.useLive) {
          return liveApi.workspaces.users.remove(workspaceId, userId)
        }
        // Mock implementation for tests
        return { success: true }
      },

      updateRole: async (workspaceId: string, userId: string, role: string) => {
        if (this.useLive) {
          return liveApi.workspaces.users.updateRole(workspaceId, userId, role)
        }
        // Mock implementation for tests
        return { success: true, user: { id: userId, role } }
      },
    },
  }

  /**
   * Project methods
   */
  projects = {
    list: async (workspaceId: string) => {
      if (this.useLive) {
        return liveApi.projects.list(workspaceId)
      }
      const response = await client.project.$get({ query: { workspaceId } })
      if (!response.ok) throw new Error('Failed to fetch projects')
      return response.json()
    },

    get: async (id: string) => {
      if (this.useLive) {
        return liveApi.projects.get(id)
      }
      const response = await client.project[':projectId'].$get({ param: { projectId: id } })
      if (!response.ok) throw new Error('Failed to fetch project')
      return response.json()
    },

    create: async (workspaceId: string, data: any) => {
      if (this.useLive) {
        return liveApi.projects.create(workspaceId, data)
      }
      const response = await client.project.$post({ json: { ...data, workspaceId } })
      if (!response.ok) throw new Error('Failed to create project')
      return response.json()
    },

    update: async (id: string, data: any) => {
      if (this.useLive) {
        return liveApi.projects.update(id, data)
      }
      // Mock implementation for tests
      return { success: true, project: { id, ...data } }
    },

    delete: async (id: string) => {
      if (this.useLive) {
        return liveApi.projects.delete(id)
      }
      // Mock implementation for tests
      return { success: true }
    },

    teams: {
      list: async (projectId: string) => {
        if (this.useLive) {
          return liveApi.projects.teams.list(projectId)
        }
        // Mock teams for tests
        return [
          {
            id: "team-1",
            name: "Development Team",
            description: "Main development team",
            color: "#3B82F6",
            leadId: "user-1",
            createdAt: new Date().toISOString(),
            members: [
              {
                id: "member-1",
                userEmail: "dev@example.com",
                userName: "Dev User",
                role: "team-lead",
                joinedAt: new Date().toISOString()
              }
            ]
          }
        ]
      },

      create: async (projectId: string, data: any) => {
        if (this.useLive) {
          return liveApi.projects.teams.create(projectId, data)
        }
        // Mock implementation for tests
        return { success: true, team: { id: `team-${Date.now()}`, ...data } }
      },

      update: async (projectId: string, teamId: string, data: any) => {
        if (this.useLive) {
          return liveApi.projects.teams.update(projectId, teamId, data)
        }
        // Mock implementation for tests
        return { success: true, team: { id: teamId, ...data } }
      },

      delete: async (projectId: string, teamId: string) => {
        if (this.useLive) {
          return liveApi.projects.teams.delete(projectId, teamId)
        }
        // Mock implementation for tests
        return { success: true }
      },

      addMember: async (projectId: string, teamId: string, data: any) => {
        if (this.useLive) {
          return liveApi.projects.teams.addMember(projectId, teamId, data)
        }
        // Mock implementation for tests
        return { success: true, member: { id: `member-${Date.now()}`, ...data } }
      },

      removeMember: async (projectId: string, teamId: string, memberId: string) => {
        if (this.useLive) {
          return liveApi.projects.teams.removeMember(projectId, teamId, memberId)
        }
        // Mock implementation for tests
        return { success: true }
      },
    },
  }

  /**
   * Task methods
   */
  tasks = {
    list: async (projectId: string) => {
      if (this.useLive) {
        return liveApi.tasks.list(projectId)
      }
      const response = await client.task.tasks[':projectId'].$get({ param: { projectId } })
      if (!response.ok) throw new Error('Failed to fetch tasks')
      return response.json()
    },

    get: async (id: string) => {
      if (this.useLive) {
        return liveApi.tasks.get(id)
      }
      const response = await client.task[':taskId'].$get({ param: { taskId: id } })
      if (!response.ok) throw new Error('Failed to fetch task')
      return response.json()
    },

    create: async (projectId: string, data: any) => {
      if (this.useLive) {
        return liveApi.tasks.create(projectId, data)
      }
      const response = await client.task[':projectId'].$post({ 
        param: { projectId }, 
        json: data 
      })
      if (!response.ok) throw new Error('Failed to create task')
      return response.json()
    },

    update: async (id: string, data: any) => {
      if (this.useLive) {
        return liveApi.tasks.update(id, data)
      }
      const response = await client.task[':taskId'].$put({ 
        param: { taskId: id }, 
        json: data 
      })
      if (!response.ok) throw new Error('Failed to update task')
      return response.json()
    }
  }

  /**
   * Analytics methods
   */
  analytics = {
    dashboard: async () => {
      if (this.useLive) {
        return liveApi.analytics.dashboard()
      }
      // Mock analytics data for tests
      return {
        totalTasks: 10,
        completedTasks: 4,
        inProgressTasks: 3,
        todoTasks: 3,
        totalProjects: 2,
        activeProjects: 2,
        totalUsers: 5,
        productivity: 85,
      }
    },

    project: async (projectId: string) => {
      if (this.useLive) {
        return liveApi.analytics.project(projectId)
      }
      // Mock project analytics for tests
      return {
        projectId,
        taskCompletion: 70,
        averageTaskTime: 2.5,
        teamProductivity: 88,
        burndownData: [
          { date: '2024-01-01', remaining: 10 },
          { date: '2024-01-02', remaining: 8 },
          { date: '2024-01-03', remaining: 6 },
        ],
      }
    },

    notifications: async (params: { timeRange?: string; workspaceId?: string } = {}) => {
      if (this.useLive) {
        return liveApi.analytics.notifications(params)
      }
      // Mock notification analytics for tests
      const last7Days = Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
        total: Math.floor(Math.random() * 50) + 10,
        opened: Math.floor(Math.random() * 30) + 5,
        clicked: Math.floor(Math.random() * 15) + 2,
        dismissed: Math.floor(Math.random() * 10) + 1,
      }));

      return {
        last7Days,
        channelData: [
          { name: 'In-App', value: 45, color: '#3b82f6' },
          { name: 'Email', value: 25, color: '#10b981' },
          { name: 'Push', value: 15, color: '#f59e0b' },
          { name: 'Slack', value: 8, color: '#8b5cf6' },
        ],
        categoryData: [
          { name: 'Tasks', count: 35, responseRate: 85, avgTime: '2.3 min' },
          { name: 'Messages', count: 20, responseRate: 92, avgTime: '45 sec' },
          { name: 'Projects', count: 15, responseRate: 78, avgTime: '5.1 min' },
          { name: 'Mentions', count: 12, responseRate: 95, avgTime: '1.2 min' },
          { name: 'Reminders', count: 8, responseRate: 72, avgTime: '8.3 min' },
        ],
        hourlyData: Array.from({ length: 24 }, (_, hour) => ({
          hour,
          notifications: Math.floor(Math.random() * 10) + (hour >= 9 && hour <= 17 ? 3 : 0),
          engagement: Math.floor(Math.random() * 60) + 20,
        })),
      }
    }
  }

  /**
   * Message methods
   */
  messages = {
    list: async (channelId: string) => {
      if (this.useLive) {
        return liveApi.messages.list(channelId)
      }
      // Mock messages for tests
      return {
        messages: [
          {
            id: 'msg-1',
            content: 'Hello from test',
            channelId,
            senderId: 'user-1',
            createdAt: new Date().toISOString(),
            type: 'text'
          }
        ]
      }
    },

    send: async (channelId: string, data: any) => {
      if (this.useLive) {
        return liveApi.messages.send(channelId, data)
      }
      // Mock message send for tests
      return {
        message: {
          id: `msg-${Date.now()}`,
          content: data.content,
          channelId,
          senderId: 'user-1',
          createdAt: new Date().toISOString(),
          type: 'text'
        }
      }
    }
  }

  /**
   * Notification methods
   */
  notifications = {
    list: async () => {
      if (this.useLive) {
        return liveApi.notifications.list()
      }
      // Mock notifications for tests
      return {
        notifications: [
          {
            id: 'notif-1',
            title: 'Task assigned',
            message: 'You have been assigned a new task',
            type: 'task',
            read: false,
            createdAt: new Date().toISOString(),
          }
        ]
      }
    },

    markRead: async (id: string) => {
      if (this.useLive) {
        return liveApi.notifications.markRead(id)
      }
      // Mock mark read for tests
      return { success: true }
    },

    getSettings: async () => {
      if (this.useLive) {
        return liveApi.notifications.getSettings()
      }
      // Mock notification settings for tests
      return {
        email: { taskAssigned: true, mentions: true, projectUpdates: false },
        push: { taskAssigned: true, mentions: false, projectUpdates: false },
        inApp: { taskAssigned: true, mentions: true, projectUpdates: true },
      }
    },

    updateSettings: async (settings: any) => {
      if (this.useLive) {
        return liveApi.notifications.updateSettings(settings)
      }
      // Mock implementation for tests
      return { success: true, settings }
    },

    preview: async (type: string) => {
      if (this.useLive) {
        return liveApi.notifications.preview(type)
      }
      // Mock notification preview for tests
      return {
        title: "Test Notification",
        body: "This is a test notification preview",
        avatar: null,
        time: "Just now"
      }
    },
  }

  /**
   * Calendar methods
   */
  calendar = {
    events: {
      list: async (params: { workspaceId?: string; startDate?: string; endDate?: string } = {}) => {
        if (this.useLive) {
          return liveApi.calendar.events.list(params)
        }
        // Mock calendar events for tests
        const today = new Date()
        return [
          {
            id: '1',
            title: 'Test Meeting',
            start: today.toISOString(),
            end: new Date(today.getTime() + 60 * 60 * 1000).toISOString(),
            type: 'meeting',
            status: 'todo',
            priority: 'medium',
          }
        ]
      },

      create: async (data: any) => {
        if (this.useLive) {
          return liveApi.calendar.events.create(data)
        }
        // Mock implementation for tests
        return { success: true, event: { id: `event-${Date.now()}`, ...data } }
      },

      update: async (id: string, data: any) => {
        if (this.useLive) {
          return liveApi.calendar.events.update(id, data)
        }
        // Mock implementation for tests
        return { success: true, event: { id, ...data } }
      },

      delete: async (id: string) => {
        if (this.useLive) {
          return liveApi.calendar.events.delete(id)
        }
        // Mock implementation for tests
        return { success: true }
      },
    },

    availability: {
      list: async (params: { workspaceId?: string; date?: string } = {}) => {
        if (this.useLive) {
          return liveApi.calendar.availability.list(params)
        }
        // Mock team availability for tests
        return [
          {
            id: '1',
            name: 'Test User',
            status: 'available',
            workload: 60,
            timezone: 'UTC',
            workingHours: { start: '09:00', end: '17:00' }
          }
        ]
      },
    },
  }

  /**
   * Integration methods
   */
  integrations = {
    list: async () => {
      if (this.useLive) {
        return liveApi.integrations.list()
      }
      // Mock integrations for tests
      return [
        {
          id: "slack",
          name: "Slack",
          description: "Get project notifications in your Slack channels",
          category: "Communication",
          status: "available",
          features: ["Notifications", "Task updates", "Project summaries"],
        },
        {
          id: "github",
          name: "GitHub", 
          description: "Connect repositories and sync commits with tasks",
          category: "Development",
          status: "available",
          features: ["Commit tracking", "PR linking", "Issue sync"],
        },
      ]
    },

    connect: async (integrationId: string, config: any) => {
      if (this.useLive) {
        return liveApi.integrations.connect(integrationId, config)
      }
      // Mock implementation for tests
      return { success: true, integration: { id: integrationId, status: 'connected', ...config } }
    },

    disconnect: async (integrationId: string) => {
      if (this.useLive) {
        return liveApi.integrations.disconnect(integrationId)
      }
      // Mock implementation for tests
      return { success: true }
    },

    getConfig: async (integrationId: string) => {
      if (this.useLive) {
        return liveApi.integrations.getConfig(integrationId)
      }
      // Mock implementation for tests
      return { config: {} }
    },

    updateConfig: async (integrationId: string, config: any) => {
      if (this.useLive) {
        return liveApi.integrations.updateConfig(integrationId, config)
      }
      // Mock implementation for tests
      return { success: true, config }
    },
  }

  /**
   * API Keys methods
   */
  apiKeys = {
    list: async () => {
      if (this.useLive) {
        return liveApi.apiKeys.list()
      }
      // Mock API keys for tests
      return [
        {
          id: "1",
          name: "Test API Key",
          key: "meridian_test_1234567890abcdef",
          created: new Date().toISOString(),
          lastUsed: "Never",
          permissions: ["read"],
          status: "active",
        }
      ]
    },

    create: async (data: { name: string; permissions: string[] }) => {
      if (this.useLive) {
        return liveApi.apiKeys.create(data)
      }
      // Mock implementation for tests
      return { 
        success: true, 
        apiKey: { 
          id: `key-${Date.now()}`, 
          key: `meridian_test_${Math.random().toString(36).substring(2)}`,
          ...data 
        } 
      }
    },

    delete: async (id: string) => {
      if (this.useLive) {
        return liveApi.apiKeys.delete(id)
      }
      // Mock implementation for tests
      return { success: true }
    },

    regenerate: async (id: string) => {
      if (this.useLive) {
        return liveApi.apiKeys.regenerate(id)
      }
      // Mock implementation for tests
      return { 
        success: true, 
        apiKey: { 
          id, 
          key: `meridian_test_${Math.random().toString(36).substring(2)}` 
        } 
      }
    },

    updatePermissions: async (id: string, permissions: string[]) => {
      if (this.useLive) {
        return liveApi.apiKeys.updatePermissions(id, permissions)
      }
      // Mock implementation for tests
      return { success: true, apiKey: { id, permissions } }
    },
  }

  /**
   * Webhooks methods
   */
  webhooks = {
    list: async () => {
      if (this.useLive) {
        return liveApi.webhooks.list()
      }
      // Mock webhooks for tests
      return [
        {
          id: "1",
          url: "https://example.com/webhook",
          events: ["task.created", "task.completed"],
          status: "active",
          created: new Date().toISOString(),
        }
      ]
    },

    create: async (data: { url: string; events: string[] }) => {
      if (this.useLive) {
        return liveApi.webhooks.create(data)
      }
      // Mock implementation for tests
      return { 
        success: true, 
        webhook: { 
          id: `webhook-${Date.now()}`, 
          status: "active",
          created: new Date().toISOString(),
          ...data 
        } 
      }
    },

    update: async (id: string, data: any) => {
      if (this.useLive) {
        return liveApi.webhooks.update(id, data)
      }
      // Mock implementation for tests
      return { success: true, webhook: { id, ...data } }
    },

    delete: async (id: string) => {
      if (this.useLive) {
        return liveApi.webhooks.delete(id)
      }
      // Mock implementation for tests
      return { success: true }
    },

    test: async (id: string) => {
      if (this.useLive) {
        return liveApi.webhooks.test(id)
      }
      // Mock implementation for tests
      return { success: true, status: "delivered" }
    },
  }

  /**
   * Health check
   */
  health = async () => {
    if (this.useLive) {
      return liveApi.health()
    }
    return true
  }

  /**
   * Switch to live mode (for development)
   */
  forceLiveMode() {
    this.useLive = true
    console.log('🔄 Switched to live mode')
  }

  /**
   * Switch to mock mode (for testing)
   */
  forceMockMode() {
    this.useLive = false
    console.log('🔄 Switched to mock mode')
  }

  /**
   * Get current mode
   */
  getCurrentMode() {
    return this.useLive ? 'live' : 'mock'
  }
}

// Export singleton instance
export const apiClient = new SmartApiClient()

// Export for backward compatibility
export { apiClient as smartApiClient }