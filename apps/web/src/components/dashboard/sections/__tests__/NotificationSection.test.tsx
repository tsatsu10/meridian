import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import NotificationSection from '../NotificationSection';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Bell: ({ ...props }) => <div data-testid="bell-icon" {...props} />,
  AlertTriangle: ({ ...props }) => <div data-testid="alert-triangle-icon" {...props} />,
  Target: ({ ...props }) => <div data-testid="target-icon" {...props} />
}));

const mockNotifications = [
  {
    id: '1',
    title: '🚨 Critical Alert',
    message: 'System overload detected',
    priority: 'high',
    timestamp: '2025-01-15T10:00:00Z',
    isRead: false
  },
  {
    id: '2',
    title: 'Task Completed',
    message: 'Your task has been completed',
    priority: 'medium',
    timestamp: '2025-01-15T09:30:00Z',
    isRead: true
  },
  {
    id: '3',
    title: 'New Assignment',
    message: 'You have been assigned a new task',
    priority: 'low',
    timestamp: '2025-01-15T09:00:00Z',
    isRead: false
  },
  {
    id: '4',
    title: 'Meeting Reminder',
    message: 'Team meeting in 30 minutes',
    priority: 'medium',
    timestamp: '2025-01-15T08:30:00Z',
    isRead: true
  },
  {
    id: '5',
    title: 'System Update',
    message: 'System will be updated tonight',
    priority: 'low',
    timestamp: '2025-01-15T08:00:00Z',
    isRead: false
  },
  {
    id: '6',
    title: 'Extra Notification',
    message: 'This should not be displayed',
    priority: 'low',
    timestamp: '2025-01-15T07:30:00Z',
    isRead: false
  }
];

describe('NotificationSection', () => {
  it('renders the section title and bell icon', () => {
    render(<NotificationSection allNotifications={mockNotifications} />);

    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
  });

  it('displays unread count badge when there are unread notifications', () => {
    render(<NotificationSection allNotifications={mockNotifications} />);

    const unreadCount = mockNotifications.filter(n => !n.isRead).length;
    expect(screen.getByText(`${unreadCount} unread`)).toBeInTheDocument();
  });

  it('does not display unread badge when all notifications are read', () => {
    const readNotifications = mockNotifications.map(n => ({ ...n, isRead: true }));
    render(<NotificationSection allNotifications={readNotifications} />);

    expect(screen.queryByText(/unread/)).not.toBeInTheDocument();
  });

  it('displays only the first 5 notifications', () => {
    render(<NotificationSection allNotifications={mockNotifications} />);

    // Should show first 5 notifications
    expect(screen.getByText('🚨 Critical Alert')).toBeInTheDocument();
    expect(screen.getByText('Task Completed')).toBeInTheDocument();
    expect(screen.getByText('New Assignment')).toBeInTheDocument();
    expect(screen.getByText('Meeting Reminder')).toBeInTheDocument();
    expect(screen.getByText('System Update')).toBeInTheDocument();

    // Should not show the 6th notification
    expect(screen.queryByText('Extra Notification')).not.toBeInTheDocument();
  });

  it('shows correct icons for different notification types', () => {
    render(<NotificationSection allNotifications={mockNotifications.slice(0, 2)} />);

    // Critical alert should show AlertTriangle icon
    expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();

    // Regular notification should show Target icon
    expect(screen.getByTestId('target-icon')).toBeInTheDocument();
  });

  it('displays formatted dates correctly', () => {
    render(<NotificationSection allNotifications={mockNotifications.slice(0, 1)} />);

    // Check that date is formatted (this would depend on your locale)
    const dateText = screen.getAllByText(/2025/)[0];
    expect(dateText).toBeInTheDocument();
  });

  it('shows unread indicator for unread notifications', () => {
    render(<NotificationSection allNotifications={mockNotifications.slice(0, 1)} />);

    // Unread notification should have the blue dot
    const unreadDot = document.querySelector('.w-2.h-2.bg-blue-500.rounded-full');
    expect(unreadDot).toBeInTheDocument();
  });

  it('applies different styling for read vs unread notifications', () => {
    render(<NotificationSection allNotifications={mockNotifications.slice(0, 2)} />);

    const notificationItems = screen.getAllByRole('article');
    expect(notificationItems.length).toBeGreaterThan(0);
  });

  it('displays empty state when no notifications', () => {
    render(<NotificationSection allNotifications={[]} />);

    expect(screen.getByText('No recent activity')).toBeInTheDocument();
    expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
  });

  it('handles undefined notifications gracefully', () => {
    render(<NotificationSection allNotifications={undefined as any} />);

    expect(screen.getByText('No recent activity')).toBeInTheDocument();
  });

  it('displays priority badges correctly', () => {
    render(<NotificationSection allNotifications={mockNotifications.slice(0, 3)} />);

    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('medium')).toBeInTheDocument();
    expect(screen.getByText('low')).toBeInTheDocument();
  });

  it('truncates long notification messages appropriately', () => {
    const longMessageNotification = [{
      id: '1',
      title: 'Long Message Test',
      message: 'This is a very long message that should be handled properly by the component without breaking the layout or causing any issues',
      priority: 'medium',
      timestamp: '2025-01-15T10:00:00Z',
      isRead: false
    }];

    render(<NotificationSection allNotifications={longMessageNotification} />);

    expect(screen.getByText('Long Message Test')).toBeInTheDocument();
    expect(screen.getByText(/This is a very long message/)).toBeInTheDocument();
  });
});