import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../../test/utils'
import EditMessageModal from '../edit-message-modal'
import * as useMessagesModule from '../../../hooks/use-messages'

// Mock the hooks
vi.mock('../../../hooks/use-messages', () => ({
  useEditMessage: vi.fn(),
}))

const mockMessage = {
  id: 'msg-1',
  content: 'Original message content',
  userEmail: 'user@example.com',
  userName: 'Test User',
  createdAt: new Date('2024-01-01T10:00:00Z'),
  isEdited: false,
}

const mockEditMessageMutation = {
  mutateAsync: vi.fn(),
  isPending: false,
}

describe('EditMessageModal', () => {
  beforeEach(() => {
    vi.mocked(useMessagesModule.useEditMessage).mockReturnValue(mockEditMessageMutation)
  })

  it('renders correctly when open', () => {
    render(
      <EditMessageModal
        isOpen={true}
        onClose={vi.fn()}
        message={mockMessage}
      />
    )

    expect(screen.getByText('Edit Message')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Original message content')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <EditMessageModal
        isOpen={false}
        onClose={vi.fn()}
        message={mockMessage}
      />
    )

    expect(screen.queryByText('Edit Message')).not.toBeInTheDocument()
  })

  it('shows character count', () => {
    render(
      <EditMessageModal
        isOpen={true}
        onClose={vi.fn()}
        message={mockMessage}
      />
    )

    expect(screen.getByText('24/4000 characters')).toBeInTheDocument()
  })

  it('detects changes and enables save button', async () => {
    const user = userEvent.setup()
    
    render(
      <EditMessageModal
        isOpen={true}
        onClose={vi.fn()}
        message={mockMessage}
      />
    )

    const textarea = screen.getByDisplayValue('Original message content')
    const saveButton = screen.getByRole('button', { name: /save changes/i })

    // Initially disabled (no changes)
    expect(saveButton).toBeDisabled()

    // Make changes
    await user.clear(textarea)
    await user.type(textarea, 'Modified message content')

    // Should be enabled now
    expect(saveButton).toBeEnabled()
    expect(screen.getByText('• Unsaved changes')).toBeInTheDocument()
  })

  it('calls edit mutation on save', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <EditMessageModal
        isOpen={true}
        onClose={onClose}
        message={mockMessage}
      />
    )

    const textarea = screen.getByDisplayValue('Original message content')
    const saveButton = screen.getByRole('button', { name: /save changes/i })

    // Modify content
    await user.clear(textarea)
    await user.type(textarea, 'Modified content')

    // Click save
    await user.click(saveButton)

    expect(mockEditMessageMutation.mutateAsync).toHaveBeenCalledWith({
      messageId: 'msg-1',
      content: 'Modified content'
    })
  })

  it('handles keyboard shortcuts', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <EditMessageModal
        isOpen={true}
        onClose={onClose}
        message={mockMessage}
      />
    )

    const textarea = screen.getByDisplayValue('Original message content')

    // Test Ctrl+Enter to save
    await user.clear(textarea)
    await user.type(textarea, 'New content')
    await user.keyboard('{Control>}{Enter}{/Control}')

    expect(mockEditMessageMutation.mutateAsync).toHaveBeenCalled()

    // Test Escape to cancel
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('shows edited badge for already edited messages', () => {
    const editedMessage = {
      ...mockMessage,
      isEdited: true,
      editedAt: new Date('2024-01-01T11:00:00Z'),
    }

    render(
      <EditMessageModal
        isOpen={true}
        onClose={vi.fn()}
        message={editedMessage}
      />
    )

    expect(screen.getByText(/edited/)).toBeInTheDocument()
  })

  it('trims whitespace on save', async () => {
    const user = userEvent.setup()

    render(
      <EditMessageModal
        isOpen={true}
        onClose={vi.fn()}
        message={mockMessage}
      />
    )

    const textarea = screen.getByDisplayValue('Original message content')
    const saveButton = screen.getByRole('button', { name: /save changes/i })

    // Add content with whitespace
    await user.clear(textarea)
    await user.type(textarea, '  Trimmed content  ')
    await user.click(saveButton)

    expect(mockEditMessageMutation.mutateAsync).toHaveBeenCalledWith({
      messageId: 'msg-1',
      content: 'Trimmed content'
    })
  })

  it('disables save button for empty content', async () => {
    const user = userEvent.setup()

    render(
      <EditMessageModal
        isOpen={true}
        onClose={vi.fn()}
        message={mockMessage}
      />
    )

    const textarea = screen.getByDisplayValue('Original message content')
    const saveButton = screen.getByRole('button', { name: /save changes/i })

    // Clear content
    await user.clear(textarea)

    expect(saveButton).toBeDisabled()
  })

  it('shows loading state during save', () => {
    const pendingMutation = {
      ...mockEditMessageMutation,
      isPending: true,
    }
    
    vi.mocked(useMessagesModule.useEditMessage).mockReturnValue(pendingMutation)

    render(
      <EditMessageModal
        isOpen={true}
        onClose={vi.fn()}
        message={mockMessage}
      />
    )

    expect(screen.getByText('Saving...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
  })
})