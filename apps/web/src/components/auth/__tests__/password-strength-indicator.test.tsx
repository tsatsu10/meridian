import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PasswordStrengthIndicator from '../password-strength-indicator'

describe('PasswordStrengthIndicator', () => {
  describe('Strength Calculation', () => {
    it('should show "Very Weak" for short password', () => {
      render(<PasswordStrengthIndicator password="abc" />)
      
      expect(screen.getByText('Very Weak')).toBeInTheDocument()
    })

    it('should show "Weak" for password with length and lowercase', () => {
      render(<PasswordStrengthIndicator password="abcdefgh" />)
      
      expect(screen.getByText('Weak')).toBeInTheDocument()
    })

    it('should show "Fair" for password with length, lowercase, and uppercase', () => {
      render(<PasswordStrengthIndicator password="Abcdefgh" />)
      
      expect(screen.getByText('Fair')).toBeInTheDocument()
    })

    it('should show "Good" for password with length, lowercase, uppercase, and numbers', () => {
      render(<PasswordStrengthIndicator password="Abcdefg1" />)
      
      expect(screen.getByText('Good')).toBeInTheDocument()
    })

    it('should show "Strong" for password with all criteria', () => {
      render(<PasswordStrengthIndicator password="Abcdefg1!" />)
      
      expect(screen.getByText('Strong')).toBeInTheDocument()
    })
  })

  describe('Visual Feedback', () => {
    it('should show red color for very weak passwords', () => {
      const { container } = render(<PasswordStrengthIndicator password="abc" />)
      
      // Very Weak has strength 1 (only lowercase), which triggers bg-red-500
      const strengthBar = container.querySelector('.bg-red-500')
      expect(strengthBar).toBeInTheDocument()
    })

    it('should show yellow color for weak passwords', () => {
      const { container } = render(<PasswordStrengthIndicator password="abcdefgh" />)
      
      // Weak has strength 2 (length + lowercase), which triggers bg-yellow-500
      const strengthBar = container.querySelector('.bg-yellow-500')
      expect(strengthBar).toBeInTheDocument()
    })

    it('should show green color for fair and stronger passwords', () => {
      const { container } = render(<PasswordStrengthIndicator password="Abcdefgh" />)
      
      // Fair has strength 3 (length + lowercase + uppercase), which triggers bg-green-500
      const strengthBar = container.querySelector('.bg-green-500')
      expect(strengthBar).toBeInTheDocument()
    })

    it('should show green color for strong passwords', () => {
      const { container } = render(<PasswordStrengthIndicator password="Abcdefg1!" />)
      
      // Strong has strength 5 (all criteria), which triggers bg-green-500
      const strengthBar = container.querySelector('.bg-green-500')
      expect(strengthBar).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty password', () => {
      render(<PasswordStrengthIndicator password="" />)
      
      // Should render without crashing
      expect(screen.queryByText('Very Weak')).not.toBeInTheDocument()
    })

    it('should handle undefined password', () => {
      render(<PasswordStrengthIndicator />)
      
      // Should render without crashing
      expect(screen.queryByText('Very Weak')).not.toBeInTheDocument()
    })

    it('should handle very long password', () => {
      // Password: 100 A's + 1 + ! = length(102), uppercase, no lowercase, numbers, special
      // Score: 1 (length) + 1 (uppercase) + 1 (numbers) + 1 (special) = 4 = "Good"
      const longPassword = 'A'.repeat(100) + '1!'
      render(<PasswordStrengthIndicator password={longPassword} />)
      
      expect(screen.getByText('Good')).toBeInTheDocument()
    })
  })
})

