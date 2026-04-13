/**
 * User Preferences Tests
 * 
 * Tests user preference management:
 * - Theme selection
 * - Notification settings
 * - Language preferences
 * - Display options
 * - Accessibility settings
 * - Save/cancel functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  emailNotifications: boolean
  pushNotifications: boolean
  soundEnabled: boolean
  compactMode: boolean
  fontSize: 'small' | 'medium' | 'large'
  highContrast: boolean
}

interface UserPreferencesProps {
  preferences: UserPreferences
  isLoading?: boolean
  onSave?: (preferences: UserPreferences) => Promise<void>
  onReset?: () => void
}

function UserPreferencesComponent({
  preferences: initialPreferences,
  isLoading = false,
  onSave,
  onReset,
}: UserPreferencesProps) {
  const [preferences, setPreferences] = React.useState(initialPreferences)
  const [isSaving, setIsSaving] = React.useState(false)
  const [hasChanges, setHasChanges] = React.useState(false)
  const [saveSuccess, setSaveSuccess] = React.useState(false)

  React.useEffect(() => {
    const changed = JSON.stringify(preferences) !== JSON.stringify(initialPreferences)
    setHasChanges(changed)
  }, [preferences, initialPreferences])

  const handleChange = (key: keyof UserPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
    setSaveSuccess(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave?.(preferences)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to save preferences:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setPreferences(initialPreferences)
    setHasChanges(false)
    onReset?.()
  }

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading preferences">
        <div className="loading-skeleton" />
        <span className="sr-only">Loading preferences...</span>
      </div>
    )
  }

  return (
    <div className="user-preferences" data-testid="user-preferences">
      <h1>User Preferences</h1>

      {saveSuccess && (
        <div role="status" className="success-message" aria-live="polite">
          Preferences saved successfully
        </div>
      )}

      {/* Theme Section */}
      <section className="preference-section">
        <h2>Appearance</h2>

        <div className="preference-item">
          <label htmlFor="theme">Theme</label>
          <select
            id="theme"
            value={preferences.theme}
            onChange={(e) => handleChange('theme', e.target.value)}
            disabled={isSaving}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </div>

        <div className="preference-item">
          <label htmlFor="fontSize">Font Size</label>
          <select
            id="fontSize"
            value={preferences.fontSize}
            onChange={(e) => handleChange('fontSize', e.target.value)}
            disabled={isSaving}
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>

        <div className="preference-item">
          <label>
            <input
              type="checkbox"
              checked={preferences.compactMode}
              onChange={(e) => handleChange('compactMode', e.target.checked)}
              disabled={isSaving}
              aria-label="Enable compact mode"
            />
            Compact Mode
          </label>
        </div>

        <div className="preference-item">
          <label>
            <input
              type="checkbox"
              checked={preferences.highContrast}
              onChange={(e) => handleChange('highContrast', e.target.checked)}
              disabled={isSaving}
              aria-label="Enable high contrast"
            />
            High Contrast
          </label>
        </div>
      </section>

      {/* Notifications Section */}
      <section className="preference-section">
        <h2>Notifications</h2>

        <div className="preference-item">
          <label>
            <input
              type="checkbox"
              checked={preferences.emailNotifications}
              onChange={(e) => handleChange('emailNotifications', e.target.checked)}
              disabled={isSaving}
              aria-label="Enable email notifications"
            />
            Email Notifications
          </label>
        </div>

        <div className="preference-item">
          <label>
            <input
              type="checkbox"
              checked={preferences.pushNotifications}
              onChange={(e) => handleChange('pushNotifications', e.target.checked)}
              disabled={isSaving}
              aria-label="Enable push notifications"
            />
            Push Notifications
          </label>
        </div>

        <div className="preference-item">
          <label>
            <input
              type="checkbox"
              checked={preferences.soundEnabled}
              onChange={(e) => handleChange('soundEnabled', e.target.checked)}
              disabled={isSaving}
              aria-label="Enable notification sounds"
            />
            Sound
          </label>
        </div>
      </section>

      {/* Language Section */}
      <section className="preference-section">
        <h2>Regional</h2>

        <div className="preference-item">
          <label htmlFor="language">Language</label>
          <select
            id="language"
            value={preferences.language}
            onChange={(e) => handleChange('language', e.target.value)}
            disabled={isSaving}
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
          </select>
        </div>

        <div className="preference-item">
          <label htmlFor="timezone">Timezone</label>
          <select
            id="timezone"
            value={preferences.timezone}
            onChange={(e) => handleChange('timezone', e.target.value)}
            disabled={isSaving}
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
          </select>
        </div>
      </section>

      {/* Actions */}
      <div className="preference-actions">
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          aria-label="Save preferences"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
        
        <button
          onClick={handleReset}
          disabled={!hasChanges || isSaving}
          aria-label="Reset to defaults"
        >
          Reset
        </button>
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

