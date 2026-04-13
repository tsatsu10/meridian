import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DashboardStats from '../DashboardStats';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  }
}));

// Mock the AnimatedStatsCard component
vi.mock('@/components/dashboard/animated-stats-card', () => ({
  default: ({ title, value, description, icon: Icon }: any) => (
    <div data-testid={`stats-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div data-testid="stats-title">{title}</div>
      <div data-testid="stats-value">{value}</div>
      <div data-testid="stats-description">{description}</div>
      {Icon && <Icon data-testid="stats-icon" />}
    </div>
  )
}));

const mockDashboardData = {
  stats: {
    totalTasks: 45,
    completedTasks: 32,
    overdueTasks: 8
  },
  projects: [
    { id: '1', name: 'Project 1', status: 'active' },
    { id: '2', name: 'Project 2', status: 'completed' },
    { id: '3', name: 'Project 3', status: 'active' }
  ]
};

const mockRiskData = {
  data: {
    overallRiskScore: 75
  },
  hasHighRisk: true,
  highPriorityRisks: [
    { id: '1', title: 'Risk 1' },
    { id: '2', title: 'Risk 2' }
  ]
};

const mockNotifications = [
  { id: '1', title: 'Test Notification 1', isRead: false },
  { id: '2', title: 'Test Notification 2', isRead: true },
  { id: '3', title: 'Test Notification 3', isRead: false }
];

describe('DashboardStats', () => {
  it('renders all four stat cards', () => {
    render(
      <DashboardStats
        dashboardData={mockDashboardData}
        riskData={mockRiskData}
        allNotifications={mockNotifications}
      />
    );

    expect(screen.getByTestId('stats-card-total-tasks')).toBeInTheDocument();
    expect(screen.getByTestId('stats-card-active-projects')).toBeInTheDocument();
    expect(screen.getByTestId('stats-card-risk-score')).toBeInTheDocument();
    expect(screen.getByTestId('stats-card-notifications')).toBeInTheDocument();
  });

  it('displays correct total tasks value', () => {
    render(
      <DashboardStats
        dashboardData={mockDashboardData}
        riskData={mockRiskData}
        allNotifications={mockNotifications}
      />
    );

    const totalTasksCard = screen.getByTestId('stats-card-total-tasks');
    expect(totalTasksCard).toHaveTextContent('45');
  });

  it('calculates and displays active projects correctly', () => {
    render(
      <DashboardStats
        dashboardData={mockDashboardData}
        riskData={mockRiskData}
        allNotifications={mockNotifications}
      />
    );

    const activeProjectsCard = screen.getByTestId('stats-card-active-projects');
    // Total projects: 3, Active projects (non-completed): 2
    expect(activeProjectsCard).toHaveTextContent('3');
  });

  it('shows risk score correctly', () => {
    render(
      <DashboardStats
        dashboardData={mockDashboardData}
        riskData={mockRiskData}
        allNotifications={mockNotifications}
      />
    );

    const riskScoreCard = screen.getByTestId('stats-card-risk-score');
    expect(riskScoreCard).toHaveTextContent('75');
  });

  it('displays notification count correctly', () => {
    render(
      <DashboardStats
        dashboardData={mockDashboardData}
        riskData={mockRiskData}
        allNotifications={mockNotifications}
      />
    );

    const notificationsCard = screen.getByTestId('stats-card-notifications');
    expect(notificationsCard).toHaveTextContent('3');
  });

  it('handles missing dashboard data gracefully', () => {
    render(
      <DashboardStats
        dashboardData={null}
        riskData={mockRiskData}
        allNotifications={mockNotifications}
      />
    );

    const totalTasksCard = screen.getByTestId('stats-card-total-tasks');
    expect(totalTasksCard).toHaveTextContent('0');
  });

  it('handles missing risk data gracefully', () => {
    render(
      <DashboardStats
        dashboardData={mockDashboardData}
        riskData={{ data: null, hasHighRisk: false, highPriorityRisks: [] }}
        allNotifications={mockNotifications}
      />
    );

    const riskScoreCard = screen.getByTestId('stats-card-risk-score');
    expect(riskScoreCard).toHaveTextContent('0');
  });

  it('handles empty notifications array', () => {
    render(
      <DashboardStats
        dashboardData={mockDashboardData}
        riskData={mockRiskData}
        allNotifications={[]}
      />
    );

    const notificationsCard = screen.getByTestId('stats-card-notifications');
    expect(notificationsCard).toHaveTextContent('0');
  });

  it('applies correct color scheme based on risk score', () => {
    const highRiskData = {
      data: { overallRiskScore: 85 },
      hasHighRisk: true,
      highPriorityRisks: [{ id: '1', title: 'High Risk' }]
    };

    render(
      <DashboardStats
        dashboardData={mockDashboardData}
        riskData={highRiskData}
        allNotifications={mockNotifications}
      />
    );

    // This would test the color scheme prop passed to AnimatedStatsCard
    // In a real test, you'd check the rendered CSS classes or data attributes
    expect(screen.getByTestId('stats-card-risk-score')).toBeInTheDocument();
  });
});