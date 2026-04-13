/**
 * Task Detail Modal Tests
 * 
 * Tests task detail view and editing:
 * - Task information display
 * - Edit functionality
 * - Status updates
 * - Priority changes
 * - Assignment workflow
 * - Comments section
 * - Accessibility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

interface Task {
  id: string
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'done' | 'blocked'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignee?: {
    id: string
    name: string
    email: string
  }
  dueDate?: string
  tags?: string[]
  comments?: Array<{
    id: string
    author: string
    content: string
    createdAt: string
  }>
  createdAt: string
  updatedAt: string
}

interface TaskDetailModalProps {
  task: Task
  isOpen: boolean
  onClose: () => void
  onUpdate?: (taskId: string, updates: Partial<Task>) => void
  onDelete?: (taskId: string) => void
  canEdit?: boolean
}

function TaskDetailModal({
  task,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  canEdit = true,
}: TaskDetailModalProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editedTask, setEditedTask] = React.useState(task)
  const [newComment, setNewComment] = React.useState('')

  React.useEffect(() => {
    setEditedTask(task)
  }, [task])

  const handleSave = () => {
    onUpdate?.(task.id, editedTask)
    setIsEditing(false)
  }

  const handleAddComment = () => {
    if (newComment.trim()) {
      // In real implementation, this would call the API
      setNewComment('')
    }
  }

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-labelledby="task-modal-title"
      aria-modal="true"
      className="task-detail-modal"
    >
      <div className="modal-header">
        <h2 id="task-modal-title">
          {isEditing ? (
            <input
              type="text"
              value={editedTask.title}
              onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
              aria-label="Edit task title"
            />
          ) : (
            task.title
          )}
        </h2>
        
        <div className="modal-actions">
          {canEdit && !isEditing && (
            <button onClick={() => setIsEditing(true)} aria-label="Edit task">
              Edit
            </button>
          )}
          {isEditing && (
            <>
              <button onClick={handleSave} aria-label="Save changes">
                Save
              </button>
              <button onClick={() => setIsEditing(false)} aria-label="Cancel editing">
                Cancel
              </button>
            </>
          )}
          <button onClick={onClose} aria-label="Close modal">
            Close
          </button>
        </div>
      </div>

      <div className="modal-content">
        <div className="task-metadata">
          <div className="metadata-item">
            <label htmlFor="task-status">Status:</label>
            {isEditing ? (
              <select
                id="task-status"
                value={editedTask.status}
                onChange={(e) => setEditedTask({ ...editedTask, status: e.target.value as Task['status'] })}
                aria-label="Change status"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
                <option value="blocked">Blocked</option>
              </select>
            ) : (
              <span className={`status-badge status-${task.status}`}>
                {task.status.replace('_', ' ')}
              </span>
            )}
          </div>

          <div className="metadata-item">
            <label htmlFor="task-priority">Priority:</label>
            {isEditing ? (
              <select
                id="task-priority"
                value={editedTask.priority}
                onChange={(e) => setEditedTask({ ...editedTask, priority: e.target.value as Task['priority'] })}
                aria-label="Change priority"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            ) : (
              <span className={`priority-badge priority-${task.priority}`}>
                {task.priority}
              </span>
            )}
          </div>

          {task.assignee && (
            <div className="metadata-item">
              <label>Assigned to:</label>
              <span>{task.assignee.name}</span>
            </div>
          )}

          {task.dueDate && (
            <div className="metadata-item">
              <label>Due date:</label>
              <span>{new Date(task.dueDate).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        <div className="task-description">
          <h3>Description</h3>
          {isEditing ? (
            <textarea
              value={editedTask.description}
              onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
              aria-label="Edit description"
              rows={5}
            />
          ) : (
            <p>{task.description}</p>
          )}
        </div>

        {task.tags && task.tags.length > 0 && (
          <div className="task-tags">
            <h3>Tags</h3>
            <div className="tag-list" role="list">
              {task.tags.map((tag) => (
                <span key={tag} className="tag" role="listitem">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="task-comments">
          <h3>Comments ({task.comments?.length || 0})</h3>
          
          {canEdit && (
            <div className="add-comment">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                aria-label="New comment"
                rows={3}
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                aria-label="Add comment"
              >
                Add Comment
              </button>
            </div>
          )}

          <div className="comments-list" role="list">
            {task.comments?.map((comment) => (
              <div key={comment.id} className="comment" role="listitem">
                <div className="comment-header">
                  <strong>{comment.author}</strong>
                  <time dateTime={comment.createdAt}>
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </time>
                </div>
                <p className="comment-content">{comment.content}</p>
              </div>
            ))}
            {(!task.comments || task.comments.length === 0) && (
              <p className="no-comments">No comments yet</p>
            )}
          </div>
        </div>

        {canEdit && onDelete && (
          <div className="danger-zone">
            <button
              onClick={() => onDelete(task.id)}
              className="delete-button"
              aria-label="Delete task"
            >
              Delete Task
            </button>
          </div>
        )}
      </div>
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

describe('TaskDetailModal', () => {
  const mockTask: Task = {
    id: 'task-123',
    title: 'Implement user authentication',
    description: 'Add JWT-based authentication to the application',
    status: 'in_progress',
    priority: 'high',
    assignee: {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
    },
    dueDate: '2024-12-31',
    tags: ['backend', 'security'],
    comments: [
      {
        id: 'comment-1',
        author: 'Jane Smith',
        content: 'This looks good so far',
        createdAt: '2024-01-01T10:00:00Z',
      },
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render task title and description', () => {
    render(
      <TaskDetailModal task={mockTask} isOpen={true} onClose={vi.fn()} />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByText('Implement user authentication')).toBeInTheDocument()
    expect(screen.getByText('Add JWT-based authentication to the application')).toBeInTheDocument()
  })

  it('should display task status', () => {
    render(
      <TaskDetailModal task={mockTask} isOpen={true} onClose={vi.fn()} />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByText(/in progress/i)).toBeInTheDocument()
  })

  it('should display task priority', () => {
    render(
      <TaskDetailModal task={mockTask} isOpen={true} onClose={vi.fn()} />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByText('high')).toBeInTheDocument()
  })

  it('should show assignee information', () => {
    render(
      <TaskDetailModal task={mockTask} isOpen={true} onClose={vi.fn()} />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('should display due date', () => {
    render(
      <TaskDetailModal task={mockTask} isOpen={true} onClose={vi.fn()} />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByText(/12\/31\/2024/)).toBeInTheDocument()
  })

  it('should show all tags', () => {
    render(
      <TaskDetailModal task={mockTask} isOpen={true} onClose={vi.fn()} />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByText('backend')).toBeInTheDocument()
    expect(screen.getByText('security')).toBeInTheDocument()
  })

  it('should display comments count', () => {
    render(
      <TaskDetailModal task={mockTask} isOpen={true} onClose={vi.fn()} />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByText(/comments \(1\)/i)).toBeInTheDocument()
  })

  it('should show existing comments', () => {
    render(
      <TaskDetailModal task={mockTask} isOpen={true} onClose={vi.fn()} />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('This looks good so far')).toBeInTheDocument()
  })

  it('should handle close action', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <TaskDetailModal task={mockTask} isOpen={true} onClose={onClose} />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByRole('button', { name: /close modal/i }))

    expect(onClose).toHaveBeenCalled()
  })

  it('should enter edit mode when clicking edit button', async () => {
    const user = userEvent.setup()

    render(
      <TaskDetailModal task={mockTask} isOpen={true} onClose={vi.fn()} />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByRole('button', { name: /edit task/i }))

    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel editing/i })).toBeInTheDocument()
  })

  it('should allow editing task title', async () => {
    const user = userEvent.setup()

    render(
      <TaskDetailModal task={mockTask} isOpen={true} onClose={vi.fn()} />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByRole('button', { name: /edit task/i }))

    const titleInput = screen.getByLabelText(/edit task title/i)
    await user.clear(titleInput)
    await user.type(titleInput, 'Updated title')

    expect(titleInput).toHaveValue('Updated title')
  })

  it('should allow changing task status', async () => {
    const user = userEvent.setup()

    render(
      <TaskDetailModal task={mockTask} isOpen={true} onClose={vi.fn()} />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByRole('button', { name: /edit task/i }))

    const statusSelect = screen.getByLabelText(/change status/i)
    await user.selectOptions(statusSelect, 'done')

    expect(statusSelect).toHaveValue('done')
  })

  it('should allow changing task priority', async () => {
    const user = userEvent.setup()

    render(
      <TaskDetailModal task={mockTask} isOpen={true} onClose={vi.fn()} />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByRole('button', { name: /edit task/i }))

    const prioritySelect = screen.getByLabelText(/change priority/i)
    await user.selectOptions(prioritySelect, 'urgent')

    expect(prioritySelect).toHaveValue('urgent')
  })

  it('should save changes when clicking save', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()

    render(
      <TaskDetailModal task={mockTask} isOpen={true} onClose={vi.fn()} onUpdate={onUpdate} />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByRole('button', { name: /edit task/i }))

    const titleInput = screen.getByLabelText(/edit task title/i)
    await user.clear(titleInput)
    await user.type(titleInput, 'Updated title')

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(onUpdate).toHaveBeenCalledWith('task-123', expect.objectContaining({
      title: 'Updated title',
    }))
  })

  it('should cancel editing without saving', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()

    render(
      <TaskDetailModal task={mockTask} isOpen={true} onClose={vi.fn()} onUpdate={onUpdate} />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByRole('button', { name: /edit task/i }))

    const titleInput = screen.getByLabelText(/edit task title/i)
    await user.clear(titleInput)
    await user.type(titleInput, 'Changed title')

    await user.click(screen.getByRole('button', { name: /cancel editing/i }))

    expect(onUpdate).not.toHaveBeenCalled()
    expect(screen.queryByLabelText(/edit task title/i)).not.toBeInTheDocument()
  })

  it('should allow adding comments when user can edit', async () => {
    const user = userEvent.setup()

    render(
      <TaskDetailModal task={mockTask} isOpen={true} onClose={vi.fn()} canEdit={true} />,
      { wrapper: TestWrapper }
    )

    const commentInput = screen.getByLabelText(/new comment/i)
    await user.type(commentInput, 'This is a new comment')

    expect(commentInput).toHaveValue('This is a new comment')
  })

  it('should disable add comment button when comment is empty', () => {
    render(
      <TaskDetailModal task={mockTask} isOpen={true} onClose={vi.fn()} />,
      { wrapper: TestWrapper }
    )

    const addButton = screen.getByRole('button', { name: /add comment/i })
    expect(addButton).toBeDisabled()
  })

  it('should handle deleting task', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()

    render(
      <TaskDetailModal task={mockTask} isOpen={true} onClose={vi.fn()} onDelete={onDelete} />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByRole('button', { name: /delete task/i }))

    expect(onDelete).toHaveBeenCalledWith('task-123')
  })

  it('should not render when modal is closed', () => {
    const { container } = render(
      <TaskDetailModal task={mockTask} isOpen={false} onClose={vi.fn()} />,
      { wrapper: TestWrapper }
    )

    expect(container.querySelector('.task-detail-modal')).not.toBeInTheDocument()
  })

  it('should be accessible', () => {
    render(
      <TaskDetailModal task={mockTask} isOpen={true} onClose={vi.fn()} />,
      { wrapper: TestWrapper }
    )

    // Modal should have proper dialog role
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    // Should have proper ARIA labels
    expect(screen.getByLabelText(/close modal/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/edit task/i)).toBeInTheDocument()

    // Lists should be accessible (tags and comments)
    const lists = screen.getAllByRole('list')
    expect(lists).toHaveLength(2) // tags list + comments list
  })
})

