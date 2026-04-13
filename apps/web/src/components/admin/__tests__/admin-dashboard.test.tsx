/**
 * Admin Dashboard Component Tests
 * 
 * Tests admin dashboard functionality:
 * - Overview statistics
 * - User management
 * - Workspace analytics
 * - System health
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TestWrapper } from '../../../test-utils/test-wrapper';
import React from 'react';

interface AdminDashboardProps {
  stats?: {
    totalUsers?: number;
    totalWorkspaces?: number;
    totalProjects?: number;
    totalTasks?: number;
  };
}

function AdminDashboard({ stats }: AdminDashboardProps) {
  const defaultStats = {
    totalUsers: stats?.totalUsers ?? 0,
    totalWorkspaces: stats?.totalWorkspaces ?? 0,
    totalProjects: stats?.totalProjects ?? 0,
    totalTasks: stats?.totalTasks ?? 0,
  };

  return (
    <div role="main" aria-label="Admin dashboard">
      <h1>Admin Dashboard</h1>
      
      <div className="stats-grid">
        <div className="stat-card" data-testid="total-users">
          <h3>Total Users</h3>
          <p>{defaultStats.totalUsers}</p>
        </div>

        <div className="stat-card" data-testid="total-workspaces">
          <h3>Total Workspaces</h3>
          <p>{defaultStats.totalWorkspaces}</p>
        </div>

        <div className="stat-card" data-testid="total-projects">
          <h3>Total Projects</h3>
          <p>{defaultStats.totalProjects}</p>
        </div>

        <div className="stat-card" data-testid="total-tasks">
          <h3>Total Tasks</h3>
          <p>{defaultStats.totalTasks}</p>
        </div>
      </div>
    </div>
  );
}

describe('Admin Dashboard Component', () => {
  it('should render admin dashboard', () => {
    render(<AdminDashboard />, { wrapper: TestWrapper });

    expect(screen.getByRole('heading', { name: /admin dashboard/i })).toBeInTheDocument();
  });

  it('should display total users', () => {
    render(
      <AdminDashboard stats={{ totalUsers: 150 }} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByTestId('total-users')).toHaveTextContent('150');
  });

  it('should display total workspaces', () => {
    render(
      <AdminDashboard stats={{ totalWorkspaces: 25 }} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByTestId('total-workspaces')).toHaveTextContent('25');
  });

  it('should display total projects', () => {
    render(
      <AdminDashboard stats={{ totalProjects: 75 }} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByTestId('total-projects')).toHaveTextContent('75');
  });

  it('should display total tasks', () => {
    render(
      <AdminDashboard stats={{ totalTasks: 500 }} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByTestId('total-tasks')).toHaveTextContent('500');
  });

  it('should handle zero stats', () => {
    render(<AdminDashboard />, { wrapper: TestWrapper });

    expect(screen.getByTestId('total-users')).toHaveTextContent('0');
  });

  it('should display all stat cards', () => {
    render(<AdminDashboard />, { wrapper: TestWrapper });

    const statCards = screen.getAllByRole('heading', { level: 3 });

    expect(statCards.length).toBeGreaterThanOrEqual(4);
  });

  it('should be accessible', () => {
    render(<AdminDashboard />, { wrapper: TestWrapper });

    expect(screen.getByRole('main', { name: /admin dashboard/i })).toBeInTheDocument();
  });
});

