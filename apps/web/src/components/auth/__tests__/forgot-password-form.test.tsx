import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ForgotPasswordForm } from '../forgot-password-form'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('ForgotPasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial Rendering', () => {
    it('should render email input field', () => {
      render(<ForgotPasswordForm />)

      expect(screen.getByPlaceholderText(/enter your email address/i)).toBeInTheDocument()
      expect(screen.getByText(/email/i)).toBeInTheDocument()
    })

    it('should render submit button and cancel link', () => {
      render(<ForgotPasswordForm />)

      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
      // Cancel is a link, not a button
      expect(screen.getByRole('link', { name: /cancel/i })).toBeInTheDocument()
    })
  })

  describe('Validation', () => {
    it('should show error for invalid email format', async () => {
      render(<ForgotPasswordForm />)

      const emailInput = screen.getByPlaceholderText(/enter your email address/i)
      await userEvent.type(emailInput, 'invalid-email')
      
      const submitButton = screen.getByRole('button', { name: /submit/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
      })
    })

    it('should not show error for valid email format', async () => {
      render(<ForgotPasswordForm />)

      const emailInput = screen.getByPlaceholderText(/enter your email address/i)
      await userEvent.type(emailInput, 'valid@example.com')
      
      const submitButton = screen.getByRole('button', { name: /submit/i })
      
      // No validation error should appear
      expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    it('should show success state after submission', async () => {
      render(<ForgotPasswordForm />)

      const emailInput = screen.getByPlaceholderText(/enter your email address/i)
      await userEvent.type(emailInput, 'test@example.com')
      
      const submitButton = screen.getByRole('button', { name: /submit/i })
      fireEvent.click(submitButton)

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText(/sending.../i)).toBeInTheDocument()
      })

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument()
      }, { timeout: 3000 })

      // Should display the email address
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    it('should allow returning to form from success state', async () => {
      render(<ForgotPasswordForm />)

      const emailInput = screen.getByPlaceholderText(/enter your email address/i)
      await userEvent.type(emailInput, 'test@example.com')
      
      const submitButton = screen.getByRole('button', { name: /submit/i })
      fireEvent.click(submitButton)

      // Wait for success state
      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument()
      }, { timeout: 3000 })

      // Click back button
      const backButton = screen.getByRole('button', { name: /back to form/i })
      fireEvent.click(backButton)

      // Should show form again
      expect(screen.getByPlaceholderText(/enter your email address/i)).toBeInTheDocument()
    })

    it('should disable submit button while loading', async () => {
      render(<ForgotPasswordForm />)

      const emailInput = screen.getByPlaceholderText(/enter your email address/i)
      await userEvent.type(emailInput, 'test@example.com')
      
      const submitButton = screen.getByRole('button', { name: /submit/i })
      fireEvent.click(submitButton)

      // Button should be disabled during submission
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled()
      })
    })
  })
})

