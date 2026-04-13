/**
 * Dashboard Overview Tests
 * 
 * Tests dashboard overview functionality:
 * - Widget rendering
 * - Data display
 * - Real-time updates
 * - User interactions
 * - Loading states
 * - Error handling
 * - Responsive layout
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

interface DashboardStats {
  totalProjects: number
  activeProjects: number
  totalTasks: number
  completedTasks: number
  teamMembers: number
  upcomingDeadlines: number
}

interface RecentActivity {
  id: string
  type: 'task' | 'project' | 'comment' | 'milestone'
  title: string
  user: string
  timestamp: string
}

interface DashboardWidget {
  id: string
  type: 'stats' | 'activity' | 'chart' | 'tasks'
  title: string
  isVisible: boolean
}

interface DashboardOverviewProps {
  stats?: DashboardStats
  recentActivity?: RecentActivity[]
  widgets?: DashboardWidget[]
  isLoading?: boolean
  error?: string | null
  onRefresh?: () => void
  onWidgetToggle?: (widgetId: string) => void
  onWidgetReorder?: (widgets: DashboardWidget[]) => void
}

function DashboardOverview({
  stats,
  recentActivity = [],
  widgets = [],
  isLoading = false,
  error = null,
  onRefresh,
  onWidgetToggle,
  onWidgetReorder,
}: DashboardOverviewProps) {
  const [refreshing, setRefreshing] = React.useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await onRefresh?.()
    setTimeout(() => setRefreshing(false), 500)
  }

  if (error) {
    return (
      <div className="dashboard-error" role="alert">
        <p>{error}</p>
        <button onClick={handleRefresh}>Retry</button>
      </div>
    )
  }

  if (isLoading && !stats) {
    return (
      <div className="dashboard-loading" role="status" aria-label="Loading dashboard">
        <div className="skeleton" />
        <span className="sr-only">Loading...</span>
      </div>
    )
  }

  const visibleWidgets = widgets.filter(w => w.isVisible)

  return (
    <div className="dashboard-overview" data-testid="dashboard-overview">
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label="Refresh dashboard"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </header>

      {/* Stats Widget */}
      {stats && (
        <section className="stats-widget" aria-label="Dashboard statistics">
          <div className="stat-card">
            <h3>Total Projects</h3>
            <p className="stat-value">{stats.totalProjects}</p>
          </div>

          <div className="stat-card">
            <h3>Active Projects</h3>
            <p className="stat-value">{stats.activeProjects}</p>
          </div>

          <div className="stat-card">
            <h3>Total Tasks</h3>
            <p className="stat-value">{stats.totalTasks}</p>
          </div>

          <div className="stat-card">
            <h3>Completed Tasks</h3>
            <p className="stat-value">{stats.completedTasks}</p>
            <p className="stat-percentage">
              {stats.totalTasks > 0
                ? `${Math.round((stats.completedTasks / stats.totalTasks) * 100)}%`
                : '0%'}
            </p>
          </div>

          <div className="stat-card">
            <h3>Team Members</h3>
            <p className="stat-value">{stats.teamMembers}</p>
          </div>

          <div className="stat-card">
            <h3>Upcoming Deadlines</h3>
            <p className="stat-value">{stats.upcomingDeadlines}</p>
          </div>
        </section>
      )}

      {/* Recent Activity Widget */}
      <section className="activity-widget" aria-label="Recent activity">
        <h2>Recent Activity</h2>
        {recentActivity.length > 0 ? (
          <div className="activity-list" role="list">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="activity-item" role="listitem">
                <span className={`activity-type type-${activity.type}`}>
                  {activity.type}
                </span>
                <div className="activity-content">
                  <strong>{activity.title}</strong>
                  <p>
                    {activity.user} •{' '}
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-activity">No recent activity</p>
        )}
      </section>

      {/* Widgets */}
      {visibleWidgets.length > 0 && (
        <section className="dashboard-widgets">
          <h2>Widgets</h2>
          <div className="widgets-grid">
            {visibleWidgets.map((widget) => (
              <div key={widget.id} className="widget" data-widget-id={widget.id}>
                <div className="widget-header">
                  <h3>{widget.title}</h3>
                  <button
                    onClick={() => onWidgetToggle?.(widget.id)}
                    aria-label={`Hide ${widget.title}`}
                  >
                    ×
                  </button>
                </div>
                <div className="widget-content">
                  {widget.type === 'stats' && <p>Statistics widget content</p>}
                  {widget.type === 'activity' && <p>Activity widget content</p>}
                  {widget.type === 'chart' && <p>Chart widget content</p>}
                  {widget.type === 'tasks' && <p>Tasks widget content</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {visibleWidgets.length === 0 && widgets.length > 0 && (
        <div className="no-widgets">
          <p>All widgets are hidden</p>
          <button onClick={() => widgets.forEach(w => onWidgetToggle?.(w.id))}>
            Show All Widgets
          </button>
        </div>
      )}
    </div>
  )
}

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('DashboardOverview', () => {
  const mockStats: DashboardStats = {
    totalProjects: 10,
    activeProjects: 7,
    totalTasks: 150,
    completedTasks: 90,
    teamMembers: 12,
    upcomingDeadlines: 5,
  }

  const mockActivity: RecentActivity[] = [
    {
      id: '1',
      type: 'task',
      title: 'Task completed',
      user: 'John Doe',
      timestamp: '2024-01-01T10:00:00Z',
    },
    {
      id: '2',
      type: 'project',
      title: 'New project created',
      user: 'Jane Smith',
      timestamp: '2024-01-01T09:00:00Z',
    },
  ]

  const mockWidgets: DashboardWidget[] = [
    { id: 'widget-1', type: 'stats', title: 'Statistics', isVisible: true },
    { id: 'widget-2', type: 'activity', title: 'Activity Feed', isVisible: true },
    { id: 'widget-3', type: 'chart', title: 'Progress Chart', isVisible: false },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render dashboard title', () => {
    render(<DashboardOverview stats={mockStats} />, { wrapper: TestWrapper })

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('should display all statistics', () => {
    render(<DashboardOverview stats={mockStats} />, { wrapper: TestWrapper })

    expect(screen.getByText('10')).toBeInTheDocument() // totalProjects
    expect(screen.getByText('7')).toBeInTheDocument() // activeProjects
    expect(screen.getByText('150')).toBeInTheDocument() // totalTasks
    expect(screen.getByText('90')).toBeInTheDocument() // completedTasks
    expect(screen.getByText('12')).toBeInTheDocument() // teamMembers
    expect(screen.getByText('5')).toBeInTheDocument() // upcomingDeadlines
  })

  it('should calculate task completion percentage', () => {
    render(<DashboardOverview stats={mockStats} />, { wrapper: TestWrapper })

    // 90/150 = 60%
    expect(screen.getByText('60%')).toBeInTheDocument()
  })

  it('should handle zero tasks gracefully', () => {
    const statsWithNoTasks = { ...mockStats, totalTasks: 0, completedTasks: 0 }

    render(<DashboardOverview stats={statsWithNoTasks} />, { wrapper: TestWrapper })

    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('should display recent activity', () => {
    render(
      <DashboardOverview stats={mockStats} recentActivity={mockActivity} />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByText('Task completed')).toBeInTheDocument()
    expect(screen.getByText('New project created')).toBeInTheDocument()
    
    // Activity items should be rendered
    const activityItems = screen.getAllByRole('listitem')
    expect(activityItems).toHaveLength(2)
  })

  it('should show empty activity state', () => {
    render(
      <DashboardOverview stats={mockStats} recentActivity={[]} />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByText('No recent activity')).toBeInTheDocument()
  })

  it('should handle refresh action', async () => {
    const user = userEvent.setup()
    const onRefresh = vi.fn().mockResolvedValue(undefined)

    render(
      <DashboardOverview stats={mockStats} onRefresh={onRefresh} />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByLabelText(/refresh dashboard/i))

    expect(onRefresh).toHaveBeenCalled()
  })

  it('should disable refresh button while refreshing', async () => {
    const user = userEvent.setup()
    const onRefresh = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )

    render(
      <DashboardOverview stats={mockStats} onRefresh={onRefresh} />,
      { wrapper: TestWrapper }
    )

    const refreshButton = screen.getByLabelText(/refresh dashboard/i)
    await user.click(refreshButton)

    expect(refreshButton).toBeDisabled()
    expect(screen.getByText('Refreshing...')).toBeInTheDocument()
  })

  it('should display loading state', () => {
    render(<DashboardOverview isLoading={true} />, { wrapper: TestWrapper })

    expect(screen.getByLabelText(/loading dashboard/i)).toBeInTheDocument()
    expect(screen.getByText(/loading/i, { selector: '.sr-only' })).toBeInTheDocument()
  })

  it('should display error state', () => {
    render(
      <DashboardOverview error="Failed to load dashboard data" />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load dashboard data')
  })

  it('should allow retrying after error', async () => {
    const user = userEvent.setup()
    const onRefresh = vi.fn()

    render(
      <DashboardOverview error="Failed to load" onRefresh={onRefresh} />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByRole('button', { name: /retry/i }))

    expect(onRefresh).toHaveBeenCalled()
  })

  it('should render visible widgets', () => {
    render(
      <DashboardOverview stats={mockStats} widgets={mockWidgets} />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByText('Statistics')).toBeInTheDocument()
    expect(screen.getByText('Activity Feed')).toBeInTheDocument()
    expect(screen.queryByText('Progress Chart')).not.toBeInTheDocument()
  })

  it('should hide widget when toggle clicked', async () => {
    const user = userEvent.setup()
    const onWidgetToggle = vi.fn()

    render(
      <DashboardOverview
        stats={mockStats}
        widgets={mockWidgets}
        onWidgetToggle={onWidgetToggle}
      />,
      { wrapper: TestWrapper }
    )

    const hideButton = screen.getByLabelText(/hide statistics/i)
    await user.click(hideButton)

    expect(onWidgetToggle).toHaveBeenCalledWith('widget-1')
  })

  it('should show no widgets message when all hidden', () => {
    const hiddenWidgets = mockWidgets.map(w => ({ ...w, isVisible: false }))

    render(
      <DashboardOverview stats={mockStats} widgets={hiddenWidgets} />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByText('All widgets are hidden')).toBeInTheDocument()
  })

  it('should display different activity types', () => {
    const activities: RecentActivity[] = [
      { id: '1', type: 'task', title: 'Task activity', user: 'User 1', timestamp: '2024-01-01T10:00:00Z' },
      { id: '2', type: 'project', title: 'Project activity', user: 'User 2', timestamp: '2024-01-01T10:00:00Z' },
      { id: '3', type: 'comment', title: 'Comment activity', user: 'User 3', timestamp: '2024-01-01T10:00:00Z' },
      { id: '4', type: 'milestone', title: 'Milestone activity', user: 'User 4', timestamp: '2024-01-01T10:00:00Z' },
    ]

    render(
      <DashboardOverview stats={mockStats} recentActivity={activities} />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByText('task')).toBeInTheDocument()
    expect(screen.getByText('project')).toBeInTheDocument()
    expect(screen.getByText('comment')).toBeInTheDocument()
    expect(screen.getByText('milestone')).toBeInTheDocument()
  })

  it('should render different widget types', () => {
    const visibleWidgets = mockWidgets.map(w => ({ ...w, isVisible: true }))

    render(
      <DashboardOverview stats={mockStats} widgets={visibleWidgets} />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByText('Statistics widget content')).toBeInTheDocument()
    expect(screen.getByText('Activity widget content')).toBeInTheDocument()
    expect(screen.getByText('Chart widget content')).toBeInTheDocument()
  })

  it('should format activity timestamps', () => {
    render(
      <DashboardOverview stats={mockStats} recentActivity={mockActivity} />,
      { wrapper: TestWrapper }
    )

    // Should show time in locale format
    const timeRegex = /\d{1,2}:\d{2}:\d{2}/
    const times = screen.getAllByText(timeRegex)
    expect(times.length).toBeGreaterThan(0)
  })

  it('should be accessible', () => {
    render(
      <DashboardOverview stats={mockStats} recentActivity={mockActivity} />,
      { wrapper: TestWrapper }
    )

    // Dashboard should have testid
    expect(screen.getByTestId('dashboard-overview')).toBeInTheDocument()

    // Stats section should have proper label
    expect(screen.getByLabelText(/dashboard statistics/i)).toBeInTheDocument()

    // Activity section should have proper label
    expect(screen.getByLabelText(/recent activity/i)).toBeInTheDocument()

    // Activity list should have list role
    expect(screen.getByRole('list')).toBeInTheDocument()

    // Refresh button should have accessible label
    expect(screen.getByLabelText(/refresh dashboard/i)).toBeInTheDocument()
  })

  it('should show stat labels', () => {
    render(<DashboardOverview stats={mockStats} />, { wrapper: TestWrapper })

    expect(screen.getByText('Total Projects')).toBeInTheDocument()
    expect(screen.getByText('Active Projects')).toBeInTheDocument()
    expect(screen.getByText('Total Tasks')).toBeInTheDocument()
    expect(screen.getByText('Completed Tasks')).toBeInTheDocument()
    expect(screen.getByText('Team Members')).toBeInTheDocument()
    expect(screen.getByText('Upcoming Deadlines')).toBeInTheDocument()
  })

  it('should render with no widgets array', () => {
    render(<DashboardOverview stats={mockStats} />, { wrapper: TestWrapper })

    expect(screen.getByTestId('dashboard-overview')).toBeInTheDocument()
    expect(screen.queryByText('Widgets')).not.toBeInTheDocument()
  })

  it('should handle partial stats data', () => {
    const partialStats = {
      totalProjects: 5,
      activeProjects: 3,
      totalTasks: 0,
      completedTasks: 0,
      teamMembers: 0,
      upcomingDeadlines: 0,
    }

    render(<DashboardOverview stats={partialStats} />, { wrapper: TestWrapper })

    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('should handle many activity items', () => {
    const manyActivities = Array.from({ length: 50 }, (_, i) => ({
      id: `activity-${i}`,
      type: 'task' as const,
      title: `Activity ${i}`,
      user: `User ${i}`,
      timestamp: '2024-01-01T10:00:00Z',
    }))

    render(
      <DashboardOverview stats={mockStats} recentActivity={manyActivities} />,
      { wrapper: TestWrapper }
    )

    const activityItems = screen.getAllByRole('listitem')
    expect(activityItems).toHaveLength(50)
  })

  it('should display widget with correct data attributes', () => {
    render(
      <DashboardOverview stats={mockStats} widgets={mockWidgets} />,
      { wrapper: TestWrapper }
    )

    const widget = screen.getByText('Statistics').closest('[data-widget-id]')
    expect(widget).toHaveAttribute('data-widget-id', 'widget-1')
  })

  it('should handle rapid refresh clicks', async () => {
    const user = userEvent.setup()
    const onRefresh = vi.fn().mockResolvedValue(undefined)

    render(
      <DashboardOverview stats={mockStats} onRefresh={onRefresh} />,
      { wrapper: TestWrapper }
    )

    const refreshButton = screen.getByLabelText(/refresh dashboard/i)

    // Click multiple times rapidly
    await user.click(refreshButton)
    await user.click(refreshButton)
    await user.click(refreshButton)

    // Should still only call once (button is disabled)
    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalledTimes(1)
    })
  })

  it('should render without stats prop', () => {
    render(<DashboardOverview />, { wrapper: TestWrapper })

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.queryByLabelText(/dashboard statistics/i)).not.toBeInTheDocument()
  })

  it('should show percentage with proper formatting', () => {
    const statsWithDecimals = {
      ...mockStats,
      totalTasks: 3,
      completedTasks: 2, // 2/3 = 66.666... should round to 67%
    }

    render(<DashboardOverview stats={statsWithDecimals} />, { wrapper: TestWrapper })

    expect(screen.getByText('67%')).toBeInTheDocument()
  })

  it('should preserve widget order', () => {
    render(
      <DashboardOverview stats={mockStats} widgets={mockWidgets} />,
      { wrapper: TestWrapper }
    )

    const widgets = screen.getAllByText(/widget content/i)
    expect(widgets[0]).toHaveTextContent('Statistics widget content')
    expect(widgets[1]).toHaveTextContent('Activity widget content')
  })

  it('should handle 100% task completion', () => {
    const statsComplete = {
      ...mockStats,
      totalTasks: 100,
      completedTasks: 100,
    }

    render(<DashboardOverview stats={statsComplete} />, { wrapper: TestWrapper })

    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('should display activity types with correct styling', () => {
    const { container } = render(
      <DashboardOverview stats={mockStats} recentActivity={mockActivity} />,
      { wrapper: TestWrapper }
    )

    const taskType = container.querySelector('.type-task')
    const projectType = container.querySelector('.type-project')

    expect(taskType).toBeInTheDocument()
    expect(projectType).toBeInTheDocument()
  })

  it('should handle empty stats gracefully', () => {
    const emptyStats = {
      totalProjects: 0,
      activeProjects: 0,
      totalTasks: 0,
      completedTasks: 0,
      teamMembers: 0,
      upcomingDeadlines: 0,
    }

    render(<DashboardOverview stats={emptyStats} />, { wrapper: TestWrapper })

    expect(screen.getAllByText('0')).toHaveLength(6)
  })
})

