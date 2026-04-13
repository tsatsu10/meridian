import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SignUpForm } from '../sign-up-form'

// Mock dependencies
const mockPush = vi.fn()
const mockSetUser = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({
    history: { push: mockPush }
  }),
}))

vi.mock('../../providers/auth-provider/hooks/use-auth', () => ({
  default: () => ({
    setUser: mockSetUser
  })
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockSignUp = vi.fn()
vi.mock('@/hooks/mutations/use-sign-up', () => ({
  default: () => ({
    mutateAsync: mockSignUp,
    isPending: false,
  }),
}))

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

describe('SignUpForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPush.mockClear()
    mockSetUser.mockClear()
    mockSignUp.mockClear()
  })

  describe('Rendering', () => {
    it('should render all form fields', () => {
      render(<SignUpForm />, { wrapper: TestWrapper })

      expect(screen.getByPlaceholderText(/enter your full name/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/create a password/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/confirm your password/i)).toBeInTheDocument()
    })

    it('should render social login buttons', () => {
      render(<SignUpForm />, { wrapper: TestWrapper })

      expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /apple/i })).toBeInTheDocument()
    })

    it('should render terms checkbox', () => {
      render(<SignUpForm />, { wrapper: TestWrapper })

      const termsCheckbox = screen.getByRole('checkbox', { name: /terms/i })
      expect(termsCheckbox).toBeInTheDocument()
      expect(termsCheckbox).toHaveAttribute('required')
    })
  })

  describe('Validation', () => {
    it('should show error for empty name field', async () => {
      render(<SignUpForm />, { wrapper: TestWrapper })

      // Fill other required fields but leave name empty
      const emailInput = screen.getByPlaceholderText(/enter your email/i)
      const passwordInput = screen.getByPlaceholderText(/create a password/i)
      const confirmInput = screen.getByPlaceholderText(/confirm your password/i)
      const termsCheckbox = screen.getByRole('checkbox', { name: /terms/i })

      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.type(passwordInput, 'password123')
      await userEvent.type(confirmInput, 'password123')
      await userEvent.click(termsCheckbox)

      const submitButton = screen.getByRole('button', { name: /sign up/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument()
      })
    })

    it('should show error for invalid email format', async () => {
      render(<SignUpForm />, { wrapper: TestWrapper })

      // Fill required fields to allow form submission
      const nameInput = screen.getByPlaceholderText(/enter your full name/i)
      const emailInput = screen.getByPlaceholderText(/enter your email/i)
      const passwordInput = screen.getByPlaceholderText(/create a password/i)
      const confirmInput = screen.getByPlaceholderText(/confirm your password/i)
      const termsCheckbox = screen.getByRole('checkbox', { name: /terms/i })

      await userEvent.type(nameInput, 'Test User')
      await userEvent.type(emailInput, 'invalid-email')
      await userEvent.type(passwordInput, 'password123')
      await userEvent.type(confirmInput, 'password123')
      await userEvent.click(termsCheckbox)
      
      // Submit form to trigger validation
      const submitButton = screen.getByRole('button', { name: /sign up/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
      })
    })

    it('should show error for password less than 8 characters', async () => {
      render(<SignUpForm />, { wrapper: TestWrapper })

      // Fill required fields to allow form submission
      const nameInput = screen.getByPlaceholderText(/enter your full name/i)
      const emailInput = screen.getByPlaceholderText(/enter your email/i)
      const passwordInput = screen.getByPlaceholderText(/create a password/i)
      const confirmInput = screen.getByPlaceholderText(/confirm your password/i)
      const termsCheckbox = screen.getByRole('checkbox', { name: /terms/i })

      await userEvent.type(nameInput, 'Test User')
      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.type(passwordInput, 'short')
      await userEvent.type(confirmInput, 'short')
      await userEvent.click(termsCheckbox)
      
      // Submit form to trigger validation
      const submitButton = screen.getByRole('button', { name: /sign up/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
      })
    })

    it('should show error when passwords do not match', async () => {
      render(<SignUpForm />, { wrapper: TestWrapper })

      // Fill required fields to allow form submission
      const nameInput = screen.getByPlaceholderText(/enter your full name/i)
      const emailInput = screen.getByPlaceholderText(/enter your email/i)
      const passwordInput = screen.getByPlaceholderText(/create a password/i)
      const confirmInput = screen.getByPlaceholderText(/confirm your password/i)
      const termsCheckbox = screen.getByRole('checkbox', { name: /terms/i })

      await userEvent.type(nameInput, 'Test User')
      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.type(passwordInput, 'password123')
      await userEvent.type(confirmInput, 'password456')
      await userEvent.click(termsCheckbox)
      
      // Submit form to trigger validation
      const submitButton = screen.getByRole('button', { name: /sign up/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument()
      })
    })
  })

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility', async () => {
      render(<SignUpForm />, { wrapper: TestWrapper })

      const passwordInput = screen.getByPlaceholderText(/create a password/i)
      expect(passwordInput).toHaveAttribute('type', 'password')

      // Find and click the eye icon button
      const toggleButtons = screen.getAllByRole('button', { name: '' })
      const passwordToggle = toggleButtons[0] // First toggle is for password
      
      await userEvent.click(passwordToggle)
      expect(passwordInput).toHaveAttribute('type', 'text')

      await userEvent.click(passwordToggle)
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('should toggle confirm password visibility independently', async () => {
      render(<SignUpForm />, { wrapper: TestWrapper })

      const confirmInput = screen.getByPlaceholderText(/confirm your password/i)
      expect(confirmInput).toHaveAttribute('type', 'password')

      const toggleButtons = screen.getAllByRole('button', { name: '' })
      const confirmToggle = toggleButtons[1] // Second toggle is for confirm password
      
      await userEvent.click(confirmToggle)
      expect(confirmInput).toHaveAttribute('type', 'text')
    })
  })

  describe('Form Submission', () => {
    it('should successfully submit form with valid data', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com', name: 'Test User' }
      mockSignUp.mockResolvedValue(mockUser)

      render(<SignUpForm />, { wrapper: TestWrapper })

      // Fill form
      await userEvent.type(screen.getByPlaceholderText(/enter your full name/i), 'Test User')
      await userEvent.type(screen.getByPlaceholderText(/enter your email/i), 'test@example.com')
      await userEvent.type(screen.getByPlaceholderText(/create a password/i), 'password123')
      await userEvent.type(screen.getByPlaceholderText(/confirm your password/i), 'password123')

      // Check terms checkbox
      const termsCheckbox = screen.getByRole('checkbox', { name: /terms/i })
      await userEvent.click(termsCheckbox)

      // Submit
      const submitButton = screen.getByRole('button', { name: /sign up/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        })
      })

      expect(mockSetUser).toHaveBeenCalledWith(mockUser)
    })

    it('should handle submission errors gracefully', async () => {
      const { toast } = await import('sonner')
      mockSignUp.mockRejectedValue(new Error('Email already exists'))

      render(<SignUpForm />, { wrapper: TestWrapper })

      // Fill form with valid data
      await userEvent.type(screen.getByPlaceholderText(/enter your full name/i), 'Test User')
      await userEvent.type(screen.getByPlaceholderText(/enter your email/i), 'existing@example.com')
      await userEvent.type(screen.getByPlaceholderText(/create a password/i), 'password123')
      await userEvent.type(screen.getByPlaceholderText(/confirm your password/i), 'password123')

      // Check terms checkbox
      const termsCheckbox = screen.getByRole('checkbox', { name: /terms/i })
      await userEvent.click(termsCheckbox)

      const submitButton = screen.getByRole('button', { name: /sign up/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Email already exists')
      })
    })
  })
})

