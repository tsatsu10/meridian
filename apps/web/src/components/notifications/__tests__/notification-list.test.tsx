/**
 * Notification List Tests
 * 
 * Tests notification list functionality:
 * - Notification display
 * - Mark as read
 * - Clear notifications
 * - Empty states
 * - Loading states
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  isRead: boolean
  createdAt: string
}

interface NotificationListProps {
  notifications?: Notification[]
  isLoading?: boolean
  onMarkAsRead?: (id: string) => void
  onMarkAllAsRead?: () => void
  onClear?: (id: string) => void
  onClearAll?: () => void
}

function NotificationList({
  notifications = [],
  isLoading = false,
  onMarkAsRead,
  onMarkAllAsRead,
  onClear,
  onClearAll,
}: NotificationListProps) {
  const unreadCount = notifications.filter(n => !n.isRead).length

  if (isLoading) {
    return (
      <div className="notification-list" role="status" aria-label="Loading notifications">
        <div className="loading-skeleton" />
        <span className="sr-only">Loading notifications...</span>
      </div>
    )
  }

  return (
    <div className="notification-list" data-testid="notification-list">
      <div className="notification-header">
        <h2>Notifications</h2>
        {unreadCount > 0 && (
          <span className="unread-badge" aria-label={`${unreadCount} unread notifications`}>
            {unreadCount}
          </span>
        )}
      </div>

      {notifications.length > 0 && (
        <div className="notification-actions">
          {unreadCount > 0 && (
            <button onClick={onMarkAllAsRead} aria-label="Mark all as read">
              Mark all as read
            </button>
          )}
          <button onClick={onClearAll} aria-label="Clear all notifications">
            Clear all
          </button>
        </div>
      )}

      <div className="notifications" role="list">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`notification-item ${notification.isRead ? 'read' : 'unread'} ${notification.type}`}
            role="listitem"
            data-notification-id={notification.id}
          >
            <div className="notification-content">
              <h3>{notification.title}</h3>
              <p>{notification.message}</p>
              <time dateTime={notification.createdAt}>
                {new Date(notification.createdAt).toLocaleString()}
              </time>
            </div>

            <div className="notification-actions-item">
              {!notification.isRead && (
                <button
                  onClick={() => onMarkAsRead?.(notification.id)}
                  aria-label={`Mark ${notification.title} as read`}
                >
                  Mark as read
                </button>
              )}
              <button
                onClick={() => onClear?.(notification.id)}
                aria-label={`Clear ${notification.title}`}
              >
                Clear
              </button>
            </div>
          </div>
        ))}
      </div>

      {notifications.length === 0 && (
        <div className="empty-state" role="status">
          <p>No notifications</p>
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

describe('NotificationList', () => {
  const mockNotifications: Notification[] = [
    {
      id: 'notif-1',
      title: 'New task assigned',
      message: 'You have been assigned to task ABC-123',
      type: 'info',
      isRead: false,
      createdAt: '2024-01-01T10:00:00Z',
    },
    {
      id: 'notif-2',
      title: 'Task completed',
      message: 'Task XYZ-456 was completed',
      type: 'success',
      isRead: true,
      createdAt: '2024-01-01T09:00:00Z',
    },
    {
      id: 'notif-3',
      title: 'Deadline approaching',
      message: 'Task DEF-789 is due tomorrow',
      type: 'warning',
      isRead: false,
      createdAt: '2024-01-01T08:00:00Z',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render notification list', () => {
    render(<NotificationList notifications={mockNotifications} />, { wrapper: TestWrapper })

    expect(screen.getByTestId('notification-list')).toBeInTheDocument()
    expect(screen.getByText('Notifications')).toBeInTheDocument()
  })

  it('should display all notifications', () => {
    render(<NotificationList notifications={mockNotifications} />, { wrapper: TestWrapper })

    expect(screen.getByText('New task assigned')).toBeInTheDocument()
    expect(screen.getByText('Task completed')).toBeInTheDocument()
    expect(screen.getByText('Deadline approaching')).toBeInTheDocument()
  })

  it('should show unread count badge', () => {
    render(<NotificationList notifications={mockNotifications} />, { wrapper: TestWrapper })

    expect(screen.getByLabelText(/2 unread notifications/i)).toBeInTheDocument()
  })

  it('should handle mark as read action', async () => {
    const user = userEvent.setup()
    const onMarkAsRead = vi.fn()

    render(
      <NotificationList notifications={mockNotifications} onMarkAsRead={onMarkAsRead} />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByLabelText(/mark new task assigned as read/i))

    expect(onMarkAsRead).toHaveBeenCalledWith('notif-1')
  })

  it('should handle mark all as read action', async () => {
    const user = userEvent.setup()
    const onMarkAllAsRead = vi.fn()

    render(
      <NotificationList notifications={mockNotifications} onMarkAllAsRead={onMarkAllAsRead} />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByLabelText(/mark all as read/i))

    expect(onMarkAllAsRead).toHaveBeenCalled()
  })

  it('should handle clear notification action', async () => {
    const user = userEvent.setup()
    const onClear = vi.fn()

    render(
      <NotificationList notifications={mockNotifications} onClear={onClear} />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByLabelText(/clear new task assigned/i))

    expect(onClear).toHaveBeenCalledWith('notif-1')
  })

  it('should handle clear all action', async () => {
    const user = userEvent.setup()
    const onClearAll = vi.fn()

    render(
      <NotificationList notifications={mockNotifications} onClearAll={onClearAll} />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByLabelText(/clear all notifications/i))

    expect(onClearAll).toHaveBeenCalled()
  })

  it('should show empty state when no notifications', () => {
    render(<NotificationList notifications={[]} />, { wrapper: TestWrapper })

    expect(screen.getByText('No notifications')).toBeInTheDocument()
  })

  it('should show loading state', () => {
    render(<NotificationList isLoading={true} />, { wrapper: TestWrapper })

    expect(screen.getByLabelText(/loading notifications/i)).toBeInTheDocument()
  })

  it('should apply correct CSS classes based on notification type', () => {
    const { container } = render(
      <NotificationList notifications={mockNotifications} />,
      { wrapper: TestWrapper }
    )

    expect(container.querySelector('.info')).toBeInTheDocument()
    expect(container.querySelector('.success')).toBeInTheDocument()
    expect(container.querySelector('.warning')).toBeInTheDocument()
  })
})

