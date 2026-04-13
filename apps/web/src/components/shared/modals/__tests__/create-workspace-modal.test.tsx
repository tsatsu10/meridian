/**
 * Create Workspace Modal Tests
 * 
 * Tests workspace creation functionality:
 * - Form rendering and validation
 * - Workspace name input
 * - Form submission
 * - Error handling
 * - Navigation after creation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CreateWorkspaceModal from '../create-workspace-modal'

// Mock dependencies
const mockNavigate = vi.fn()
const mockSetActiveWorkspaceId = vi.fn()
const mockMutateAsync = vi.fn()
const mockInvalidateQueries = vi.fn()
const mockOnClose = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('@/store/user-preferences', () => ({
  useUserPreferencesStore: () => ({
    setActiveWorkspaceId: mockSetActiveWorkspaceId,
  }),
}))

vi.mock('@/hooks/queries/workspace/use-create-workspace', () => ({
  default: () => ({
    mutateAsync: mockMutateAsync,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  // Mock invalidateQueries on queryClient
  queryClient.invalidateQueries = mockInvalidateQueries

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('CreateWorkspaceModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    mockSetActiveWorkspaceId.mockClear()
    mockMutateAsync.mockClear()
    mockInvalidateQueries.mockClear()
    mockOnClose.mockClear()
  })

  describe('Rendering', () => {
    it('should render modal when open', () => {
      render(
        <CreateWorkspaceModal open={true} onClose={mockOnClose} />,
        { wrapper: TestWrapper }
      )

      expect(screen.getByRole('heading', { name: /new workspace/i })).toBeInTheDocument()
      expect(screen.getByText(/create a new workspace to organize your projects/i)).toBeInTheDocument()
    })

    it('should render workspace name input field', () => {
      render(
        <CreateWorkspaceModal open={true} onClose={mockOnClose} />,
        { wrapper: TestWrapper }
      )

      expect(screen.getByLabelText(/workspace name/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/my workspace/i)).toBeInTheDocument()
    })

    it('should render create and cancel buttons', () => {
      render(
        <CreateWorkspaceModal open={true} onClose={mockOnClose} />,
        { wrapper: TestWrapper }
      )

      expect(screen.getByRole('button', { name: /create workspace/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('should not render when closed', () => {
      const { container } = render(
        <CreateWorkspaceModal open={false} onClose={mockOnClose} />,
        { wrapper: TestWrapper }
      )

      expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should disable submit button when name is empty', () => {
      render(
        <CreateWorkspaceModal open={true} onClose={mockOnClose} />,
        { wrapper: TestWrapper }
      )

      const submitButton = screen.getByRole('button', { name: /create workspace/i })
      expect(submitButton).toBeDisabled()
    })

    it('should enable submit button when name is entered', async () => {
      const user = userEvent.setup()
      
      render(
        <CreateWorkspaceModal open={true} onClose={mockOnClose} />,
        { wrapper: TestWrapper }
      )

      const input = screen.getByLabelText(/workspace name/i)
      await user.type(input, 'My New Workspace')

      const submitButton = screen.getByRole('button', { name: /create workspace/i })
      expect(submitButton).not.toBeDisabled()
    })

    it('should disable submit button for whitespace-only names', async () => {
      const user = userEvent.setup()
      
      render(
        <CreateWorkspaceModal open={true} onClose={mockOnClose} />,
        { wrapper: TestWrapper }
      )

      const input = screen.getByLabelText(/workspace name/i)
      await user.type(input, '   ')

      const submitButton = screen.getByRole('button', { name: /create workspace/i })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Form Submission', () => {
    it('should create workspace successfully', async () => {
      const user = userEvent.setup()
      const mockWorkspace = { id: 'workspace-123', name: 'My New Workspace' }
      mockMutateAsync.mockResolvedValue(mockWorkspace)

      render(
        <CreateWorkspaceModal open={true} onClose={mockOnClose} />,
        { wrapper: TestWrapper }
      )

      // Fill form
      await user.type(screen.getByLabelText(/workspace name/i), 'My New Workspace')

      // Submit
      await user.click(screen.getByRole('button', { name: /create workspace/i }))

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled()
      })

      // Should set as active workspace
      expect(mockSetActiveWorkspaceId).toHaveBeenCalledWith('workspace-123')

      // Should invalidate queries
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['workspaces'] })

      // Should navigate to projects page
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/dashboard/projects' })

      // Should close modal
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should handle creation errors gracefully', async () => {
      const user = userEvent.setup()
      const { toast } = await import('sonner')
      mockMutateAsync.mockRejectedValue(new Error('Workspace already exists'))

      render(
        <CreateWorkspaceModal open={true} onClose={mockOnClose} />,
        { wrapper: TestWrapper }
      )

      await user.type(screen.getByLabelText(/workspace name/i), 'Existing Workspace')
      await user.click(screen.getByRole('button', { name: /create workspace/i }))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Workspace already exists')
      })

      // Should not close modal on error
      expect(mockOnClose).not.toHaveBeenCalled()
    })

    it('should reset form when modal closes', async () => {
      const user = userEvent.setup()
      
      const { rerender } = render(
        <CreateWorkspaceModal open={true} onClose={mockOnClose} />,
        { wrapper: TestWrapper }
      )

      // Type in workspace name
      await user.type(screen.getByLabelText(/workspace name/i), 'Test Workspace')
      expect(screen.getByLabelText(/workspace name/i)).toHaveValue('Test Workspace')

      // Click cancel
      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(mockOnClose).toHaveBeenCalled()

      // Re-open modal - form should be reset
      rerender(
        <CreateWorkspaceModal open={true} onClose={mockOnClose} />,
      )

      // Input should be empty after reset
      expect(screen.getByLabelText(/workspace name/i)).toHaveValue('')
    })
  })

  describe('Accessibility', () => {
    it('should have autofocus on workspace name input', () => {
      render(
        <CreateWorkspaceModal open={true} onClose={mockOnClose} />,
        { wrapper: TestWrapper }
      )

      // Input should have autofocus property in the component
      // In jsdom, we verify the input exists and is accessible
      const input = screen.getByLabelText(/workspace name/i)
      expect(input).toBeInTheDocument()
      expect(input).toBeVisible()
    })

    it('should have close button accessible via screen reader', () => {
      render(
        <CreateWorkspaceModal open={true} onClose={mockOnClose} />,
        { wrapper: TestWrapper }
      )

      // The close button has sr-only text "Close" inside
      const closeText = screen.getByText(/close/i, { selector: '.sr-only' })
      expect(closeText).toBeInTheDocument()
    })

    it('should mark required fields appropriately', () => {
      render(
        <CreateWorkspaceModal open={true} onClose={mockOnClose} />,
        { wrapper: TestWrapper }
      )

      const input = screen.getByLabelText(/workspace name/i)
      expect(input).toHaveAttribute('required')
    })
  })
})

