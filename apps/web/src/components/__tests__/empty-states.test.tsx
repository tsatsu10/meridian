/**
 * Empty States Tests
 * 
 * Tests for empty state components:
 * - No data messages
 * - Call-to-action buttons
 * - Illustrations
 * - Helpful guidance
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestWrapper } from '../../test-utils/test-wrapper';
import React from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: string;
}

function EmptyState({ title, description, actionLabel, onAction, icon }: EmptyStateProps) {
  return (
    <div className="empty-state" role="region" aria-label="Empty state">
      {icon && <div className="icon">{icon}</div>}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {actionLabel && onAction && (
        <button onClick={onAction}>{actionLabel}</button>
      )}
    </div>
  );
}

describe('Empty States', () => {
  it('should render empty state', () => {
    render(<EmptyState title="No tasks yet" />, { wrapper: TestWrapper });

    expect(screen.getByRole('region', { name: /empty state/i })).toBeInTheDocument();
  });

  it('should display title', () => {
    render(<EmptyState title="No tasks yet" />, { wrapper: TestWrapper });

    expect(screen.getByRole('heading', { name: 'No tasks yet' })).toBeInTheDocument();
  });

  it('should display description when provided', () => {
    render(
      <EmptyState 
        title="No tasks" 
        description="Create your first task to get started" 
      />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText(/create your first task/i)).toBeInTheDocument();
  });

  it('should display action button', () => {
    render(
      <EmptyState 
        title="No tasks" 
        actionLabel="Create Task"
        onAction={() => {}}
      />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByRole('button', { name: 'Create Task' })).toBeInTheDocument();
  });

  it('should call action on button click', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    render(
      <EmptyState 
        title="No tasks" 
        actionLabel="Create Task"
        onAction={onAction}
      />,
      { wrapper: TestWrapper }
    );

    await user.click(screen.getByRole('button', { name: 'Create Task' }));

    expect(onAction).toHaveBeenCalled();
  });

  it('should display icon when provided', () => {
    render(
      <EmptyState 
        title="No tasks" 
        icon="📋"
      />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText('📋')).toBeInTheDocument();
  });

  it('should not show button when no action', () => {
    render(
      <EmptyState title="No tasks" />,
      { wrapper: TestWrapper }
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

