/**
 * Comment Thread Tests
 * 
 * Tests comment thread functionality:
 * - Comment display
 * - Add comments
 * - Edit comments
 * - Delete comments
 * - Reply to comments
 * - Mentions
 * - Reactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

interface Comment {
  id: string
  author: {
    id: string
    name: string
    avatar?: string
  }
  content: string
  createdAt: string
  updatedAt?: string
  replies?: Comment[]
  reactions?: Record<string, number>
  isEdited?: boolean
}

interface CommentThreadProps {
  comments?: Comment[]
  currentUserId?: string
  onAdd?: (content: string, parentId?: string) => Promise<void>
  onEdit?: (commentId: string, content: string) => Promise<void>
  onDelete?: (commentId: string) => Promise<void>
  onReact?: (commentId: string, reaction: string) => void
  canEdit?: boolean
  canDelete?: boolean
}

function CommentThread({
  comments = [],
  currentUserId,
  onAdd,
  onEdit,
  onDelete,
  onReact,
  canEdit = true,
  canDelete = true,
}: CommentThreadProps) {
  const [newComment, setNewComment] = React.useState('')
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editContent, setEditContent] = React.useState('')
  const [replyingToId, setReplyingToId] = React.useState<string | null>(null)
  const [replyContent, setReplyContent] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    setIsSubmitting(true)
    try {
      await onAdd?.(newComment)
      setNewComment('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) return

    setIsSubmitting(true)
    try {
      await onEdit?.(commentId, editContent)
      setEditingId(null)
      setEditContent('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Delete this comment?')) return

    setIsSubmitting(true)
    try {
      await onDelete?.(commentId)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddReply = async (parentId: string) => {
    if (!replyContent.trim()) return

    setIsSubmitting(true)
    try {
      await onAdd?.(replyContent, parentId)
      setReplyingToId(null)
      setReplyContent('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderComment = (comment: Comment, depth = 0) => {
    const isOwner = currentUserId === comment.author.id
    const isEditing = editingId === comment.id
    const isReplying = replyingToId === comment.id

    return (
      <div
        key={comment.id}
        className={`comment depth-${depth}`}
        data-comment-id={comment.id}
        role="article"
      >
        <div className="comment-header">
          {comment.author.avatar && (
            <img src={comment.author.avatar} alt={`${comment.author.name}'s avatar`} />
          )}
          <strong>{comment.author.name}</strong>
          <time dateTime={comment.createdAt}>
            {new Date(comment.createdAt).toLocaleString()}
          </time>
          {comment.isEdited && <span className="edited-badge">(edited)</span>}
        </div>

        <div className="comment-content">
          {isEditing ? (
            <div className="edit-form">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                aria-label="Edit comment"
                disabled={isSubmitting}
              />
              <button
                onClick={() => handleEditComment(comment.id)}
                disabled={isSubmitting || !editContent.trim()}
                aria-label="Save edit"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditingId(null)
                  setEditContent('')
                }}
                disabled={isSubmitting}
                aria-label="Cancel edit"
              >
                Cancel
              </button>
            </div>
          ) : (
            <p>{comment.content}</p>
          )}
        </div>

        <div className="comment-actions">
          <button
            onClick={() => {
              setReplyingToId(comment.id)
              setReplyContent('')
            }}
            disabled={isSubmitting}
            aria-label={`Reply to ${comment.author.name}`}
          >
            Reply
          </button>

          {isOwner && canEdit && !isEditing && (
            <button
              onClick={() => {
                setEditingId(comment.id)
                setEditContent(comment.content)
              }}
              disabled={isSubmitting}
              aria-label="Edit comment"
            >
              Edit
            </button>
          )}

          {isOwner && canDelete && (
            <button
              onClick={() => handleDeleteComment(comment.id)}
              disabled={isSubmitting}
              aria-label="Delete comment"
              className="delete-button"
            >
              Delete
            </button>
          )}

          {comment.reactions && Object.keys(comment.reactions).length > 0 && (
            <div className="reactions" role="group" aria-label="Reactions">
              {Object.entries(comment.reactions).map(([emoji, count]) => (
                <button
                  key={emoji}
                  onClick={() => onReact?.(comment.id, emoji)}
                  className="reaction"
                  aria-label={`React with ${emoji}`}
                >
                  {emoji} {count}
                </button>
              ))}
            </div>
          )}
        </div>

        {isReplying && (
          <div className="reply-form">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply..."
              aria-label="Reply content"
              disabled={isSubmitting}
            />
            <button
              onClick={() => handleAddReply(comment.id)}
              disabled={isSubmitting || !replyContent.trim()}
              aria-label="Submit reply"
            >
              Reply
            </button>
            <button
              onClick={() => {
                setReplyingToId(null)
                setReplyContent('')
              }}
              disabled={isSubmitting}
              aria-label="Cancel reply"
            >
              Cancel
            </button>
          </div>
        )}

        {comment.replies && comment.replies.length > 0 && (
          <div className="replies">
            {comment.replies.map(reply => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="comment-thread" data-testid="comment-thread">
      <h2>Comments ({comments.length})</h2>

      <div className="add-comment">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          aria-label="New comment"
          disabled={isSubmitting}
        />
        <button
          onClick={handleAddComment}
          disabled={isSubmitting || !newComment.trim()}
          aria-label="Submit comment"
        >
          {isSubmitting ? 'Posting...' : 'Post'}
        </button>
      </div>

      <div className="comments-list">
        {comments.map(comment => renderComment(comment))}
        {comments.length === 0 && (
          <p className="no-comments">No comments yet. Be the first to comment!</p>
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

describe('CommentThread', () => {
  const mockComments: Comment[] = [
    {
      id: 'comment-1',
      author: { id: 'user-1', name: 'John Doe' },
      content: 'This is a great feature!',
      createdAt: '2024-01-01T10:00:00Z',
      reactions: { '👍': 5, '❤️': 2 },
    },
    {
      id: 'comment-2',
      author: { id: 'user-2', name: 'Jane Smith' },
      content: 'I agree with John',
      createdAt: '2024-01-01T11:00:00Z',
      isEdited: true,
      replies: [
        {
          id: 'reply-1',
          author: { id: 'user-1', name: 'John Doe' },
          content: 'Thanks Jane!',
          createdAt: '2024-01-01T12:00:00Z',
        },
      ],
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    global.confirm = vi.fn(() => true)
  })

  it('should render comment thread', () => {
    render(<CommentThread comments={mockComments} />, { wrapper: TestWrapper })

    expect(screen.getByTestId('comment-thread')).toBeInTheDocument()
    expect(screen.getByText('Comments (2)')).toBeInTheDocument()
  })

  it('should display all comments', () => {
    render(<CommentThread comments={mockComments} />, { wrapper: TestWrapper })

    expect(screen.getByText('This is a great feature!')).toBeInTheDocument()
    expect(screen.getByText('I agree with John')).toBeInTheDocument()
  })

  it('should show comment author', () => {
    render(<CommentThread comments={mockComments} />, { wrapper: TestWrapper })

    expect(screen.getAllByText('John Doe')[0]).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
  })

  it('should handle adding a new comment', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn().mockResolvedValue(undefined)

    render(<CommentThread comments={[]} onAdd={onAdd} />, { wrapper: TestWrapper })

    await user.type(screen.getByLabelText('New comment'), 'This is my comment')
    await user.click(screen.getByLabelText('Submit comment'))

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith('This is my comment')
    })
  })

  it('should disable submit when comment is empty', () => {
    render(<CommentThread />, { wrapper: TestWrapper })

    expect(screen.getByLabelText('Submit comment')).toBeDisabled()
  })

  it('should clear input after posting', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn().mockResolvedValue(undefined)

    render(<CommentThread onAdd={onAdd} />, { wrapper: TestWrapper })

    const input = screen.getByLabelText('New comment')
    await user.type(input, 'Test comment')
    await user.click(screen.getByLabelText('Submit comment'))

    await waitFor(() => {
      expect(input).toHaveValue('')
    })
  })

  it('should show edit button for comment owner', () => {
    render(
      <CommentThread comments={mockComments} currentUserId="user-1" />,
      { wrapper: TestWrapper }
    )

    const editButtons = screen.getAllByLabelText('Edit comment')
    expect(editButtons.length).toBeGreaterThan(0)
  })

  it('should not show edit button for other users', () => {
    render(
      <CommentThread comments={mockComments} currentUserId="user-999" />,
      { wrapper: TestWrapper }
    )

    expect(screen.queryByLabelText('Edit comment')).not.toBeInTheDocument()
  })

  it('should handle editing a comment', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn().mockResolvedValue(undefined)

    render(
      <CommentThread comments={mockComments} currentUserId="user-1" onEdit={onEdit} />,
      { wrapper: TestWrapper }
    )

    const editButtons = screen.getAllByRole('button', { name: 'Edit comment' })
    await user.click(editButtons[0])

    // After clicking edit, the textarea appears
    const editTextarea = screen.getByRole('textbox', { name: 'Edit comment' })
    await user.clear(editTextarea)
    await user.type(editTextarea, 'Updated comment')
    await user.click(screen.getByLabelText('Save edit'))

    await waitFor(() => {
      expect(onEdit).toHaveBeenCalledWith('comment-1', 'Updated comment')
    })
  })

  it('should cancel editing', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()

    render(
      <CommentThread comments={mockComments} currentUserId="user-1" onEdit={onEdit} />,
      { wrapper: TestWrapper }
    )

    const editButtons = screen.getAllByLabelText('Edit comment')
    await user.click(editButtons[0])
    await user.click(screen.getByLabelText('Cancel edit'))

    expect(onEdit).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('Save edit')).not.toBeInTheDocument()
  })

  it('should handle deleting a comment', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn().mockResolvedValue(undefined)

    render(
      <CommentThread comments={mockComments} currentUserId="user-1" onDelete={onDelete} />,
      { wrapper: TestWrapper }
    )

    const deleteButtons = screen.getAllByLabelText('Delete comment')
    await user.click(deleteButtons[0])

    expect(onDelete).toHaveBeenCalledWith('comment-1')
  })

  it('should show reply button', () => {
    render(<CommentThread comments={mockComments} />, { wrapper: TestWrapper })

    const replyButtons = screen.getAllByLabelText(/reply to john doe/i)
    expect(replyButtons.length).toBeGreaterThan(0)
  })

  it('should handle replying to a comment', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn().mockResolvedValue(undefined)

    render(<CommentThread comments={mockComments} onAdd={onAdd} />, { wrapper: TestWrapper })

    const replyButtons = screen.getAllByLabelText(/reply to john doe/i)
    await user.click(replyButtons[0])

    const replyInput = screen.getByLabelText('Reply content')
    await user.type(replyInput, 'This is my reply')
    await user.click(screen.getByLabelText('Submit reply'))

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith('This is my reply', 'comment-1')
    })
  })

  it('should cancel replying', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()

    render(<CommentThread comments={mockComments} onAdd={onAdd} />, { wrapper: TestWrapper })

    const replyButtons = screen.getAllByLabelText(/reply to john doe/i)
    await user.click(replyButtons[0])
    await user.click(screen.getByLabelText('Cancel reply'))

    expect(onAdd).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('Reply content')).not.toBeInTheDocument()
  })

  it('should display nested replies', () => {
    render(<CommentThread comments={mockComments} />, { wrapper: TestWrapper })

    expect(screen.getByText('Thanks Jane!')).toBeInTheDocument()
  })

  it('should show edited badge', () => {
    render(<CommentThread comments={mockComments} />, { wrapper: TestWrapper })

    expect(screen.getByText('(edited)')).toBeInTheDocument()
  })

  it('should display reactions', () => {
    render(<CommentThread comments={mockComments} />, { wrapper: TestWrapper })

    expect(screen.getByText('👍 5')).toBeInTheDocument()
    expect(screen.getByText('❤️ 2')).toBeInTheDocument()
  })

  it('should handle reaction clicks', async () => {
    const user = userEvent.setup()
    const onReact = vi.fn()

    render(<CommentThread comments={mockComments} onReact={onReact} />, { wrapper: TestWrapper })

    await user.click(screen.getByLabelText(/react with 👍/i))

    expect(onReact).toHaveBeenCalledWith('comment-1', '👍')
  })

  it('should show empty state when no comments', () => {
    render(<CommentThread comments={[]} />, { wrapper: TestWrapper })

    expect(screen.getByText(/no comments yet/i)).toBeInTheDocument()
  })

  it('should disable inputs while submitting', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(<CommentThread onAdd={onAdd} />, { wrapper: TestWrapper })

    const input = screen.getByLabelText('New comment')
    await user.type(input, 'Test')

    const submitButton = screen.getByLabelText('Submit comment')
    await user.click(submitButton)

    expect(input).toBeDisabled()
    expect(submitButton).toHaveTextContent('Posting...')
  })
})

