/**
 * Kanban Column Component Tests
 * 
 * Tests Kanban board column functionality:
 * - Column rendering
 * - Task cards display
 * - Drag and drop interactions
 * - Add task functionality
 * - Column header actions
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestWrapper } from '../../../test-utils/test-wrapper';
import React from 'react';

// Mock Kanban Column Component
interface KanbanColumnProps {
  column: {
    id: string;
    title: string;
    status: string;
    tasks: Array<{
      id: string;
      title: string;
      priority: string;
      assignee?: string;
    }>;
  };
  onAddTask?: (columnId: string) => void;
  onTaskClick?: (taskId: string) => void;
  onDragStart?: (taskId: string) => void;
  onDrop?: (taskId: string, columnId: string) => void;
}

function KanbanColumn({
  column,
  onAddTask,
  onTaskClick,
  onDragStart,
  onDrop,
}: KanbanColumnProps) {
  const [isAddingTask, setIsAddingTask] = React.useState(false);
  const [newTaskTitle, setNewTaskTitle] = React.useState('');

  const handleAddTask = () => {
    if (newTaskTitle.trim() && onAddTask) {
      onAddTask(column.id);
      setNewTaskTitle('');
      setIsAddingTask(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId && onDrop) {
      onDrop(taskId, column.id);
    }
  };

  return (
    <div 
      className="kanban-column"
      data-column-id={column.id}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      role="region"
      aria-label={`${column.title} column`}
    >
      <div className="column-header">
        <h3>{column.title}</h3>
        <span className="task-count" aria-label={`${column.tasks.length} tasks`}>
          {column.tasks.length}
        </span>
        <button 
          onClick={() => setIsAddingTask(true)}
          aria-label={`Add task to ${column.title}`}
        >
          + Add
        </button>
      </div>

      {isAddingTask && (
        <div className="add-task-form">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Enter task title..."
            aria-label="New task title"
            autoFocus
          />
          <button onClick={handleAddTask}>Add</button>
          <button onClick={() => setIsAddingTask(false)}>Cancel</button>
        </div>
      )}

      <div className="task-list" role="list">
        {column.tasks.map((task) => (
          <div
            key={task.id}
            className="task-card"
            draggable
            onDragStart={() => onDragStart?.(task.id)}
            onClick={() => onTaskClick?.(task.id)}
            role="listitem"
            aria-label={`Task: ${task.title}`}
          >
            <h4>{task.title}</h4>
            <span className={`priority-${task.priority}`}>
              {task.priority}
            </span>
            {task.assignee && (
              <span className="assignee">{task.assignee}</span>
            )}
          </div>
        ))}

        {column.tasks.length === 0 && (
          <div className="empty-column" aria-label="No tasks">
            No tasks
          </div>
        )}
      </div>
    </div>
  );
}

describe('Kanban Column Component', () => {
  const mockColumn = {
    id: 'col-todo',
    title: 'To Do',
    status: 'todo',
    tasks: [
      {
        id: 'task-1',
        title: 'Task 1',
        priority: 'high',
        assignee: 'John Doe',
      },
      {
        id: 'task-2',
        title: 'Task 2',
        priority: 'medium',
      },
    ],
  };

  it('should render column with title', () => {
    render(<KanbanColumn column={mockColumn} />, { wrapper: TestWrapper });

    expect(screen.getByText('To Do')).toBeInTheDocument();
  });

  it('should display task count', () => {
    render(<KanbanColumn column={mockColumn} />, { wrapper: TestWrapper });

    expect(screen.getByLabelText(/2 tasks/i)).toBeInTheDocument();
  });

  it('should render all tasks', () => {
    render(<KanbanColumn column={mockColumn} />, { wrapper: TestWrapper });

    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
  });

  it('should display task priority', () => {
    render(<KanbanColumn column={mockColumn} />, { wrapper: TestWrapper });

    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('medium')).toBeInTheDocument();
  });

  it('should display task assignee when present', () => {
    render(<KanbanColumn column={mockColumn} />, { wrapper: TestWrapper });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should show empty state when no tasks', () => {
    const emptyColumn = {
      ...mockColumn,
      tasks: [],
    };

    render(<KanbanColumn column={emptyColumn} />, { wrapper: TestWrapper });

    expect(screen.getByLabelText(/no tasks/i)).toBeInTheDocument();
    expect(screen.getByText(/no tasks/i)).toBeInTheDocument();
  });

  it('should handle task click', async () => {
    const user = userEvent.setup();
    const onTaskClick = vi.fn();

    render(
      <KanbanColumn column={mockColumn} onTaskClick={onTaskClick} />,
      { wrapper: TestWrapper }
    );

    await user.click(screen.getByLabelText(/task: task 1/i));

    expect(onTaskClick).toHaveBeenCalledWith('task-1');
  });

  it('should show add task form when clicking add button', async () => {
    const user = userEvent.setup();

    render(<KanbanColumn column={mockColumn} />, { wrapper: TestWrapper });

    await user.click(screen.getByLabelText(/add task to to do/i));

    expect(screen.getByLabelText(/new task title/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter task title/i)).toBeInTheDocument();
  });

  it('should handle adding a new task', async () => {
    const user = userEvent.setup();
    const onAddTask = vi.fn();

    render(
      <KanbanColumn column={mockColumn} onAddTask={onAddTask} />,
      { wrapper: TestWrapper }
    );

    // Click add button
    await user.click(screen.getByLabelText(/add task to to do/i));

    // Type task title
    const input = screen.getByLabelText(/new task title/i);
    await user.type(input, 'New Task');

    // Click add
    await user.click(screen.getByRole('button', { name: /^add$/i }));

    expect(onAddTask).toHaveBeenCalledWith('col-todo');
  });

  it('should cancel adding a task', async () => {
    const user = userEvent.setup();
    const onAddTask = vi.fn();

    render(
      <KanbanColumn column={mockColumn} onAddTask={onAddTask} />,
      { wrapper: TestWrapper }
    );

    // Open add form
    await user.click(screen.getByLabelText(/add task to to do/i));

    // Type something
    await user.type(screen.getByLabelText(/new task title/i), 'New Task');

    // Cancel
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    // Form should be gone
    expect(screen.queryByLabelText(/new task title/i)).not.toBeInTheDocument();
    expect(onAddTask).not.toHaveBeenCalled();
  });

  it('should prevent adding empty tasks', async () => {
    const user = userEvent.setup();
    const onAddTask = vi.fn();

    render(
      <KanbanColumn column={mockColumn} onAddTask={onAddTask} />,
      { wrapper: TestWrapper }
    );

    await user.click(screen.getByLabelText(/add task to to do/i));
    
    // Try to add without typing anything
    await user.click(screen.getByRole('button', { name: /^add$/i }));

    expect(onAddTask).not.toHaveBeenCalled();
  });

  it('should handle drag start', async () => {
    const onDragStart = vi.fn();

    const { container } = render(
      <KanbanColumn column={mockColumn} onDragStart={onDragStart} />,
      { wrapper: TestWrapper }
    );

    const taskCard = container.querySelector('.task-card');
    expect(taskCard).toBeInTheDocument();

    // Simulate drag start
    const dragStartEvent = new Event('dragstart', { bubbles: true });
    taskCard?.dispatchEvent(dragStartEvent);

    expect(onDragStart).toHaveBeenCalled();
  });

  it('should be accessible', () => {
    render(<KanbanColumn column={mockColumn} />, { wrapper: TestWrapper });

    // Column should have region role
    expect(screen.getByRole('region', { name: /to do column/i })).toBeInTheDocument();

    // Task list should have list role
    expect(screen.getByRole('list')).toBeInTheDocument();

    // Tasks should have listitem role
    const taskItems = screen.getAllByRole('listitem');
    expect(taskItems).toHaveLength(2);

    // Buttons should have accessible labels
    expect(screen.getByLabelText(/add task to to do/i)).toBeInTheDocument();
  });

  it('should update task count dynamically', () => {
    const { rerender } = render(
      <KanbanColumn column={mockColumn} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByLabelText(/2 tasks/i)).toBeInTheDocument();

    const updatedColumn = {
      ...mockColumn,
      tasks: [...mockColumn.tasks, { id: 'task-3', title: 'Task 3', priority: 'low' }],
    };

    rerender(<KanbanColumn column={updatedColumn} />);

    expect(screen.getByLabelText(/3 tasks/i)).toBeInTheDocument();
  });

  it('should handle columns with many tasks', () => {
    const manyTasks = Array.from({ length: 50 }, (_, i) => ({
      id: `task-${i}`,
      title: `Task ${i}`,
      priority: 'medium',
    }));

    const columnWithManyTasks = {
      ...mockColumn,
      tasks: manyTasks,
    };

    render(<KanbanColumn column={columnWithManyTasks} />, { wrapper: TestWrapper });

    expect(screen.getByLabelText(/50 tasks/i)).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(50);
  });

  it('should apply correct CSS classes', () => {
    const { container } = render(
      <KanbanColumn column={mockColumn} />,
      { wrapper: TestWrapper }
    );

    expect(container.querySelector('.kanban-column')).toBeInTheDocument();
    expect(container.querySelector('.column-header')).toBeInTheDocument();
    expect(container.querySelector('.task-list')).toBeInTheDocument();
    expect(container.querySelector('.task-card')).toBeInTheDocument();
  });

  it('should focus input when opening add task form', async () => {
    const user = userEvent.setup();

    render(<KanbanColumn column={mockColumn} />, { wrapper: TestWrapper });

    await user.click(screen.getByLabelText(/add task to to do/i));

    const input = screen.getByLabelText(/new task title/i);
    expect(input).toHaveFocus();
  });
});

