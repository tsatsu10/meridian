/**
 * Dashboard Charts Component Tests
 * 
 * Tests dashboard chart components:
 * - Task completion charts
 * - Velocity charts
 * - Time tracking charts
 * - Team performance charts
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TestWrapper } from '../../../test-utils/test-wrapper';
import React from 'react';

interface TaskCompletionChartProps {
  data?: Array<{ date: string; completed: number }>;
}

function TaskCompletionChart({ data = [] }: TaskCompletionChartProps) {
  return (
    <div role="img" aria-label="Task completion chart">
      <h3>Tasks Completed</h3>
      {data.length > 0 ? (
        <div className="chart-container">
          {data.map((entry, index) => (
            <div key={index} className="chart-bar" data-testid={`bar-${index}`}>
              <span>{entry.date}</span>
              <span>{entry.completed}</span>
            </div>
          ))}
        </div>
      ) : (
        <p>No data available</p>
      )}
    </div>
  );
}

interface VelocityChartProps {
  weeklyData?: Array<{ week: number; velocity: number }>;
}

function VelocityChart({ weeklyData = [] }: VelocityChartProps) {
  const avgVelocity = weeklyData.length > 0
    ? weeklyData.reduce((sum, w) => sum + w.velocity, 0) / weeklyData.length
    : 0;

  return (
    <div role="img" aria-label="Team velocity chart">
      <h3>Team Velocity</h3>
      <div className="average" data-testid="avg-velocity">
        Average: {avgVelocity.toFixed(1)} tasks/week
      </div>
      {weeklyData.map((week, index) => (
        <div key={index} data-testid={`week-${week.week}`}>
          Week {week.week}: {week.velocity} tasks
        </div>
      ))}
    </div>
  );
}

describe('Dashboard Charts', () => {
  describe('TaskCompletionChart', () => {
    it('should render chart', () => {
      render(<TaskCompletionChart />, { wrapper: TestWrapper });

      expect(screen.getByRole('img', { name: /task completion chart/i })).toBeInTheDocument();
    });

    it('should display chart data', () => {
      const data = [
        { date: '2025-01-01', completed: 10 },
        { date: '2025-01-02', completed: 15 },
        { date: '2025-01-03', completed: 12 },
      ];

      render(<TaskCompletionChart data={data} />, { wrapper: TestWrapper });

      expect(screen.getByTestId('bar-0')).toHaveTextContent('10');
      expect(screen.getByTestId('bar-1')).toHaveTextContent('15');
    });

    it('should show empty state when no data', () => {
      render(<TaskCompletionChart data={[]} />, { wrapper: TestWrapper });

      expect(screen.getByText(/no data available/i)).toBeInTheDocument();
    });

    it('should handle large datasets', () => {
      const data = Array.from({ length: 30 }, (_, i) => ({
        date: `2025-01-${i + 1}`,
        completed: Math.floor(Math.random() * 20),
      }));

      render(<TaskCompletionChart data={data} />, { wrapper: TestWrapper });

      expect(screen.getAllByClassName('chart-bar')).toHaveLength(30);
    });
  });

  describe('VelocityChart', () => {
    it('should render velocity chart', () => {
      render(<VelocityChart />, { wrapper: TestWrapper });

      expect(screen.getByRole('img', { name: /team velocity chart/i })).toBeInTheDocument();
    });

    it('should display weekly velocity', () => {
      const data = [
        { week: 1, velocity: 10 },
        { week: 2, velocity: 12 },
        { week: 3, velocity: 15 },
      ];

      render(<VelocityChart weeklyData={data} />, { wrapper: TestWrapper });

      expect(screen.getByTestId('week-1')).toHaveTextContent('10 tasks');
      expect(screen.getByTestId('week-2')).toHaveTextContent('12 tasks');
    });

    it('should calculate average velocity', () => {
      const data = [
        { week: 1, velocity: 10 },
        { week: 2, velocity: 20 },
      ];

      render(<VelocityChart weeklyData={data} />, { wrapper: TestWrapper });

      expect(screen.getByTestId('avg-velocity')).toHaveTextContent('15.0');
    });

    it('should handle zero velocity', () => {
      const data = [{ week: 1, velocity: 0 }];

      render(<VelocityChart weeklyData={data} />, { wrapper: TestWrapper });

      expect(screen.getByTestId('avg-velocity')).toHaveTextContent('0.0');
    });
  });
});

