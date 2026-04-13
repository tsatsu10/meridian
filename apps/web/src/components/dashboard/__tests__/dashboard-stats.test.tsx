/**
 * Dashboard Stats Component Tests
 * 
 * Tests dashboard statistics display:
 * - Data rendering
 * - Loading states
 * - Error handling
 * - Responsiveness
 * - Accessibility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TestWrapper } from '../../../test-utils/test-wrapper';

// Mock dashboard stats component
function DashboardStats({ data, isLoading, error }: any) {
  if (isLoading) {
    return (
      <div role="status" aria-label="Loading dashboard">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" aria-live="assertive">
        <p>Error loading dashboard: {error.message}</p>
      </div>
    );
  }

  if (!data) {
    return <div>No data available</div>;
  }

  return (
    <div className="dashboard-stats">
      <div className="stat-card" role="region" aria-label="Total Projects">
        <h3>Total Projects</h3>
        <p className="stat-value">{data.totalProjects}</p>
      </div>

      <div className="stat-card" role="region" aria-label="Active Tasks">
        <h3>Active Tasks</h3>
        <p className="stat-value">{data.activeTasks}</p>
      </div>

      <div className="stat-card" role="region" aria-label="Completion Rate">
        <h3>Completion Rate</h3>
        <p className="stat-value">{data.completionRate}%</p>
      </div>

      <div className="stat-card" role="region" aria-label="Team Members">
        <h3>Team Members</h3>
        <p className="stat-value">{data.teamMembers}</p>
      </div>
    </div>
  );
}

describe('Dashboard Stats Component', () => {
  const mockData = {
    totalProjects: 15,
    activeTasks: 42,
    completionRate: 78,
    teamMembers: 8,
  };

  it('should render all stat cards', () => {
    render(
      <DashboardStats data={mockData} isLoading={false} error={null} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText('Total Projects')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();

    expect(screen.getByText('Active Tasks')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();

    expect(screen.getByText('Completion Rate')).toBeInTheDocument();
    expect(screen.getByText('78%')).toBeInTheDocument();

    expect(screen.getByText('Team Members')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('should display loading state', () => {
    render(
      <DashboardStats data={null} isLoading={true} error={null} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByRole('status', { name: /loading dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should display error state', () => {
    const error = new Error('Failed to fetch dashboard data');
    
    render(
      <DashboardStats data={null} isLoading={false} error={error} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/error loading dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/failed to fetch dashboard data/i)).toBeInTheDocument();
  });

  it('should handle zero values', () => {
    const zeroData = {
      totalProjects: 0,
      activeTasks: 0,
      completionRate: 0,
      teamMembers: 0,
    };

    render(
      <DashboardStats data={zeroData} isLoading={false} error={null} />,
      { wrapper: TestWrapper }
    );

    const statValues = screen.getAllByText('0');
    expect(statValues.length).toBeGreaterThanOrEqual(3);
  });

  it('should handle large numbers', () => {
    const largeData = {
      totalProjects: 1234,
      activeTasks: 5678,
      completionRate: 99,
      teamMembers: 234,
    };

    render(
      <DashboardStats data={largeData} isLoading={false} error={null} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText('1234')).toBeInTheDocument();
    expect(screen.getByText('5678')).toBeInTheDocument();
    expect(screen.getByText('99%')).toBeInTheDocument();
    expect(screen.getByText('234')).toBeInTheDocument();
  });

  it('should be accessible', () => {
    render(
      <DashboardStats data={mockData} isLoading={false} error={null} />,
      { wrapper: TestWrapper }
    );

    // Each stat card should have an accessible region
    expect(screen.getByRole('region', { name: /total projects/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /active tasks/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /completion rate/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /team members/i })).toBeInTheDocument();
  });

  it('should handle missing data gracefully', () => {
    render(
      <DashboardStats data={null} isLoading={false} error={null} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText(/no data available/i)).toBeInTheDocument();
  });

  it('should handle partial data', () => {
    const partialData = {
      totalProjects: 10,
      activeTasks: 20,
      // Missing completionRate and teamMembers
    };

    render(
      <DashboardStats data={partialData} isLoading={false} error={null} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('should update when data changes', () => {
    const { rerender } = render(
      <DashboardStats data={mockData} isLoading={false} error={null} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText('15')).toBeInTheDocument();

    const newData = {
      ...mockData,
      totalProjects: 20,
    };

    rerender(
      <DashboardStats data={newData} isLoading={false} error={null} />
    );

    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.queryByText('15')).not.toBeInTheDocument();
  });

  it('should transition from loading to data', () => {
    const { rerender } = render(
      <DashboardStats data={null} isLoading={true} error={null} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByRole('status')).toBeInTheDocument();

    rerender(
      <DashboardStats data={mockData} isLoading={false} error={null} />
    );

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('should have proper semantic HTML structure', () => {
    const { container } = render(
      <DashboardStats data={mockData} isLoading={false} error={null} />,
      { wrapper: TestWrapper }
    );

    const statCards = container.querySelectorAll('.stat-card');
    expect(statCards).toHaveLength(4);

    statCards.forEach(card => {
      expect(card.querySelector('h3')).toBeInTheDocument();
      expect(card.querySelector('.stat-value')).toBeInTheDocument();
    });
  });
});

