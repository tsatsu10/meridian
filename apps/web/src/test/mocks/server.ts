import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

// Mock data
const mockUser = {
  id: 'user-1',
  email: 'test@meridian.app',
  name: 'Test User',
  role: 'workspace-manager',
  createdAt: new Date().toISOString(),
}

const mockWorkspace = {
  id: 'workspace-1',
  name: 'Test Workspace',
  description: 'A test workspace',
  createdAt: new Date().toISOString(),
  ownerId: 'user-1'
}

const mockProject = {
  id: 'project-1',
  name: 'Test Project',
  description: 'A test project',
  workspaceId: 'workspace-1',
  status: 'active',
  createdAt: new Date().toISOString(),
}

const mockTasks = [
  {
    id: 'task-1',
    title: 'Test Task 1',
    description: 'First test task',
    status: 'todo',
    priority: 'medium',
    projectId: 'project-1',
    assigneeId: 'user-1',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-2',
    title: 'Test Task 2',
    description: 'Second test task',
    status: 'in_progress',
    priority: 'high',
    projectId: 'project-1',
    assigneeId: 'user-1',
    createdAt: new Date().toISOString(),
  }
]

// Auth state for MSW to track login/logout
let currentUser: typeof mockUser | null = mockUser

// Export function to reset auth state for testing
export const resetAuthState = () => {
  currentUser = null
}

// Export function to set authenticated state for testing
export const setAuthenticatedState = () => {
  currentUser = mockUser
}

const mockMessages = [
  {
    id: 'msg-1',
    content: 'Hello from test',
    channelId: 'channel-1',
    senderId: 'user-1',
    createdAt: new Date().toISOString(),
    type: 'text'
  }
]