describe('UserPreferences', () => {
  const mockPreferences: UserPreferences = {
    theme: 'light',
    language: 'en',
    timezone: 'UTC',
    emailNotifications: true,
    pushNotifications: true,
    soundEnabled: false,
    compactMode: false,
    fontSize: 'medium',
    highContrast: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render preferences page', () => {
    render(<UserPreferencesComponent preferences={mockPreferences} />, { wrapper: TestWrapper })

    expect(screen.getByTestId('user-preferences')).toBeInTheDocument()
    expect(screen.getByText('User Preferences')).toBeInTheDocument()
  })

  it('should display current theme selection', () => {
    render(<UserPreferencesComponent preferences={mockPreferences} />, { wrapper: TestWrapper })

    expect(screen.getByLabelText('Theme')).toHaveValue('light')
  })

  it('should allow changing theme', async () => {
    const user = userEvent.setup()

    render(<UserPreferencesComponent preferences={mockPreferences} />, { wrapper: TestWrapper })

    await user.selectOptions(screen.getByLabelText('Theme'), 'dark')

    expect(screen.getByLabelText('Theme')).toHaveValue('dark')
  })

  it('should allow changing font size', async () => {
    const user = userEvent.setup()

    render(<UserPreferencesComponent preferences={mockPreferences} />, { wrapper: TestWrapper })

    await user.selectOptions(screen.getByLabelText('Font Size'), 'large')

    expect(screen.getByLabelText('Font Size')).toHaveValue('large')
  })

  it('should toggle compact mode', async () => {
    const user = userEvent.setup()

    render(<UserPreferencesComponent preferences={mockPreferences} />, { wrapper: TestWrapper })

    const compactToggle = screen.getByLabelText(/enable compact mode/i)
    expect(compactToggle).not.toBeChecked()

    await user.click(compactToggle)

    expect(compactToggle).toBeChecked()
  })

  it('should toggle high contrast', async () => {
    const user = userEvent.setup()

    render(<UserPreferencesComponent preferences={mockPreferences} />, { wrapper: TestWrapper })

    const highContrastToggle = screen.getByLabelText(/enable high contrast/i)
    await user.click(highContrastToggle)

    expect(highContrastToggle).toBeChecked()
  })

  it('should toggle email notifications', async () => {
    const user = userEvent.setup()

    render(<UserPreferencesComponent preferences={mockPreferences} />, { wrapper: TestWrapper })

    const emailToggle = screen.getByLabelText(/enable email notifications/i)
    expect(emailToggle).toBeChecked()

    await user.click(emailToggle)

    expect(emailToggle).not.toBeChecked()
  })

  it('should toggle push notifications', async () => {
    const user = userEvent.setup()

    render(<UserPreferencesComponent preferences={mockPreferences} />, { wrapper: TestWrapper })

    const pushToggle = screen.getByLabelText(/enable push notifications/i)
    expect(pushToggle).toBeChecked() // Initially true

    await user.click(pushToggle)

    expect(pushToggle).not.toBeChecked() // Now false
  })

  it('should toggle sound', async () => {
    const user = userEvent.setup()

    render(<UserPreferencesComponent preferences={mockPreferences} />, { wrapper: TestWrapper })

    const soundToggle = screen.getByLabelText(/enable notification sounds/i)
    await user.click(soundToggle)

    expect(soundToggle).toBeChecked()
  })

  it('should change language', async () => {
    const user = userEvent.setup()

    render(<UserPreferencesComponent preferences={mockPreferences} />, { wrapper: TestWrapper })

    await user.selectOptions(screen.getByLabelText('Language'), 'es')

    expect(screen.getByLabelText('Language')).toHaveValue('es')
  })

  it('should change timezone', async () => {
    const user = userEvent.setup()

    render(<UserPreferencesComponent preferences={mockPreferences} />, { wrapper: TestWrapper })

    await user.selectOptions(screen.getByLabelText('Timezone'), 'America/New_York')

    expect(screen.getByLabelText('Timezone')).toHaveValue('America/New_York')
  })

  it('should enable save button when changes are made', async () => {
    const user = userEvent.setup()

    render(<UserPreferencesComponent preferences={mockPreferences} />, { wrapper: TestWrapper })

    const saveButton = screen.getByLabelText(/save preferences/i)
    expect(saveButton).toBeDisabled()

    await user.selectOptions(screen.getByLabelText('Theme'), 'dark')

    await waitFor(() => {
      expect(saveButton).not.toBeDisabled()
    })
  })

  it('should save preferences', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue(undefined)

    render(
      <UserPreferencesComponent preferences={mockPreferences} onSave={onSave} />,
      { wrapper: TestWrapper }
    )

    await user.selectOptions(screen.getByLabelText('Theme'), 'dark')
    await user.click(screen.getByLabelText(/save preferences/i))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ theme: 'dark' })
      )
    })
  })

  it('should show success message after saving', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue(undefined)

    render(
      <UserPreferencesComponent preferences={mockPreferences} onSave={onSave} />,
      { wrapper: TestWrapper }
    )

    await user.selectOptions(screen.getByLabelText('Theme'), 'dark')
    await user.click(screen.getByLabelText(/save preferences/i))

    await waitFor(() => {
      expect(screen.getByText('Preferences saved successfully')).toBeInTheDocument()
    })
  })

  it('should reset preferences', async () => {
    const user = userEvent.setup()
    const onReset = vi.fn()

    render(
      <UserPreferencesComponent preferences={mockPreferences} onReset={onReset} />,
      { wrapper: TestWrapper }
    )

    // Make a change
    await user.selectOptions(screen.getByLabelText('Theme'), 'dark')
    
    // Reset
    await user.click(screen.getByLabelText(/reset to defaults/i))

    expect(screen.getByLabelText('Theme')).toHaveValue('light')
    expect(onReset).toHaveBeenCalled()
  })

  it('should disable actions while saving', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )

    render(
      <UserPreferencesComponent preferences={mockPreferences} onSave={onSave} />,
      { wrapper: TestWrapper }
    )

    await user.selectOptions(screen.getByLabelText('Theme'), 'dark')
    
    const saveButton = screen.getByLabelText(/save preferences/i)
    await user.click(saveButton)

    expect(saveButton).toBeDisabled()
    expect(saveButton).toHaveTextContent('Saving...')
  })

  it('should disable inputs while saving', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )

    render(
      <UserPreferencesComponent preferences={mockPreferences} onSave={onSave} />,
      { wrapper: TestWrapper }
    )

    await user.selectOptions(screen.getByLabelText('Theme'), 'dark')
    await user.click(screen.getByLabelText(/save preferences/i))

    expect(screen.getByLabelText('Theme')).toBeDisabled()
  })

  it('should show loading state', () => {
    render(
      <UserPreferencesComponent preferences={mockPreferences} isLoading={true} />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByLabelText(/loading preferences/i)).toBeInTheDocument()
  })

  it('should organize settings by section', () => {
    render(<UserPreferencesComponent preferences={mockPreferences} />, { wrapper: TestWrapper })

    expect(screen.getByText('Appearance')).toBeInTheDocument()
    expect(screen.getByText('Notifications')).toBeInTheDocument()
    expect(screen.getByText('Regional')).toBeInTheDocument()
  })

  it('should display all notification options', () => {
    render(<UserPreferencesComponent preferences={mockPreferences} />, { wrapper: TestWrapper })

    expect(screen.getByLabelText(/enable email notifications/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/enable push notifications/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/enable notification sounds/i)).toBeInTheDocument()
  })
})

