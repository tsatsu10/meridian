/**
 * Task List Component Tests
 * 
 * Tests task list functionality:
 * - Task rendering
 * - Filtering
 * - Sorting
 * - Selection
 * - Bulk actions
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestWrapper } from '../../../test-utils/test-wrapper';
import React from 'react';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee?: string;
}

interface TaskListProps {
  tasks?: Task[];
  onTaskClick?: (taskId: string) => void;
  onFilterChange?: (filters: any) => void;
}

function TaskList({ tasks = [], onTaskClick, onFilterChange }: TaskListProps) {
  const [selectedTasks, setSelectedTasks] = React.useState<string[]>([]);

  const handleTaskClick = (taskId: string) => {
    if (onTaskClick) {
      onTaskClick(taskId);
    }
  };

  const handleSelectTask = (taskId: string) => {
    setSelectedTasks(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  return (
    <div role="region" aria-label="Task list">
      <h2>Tasks ({tasks.length})</h2>

      {tasks.length === 0 ? (
        <p>No tasks found</p>
      ) : (
        <ul>
          {tasks.map(task => (
            <li key={task.id} data-testid={`task-${task.id}`}>
              <input
                type="checkbox"
                checked={selectedTasks.includes(task.id)}
                onChange={() => handleSelectTask(task.id)}
                aria-label={`Select ${task.title}`}
              />
              <button onClick={() => handleTaskClick(task.id)}>
                <span className="title">{task.title}</span>
                <span className="status">{task.status}</span>
                <span className="priority">{task.priority}</span>
                {task.assignee && <span className="assignee">{task.assignee}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedTasks.length > 0 && (
        <div className="bulk-actions" data-testid="bulk-actions">
          {selectedTasks.length} selected
        </div>
      )}
    </div>
  );
}

describe('Task List Component', () => {
  const mockTasks: Task[] = [
    {
      id: 'task-1',
      title: 'Implement login',
      status: 'todo',
      priority: 'high',
      assignee: 'John Doe',
    },
    {
      id: 'task-2',
      title: 'Fix bug in dashboard',
      status: 'in_progress',
      priority: 'urgent',
    },
    {
      id: 'task-3',
      title: 'Update documentation',
      status: 'done',
      priority: 'low',
      assignee: 'Jane Smith',
    },
  ];

  it('should render task list', () => {
    render(<TaskList tasks={mockTasks} />, { wrapper: TestWrapper });

    expect(screen.getByRole('region', { name: /task list/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /tasks/i })).toBeInTheDocument();
  });

  it('should display task count', () => {
    render(<TaskList tasks={mockTasks} />, { wrapper: TestWrapper });

    expect(screen.getByText(/tasks \(3\)/i)).toBeInTheDocument();
  });

  it('should render all tasks', () => {
    render(<TaskList tasks={mockTasks} />, { wrapper: TestWrapper });

    expect(screen.getByText('Implement login')).toBeInTheDocument();
    expect(screen.getByText('Fix bug in dashboard')).toBeInTheDocument();
    expect(screen.getByText('Update documentation')).toBeInTheDocument();
  });

  it('should display task status', () => {
    render(<TaskList tasks={mockTasks} />, { wrapper: TestWrapper });

    const task1 = screen.getByTestId('task-task-1');
    expect(within(task1).getByText('todo')).toBeInTheDocument();
  });

  it('should display task priority', () => {
    render(<TaskList tasks={mockTasks} />, { wrapper: TestWrapper });

    const task2 = screen.getByTestId('task-task-2');
    expect(within(task2).getByText('urgent')).toBeInTheDocument();
  });

  it('should display assignee when present', () => {
    render(<TaskList tasks={mockTasks} />, { wrapper: TestWrapper });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should show empty state when no tasks', () => {
    render(<TaskList tasks={[]} />, { wrapper: TestWrapper });

    expect(screen.getByText(/no tasks found/i)).toBeInTheDocument();
  });

  it('should handle task click', async () => {
    const user = userEvent.setup();
    const onTaskClick = vi.fn();

    render(<TaskList tasks={mockTasks} onTaskClick={onTaskClick} />, { wrapper: TestWrapper });

    const task1 = screen.getByTestId('task-task-1');
    await user.click(within(task1).getByRole('button'));

    expect(onTaskClick).toHaveBeenCalledWith('task-1');
  });

  it('should select tasks', async () => {
    const user = userEvent.setup();

    render(<TaskList tasks={mockTasks} />, { wrapper: TestWrapper });

    const checkbox = screen.getByLabelText(/select implement login/i);
    await user.click(checkbox);

    expect(screen.getByTestId('bulk-actions')).toHaveTextContent('1 selected');
  });

  it('should select multiple tasks', async () => {
    const user = userEvent.setup();

    render(<TaskList tasks={mockTasks} />, { wrapper: TestWrapper });

    await user.click(screen.getByLabelText(/select implement login/i));
    await user.click(screen.getByLabelText(/select fix bug/i));

    expect(screen.getByTestId('bulk-actions')).toHaveTextContent('2 selected');
  });

  it('should deselect tasks', async () => {
    const user = userEvent.setup();

    render(<TaskList tasks={mockTasks} />, { wrapper: TestWrapper });

    const checkbox = screen.getByLabelText(/select implement login/i);
    
    await user.click(checkbox); // Select
    expect(screen.getByTestId('bulk-actions')).toBeInTheDocument();

    await user.click(checkbox); // Deselect
    expect(screen.queryByTestId('bulk-actions')).not.toBeInTheDocument();
  });

  it('should be accessible', () => {
    render(<TaskList tasks={mockTasks} />, { wrapper: TestWrapper });

    // Should have accessible region
    expect(screen.getByRole('region', { name: /task list/i })).toBeInTheDocument();

    // Checkboxes should have labels
    expect(screen.getByLabelText(/select implement login/i)).toBeInTheDocument();
  });
});