// API handlers
export const handlers = [
  // Authentication endpoints
  http.get('/api/me', () => {
    return HttpResponse.json({ user: mockUser })
  }),

  // Add auth endpoints that our tests expect
  http.get('/api/auth/me', () => {
    if (currentUser) {
      return HttpResponse.json({ user: currentUser })
    }
    return HttpResponse.json({ user: null }, { status: 401 })
  }),

  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as any
    
    if (body.email === 'test@meridian.app' && body.password === 'password') {
      currentUser = mockUser
      return HttpResponse.json({ 
        success: true, 
        user: mockUser,
        token: 'mock-jwt-token'
      })
    }
    
    // On failed login, clear current user
    currentUser = null
    return HttpResponse.json(
      { success: false, error: 'Invalid credentials' },
      { status: 401 }
    )
  }),

  http.post('/api/auth/register', async ({ request }) => {
    const body = await request.json() as any
    
    const newUser = {
      ...mockUser,
      id: 'user-2',
      email: body.email,
      name: body.name,
      role: 'user'
    }
    
    currentUser = newUser
    
    return HttpResponse.json({
      success: true,
      user: newUser
    })
  }),

  http.post('/api/auth/logout', () => {
    currentUser = null
    return HttpResponse.json({ success: true })
  }),

  http.post('/api/users/sign-in', async ({ request }) => {
    const body = await request.json() as any
    
    if (body.email === 'test@meridian.app' && body.password === 'password') {
      return HttpResponse.json({ 
        success: true, 
        user: mockUser,
        token: 'mock-jwt-token'
      })
    }
    
    return HttpResponse.json(
      { success: false, error: 'Invalid credentials' },
      { status: 401 }
    )
  }),

  http.post('/api/users/sign-up', async ({ request }) => {
    const body = await request.json() as any
    
    return HttpResponse.json({
      success: true,
      user: {
        ...mockUser,
        email: body.email,
        name: body.name,
      }
    })
  }),

  http.post('/api/users/sign-out', () => {
    return HttpResponse.json({ success: true })
  }),

  // Workspace endpoints
  http.get('/api/workspaces', () => {
    return HttpResponse.json({ workspaces: [mockWorkspace] })
  }),

  http.get('/api/workspaces/:workspaceId', ({ params }) => {
    return HttpResponse.json({ workspace: mockWorkspace })
  }),

  http.post('/api/workspaces', async ({ request }) => {
    const body = await request.json() as any
    
    return HttpResponse.json({
      workspace: {
        ...mockWorkspace,
        id: `workspace-${Date.now()}`,
        name: body.name,
        description: body.description,
      }
    })
  }),

  // Project endpoints
  http.get('/api/workspaces/:workspaceId/projects', () => {
    return HttpResponse.json({ projects: [mockProject] })
  }),

  http.get('/api/projects/:projectId', ({ params }) => {
    return HttpResponse.json({ project: mockProject })
  }),

  http.post('/api/workspaces/:workspaceId/projects', async ({ request }) => {
    const body = await request.json() as any
    
    return HttpResponse.json({
      project: {
        ...mockProject,
        id: `project-${Date.now()}`,
        name: body.name,
        description: body.description,
      }
    })
  }),

  // Task endpoints
  http.get('/api/projects/:projectId/tasks', () => {
    return HttpResponse.json({ tasks: mockTasks })
  }),

  http.get('/api/tasks/:taskId', ({ params }) => {
    const task = mockTasks.find(t => t.id === params.taskId)
    return HttpResponse.json({ task: task || mockTasks[0] })
  }),

  http.post('/api/projects/:projectId/tasks', async ({ request }) => {
    const body = await request.json() as any
    
    return HttpResponse.json({
      task: {
        ...mockTasks[0],
        id: `task-${Date.now()}`,
        title: body.title,
        description: body.description,
        status: body.status || 'todo',
        priority: body.priority || 'medium',
      }
    })
  }),

  http.put('/api/tasks/:taskId', async ({ request, params }) => {
    const body = await request.json() as any
    const existingTask = mockTasks.find(t => t.id === params.taskId) || mockTasks[0]
    
    return HttpResponse.json({
      task: {
        ...existingTask,
        ...body,
        updatedAt: new Date().toISOString(),
      }
    })
  }),

  // Message endpoints
  http.get('/api/channel/:channelId/messages', () => {
    return HttpResponse.json({ messages: mockMessages })
  }),

  http.post('/api/channel/:channelId/messages', async ({ request }) => {
    const body = await request.json() as any
    
    return HttpResponse.json({
      message: {
        ...mockMessages[0],
        id: `msg-${Date.now()}`,
        content: body.content,
        createdAt: new Date().toISOString(),
      }
    })
  }),

  // Analytics endpoints
  http.get('/api/analytics/dashboard', () => {
    return HttpResponse.json({
      totalTasks: 10,
      completedTasks: 4,
      inProgressTasks: 3,
      todoTasks: 3,
      totalProjects: 2,
      activeProjects: 2,
      totalUsers: 5,
      productivity: 85,
    })
  }),

  http.get('/api/analytics/project/:projectId', ({ params }) => {
    return HttpResponse.json({
      projectId: params.projectId,
      taskCompletion: 70,
      averageTaskTime: 2.5,
      teamProductivity: 88,
      burndownData: [
        { date: '2024-01-01', remaining: 10 },
        { date: '2024-01-02', remaining: 8 },
        { date: '2024-01-03', remaining: 6 },
      ],
    })
  }),

  // Notification endpoints
  http.get('/api/notifications', () => {
    return HttpResponse.json({
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
    })
  }),

  http.put('/api/notifications/:notificationId/read', ({ params }) => {
    return HttpResponse.json({ success: true })
  }),

  // Performance monitoring endpoints
  http.post('/api/performance/metrics', () => {
    return HttpResponse.json({ success: true, received: 1 })
  }),

  http.get('/api/performance/stats', () => {
    return HttpResponse.json({
      timestamp: new Date().toISOString(),
      apm: {
        responseTime: { average: 120, p95: 250 },
        errorRate: { percentage: 2.1 },
        throughput: { requestsPerMinute: 45 }
      },
      memory: {
        current: { percentage: 65 }
      },
      uptime: 3600
    })
  }),

  // Health check
  http.get('/health', () => {
    return HttpResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: { status: 'connected' },
      system: { healthy: true }
    })
  }),

  // File upload endpoints
  http.post('/api/attachments/upload', () => {
    return HttpResponse.json({
      success: true,
      file: {
        id: 'file-1',
        filename: 'test.png',
        url: '/uploads/test.png',
        size: 1024,
        mimeType: 'image/png',
      }
    })
  }),
]

// Setup server instance
export const server = setupServer(...handlers)