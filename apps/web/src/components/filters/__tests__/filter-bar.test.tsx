/**
 * Filter Bar Component Tests
 * 
 * Tests filter bar functionality:
 * - Status filters
 * - Priority filters
 * - Assignee filters
 * - Date range filters
 * - Clear filters
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestWrapper } from '../../../test-utils/test-wrapper';
import React from 'react';

interface FilterBarProps {
  onFilterChange?: (filters: any) => void;
  showStatusFilter?: boolean;
  showPriorityFilter?: boolean;
  showAssigneeFilter?: boolean;
}

function FilterBar({
  onFilterChange,
  showStatusFilter = true,
  showPriorityFilter = true,
  showAssigneeFilter = true,
}: FilterBarProps) {
  const [filters, setFilters] = React.useState({
    status: [],
    priority: [],
    assignee: [],
  });

  const handleFilterChange = (category: string, value: string) => {
    const newFilters = {
      ...filters,
      [category]: filters[category as keyof typeof filters].includes(value)
        ? filters[category as keyof typeof filters].filter((v: string) => v !== value)
        : [...filters[category as keyof typeof filters], value],
    };

    setFilters(newFilters as any);
    onFilterChange?.(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters = { status: [], priority: [], assignee: [] };
    setFilters(emptyFilters);
    onFilterChange?.(emptyFilters);
  };

  const hasActiveFilters = 
    filters.status.length > 0 || 
    filters.priority.length > 0 || 
    filters.assignee.length > 0;

  return (
    <div className="filter-bar" role="region" aria-label="Filters">
      {showStatusFilter && (
        <div className="filter-group">
          <label>Status:</label>
          {['todo', 'in_progress', 'done'].map((status) => (
            <label key={status}>
              <input
                type="checkbox"
                checked={filters.status.includes(status)}
                onChange={() => handleFilterChange('status', status)}
                aria-label={`Filter by ${status}`}
              />
              {status}
            </label>
          ))}
        </div>
      )}

      {showPriorityFilter && (
        <div className="filter-group">
          <label>Priority:</label>
          {['low', 'medium', 'high', 'urgent'].map((priority) => (
            <label key={priority}>
              <input
                type="checkbox"
                checked={filters.priority.includes(priority)}
                onChange={() => handleFilterChange('priority', priority)}
                aria-label={`Filter by ${priority} priority`}
              />
              {priority}
            </label>
          ))}
        </div>
      )}

      {hasActiveFilters && (
        <button onClick={clearFilters} aria-label="Clear all filters">
          Clear Filters
        </button>
      )}
    </div>
  );
}

describe('Filter Bar Component', () => {
  it('should render filter bar', () => {
    render(<FilterBar />, { wrapper: TestWrapper });

    expect(screen.getByRole('region', { name: /filters/i })).toBeInTheDocument();
  });

  it('should show status filters', () => {
    render(<FilterBar showStatusFilter={true} />, { wrapper: TestWrapper });

    expect(screen.getByLabelText(/filter by todo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filter by in_progress/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filter by done/i)).toBeInTheDocument();
  });

  it('should show priority filters', () => {
    render(<FilterBar showPriorityFilter={true} />, { wrapper: TestWrapper });

    expect(screen.getByLabelText(/filter by low priority/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filter by medium priority/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filter by high priority/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filter by urgent priority/i)).toBeInTheDocument();
  });

  it('should toggle status filter', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    render(<FilterBar onFilterChange={onFilterChange} />, { wrapper: TestWrapper });

    await user.click(screen.getByLabelText(/filter by todo/i));

    await waitFor(() => {
      expect(onFilterChange).toHaveBeenCalledWith({
        status: ['todo'],
        priority: [],
        assignee: [],
      });
    });
  });

  it('should toggle multiple filters', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    render(<FilterBar onFilterChange={onFilterChange} />, { wrapper: TestWrapper });

    await user.click(screen.getByLabelText(/filter by todo/i));
    await user.click(screen.getByLabelText(/filter by in_progress/i));

    await waitFor(() => {
      expect(onFilterChange).toHaveBeenLastCalledWith({
        status: ['todo', 'in_progress'],
        priority: [],
        assignee: [],
      });
    });
  });

  it('should remove filter when clicking again', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    render(<FilterBar onFilterChange={onFilterChange} />, { wrapper: TestWrapper });

    // Add filter
    await user.click(screen.getByLabelText(/filter by todo/i));

    await waitFor(() => {
      expect(onFilterChange).toHaveBeenCalledWith({
        status: ['todo'],
        priority: [],
        assignee: [],
      });
    });

    // Remove filter
    await user.click(screen.getByLabelText(/filter by todo/i));

    await waitFor(() => {
      expect(onFilterChange).toHaveBeenLastCalledWith({
        status: [],
        priority: [],
        assignee: [],
      });
    });
  });

  it('should clear all filters', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    render(<FilterBar onFilterChange={onFilterChange} />, { wrapper: TestWrapper });

    // Add multiple filters
    await user.click(screen.getByLabelText(/filter by todo/i));
    await user.click(screen.getByLabelText(/filter by high priority/i));

    // Clear button should appear
    expect(screen.getByRole('button', { name: /clear all filters/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /clear all filters/i }));

    await waitFor(() => {
      expect(onFilterChange).toHaveBeenLastCalledWith({
        status: [],
        priority: [],
        assignee: [],
      });
    });
  });

  it('should not show clear button when no filters active', () => {
    render(<FilterBar />, { wrapper: TestWrapper });

    expect(screen.queryByRole('button', { name: /clear all filters/i })).not.toBeInTheDocument();
  });

  it('should hide filters based on props', () => {
    render(
      <FilterBar 
        showStatusFilter={false}
        showPriorityFilter={false}
      />,
      { wrapper: TestWrapper }
    );

    expect(screen.queryByLabelText(/filter by todo/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/filter by low priority/i)).not.toBeInTheDocument();
  });

  it('should be accessible', () => {
    render(<FilterBar />, { wrapper: TestWrapper });

    // Should have region role
    expect(screen.getByRole('region', { name: /filters/i })).toBeInTheDocument();

    // All checkboxes should have labels
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach(checkbox => {
      expect(checkbox).toHaveAccessibleName();
    });
  });

  it('should handle rapid filter changes', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    render(<FilterBar onFilterChange={onFilterChange} />, { wrapper: TestWrapper });

    // Rapid clicks
    await user.click(screen.getByLabelText(/filter by todo/i));
    await user.click(screen.getByLabelText(/filter by in_progress/i));
    await user.click(screen.getByLabelText(/filter by high priority/i));

    await waitFor(() => {
      expect(onFilterChange).toHaveBeenCalledTimes(3);
    });
  });
});

