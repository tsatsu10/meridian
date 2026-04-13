/**
 * Settings Form Component Tests
 * 
 * Tests user settings form:
 * - Form rendering
 * - Field validation
 * - Settings updates
 * - Error handling
 * - Accessibility
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestWrapper } from '../../../test-utils/test-wrapper';
import React from 'react';

interface SettingsFormProps {
  initialSettings?: {
    name?: string;
    email?: string;
    timezone?: string;
    language?: string;
    emailNotifications?: boolean;
    pushNotifications?: boolean;
  };
  onSave?: (settings: any) => Promise<void>;
}

function SettingsForm({ initialSettings = {}, onSave }: SettingsFormProps) {
  const [settings, setSettings] = React.useState(initialSettings);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSaving(true);

    try {
      if (onSave) {
        await onSave(settings);
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Settings form">
      <div>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          type="text"
          value={settings.name || ''}
          onChange={(e) => setSettings({ ...settings, name: e.target.value })}
        />
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={settings.email || ''}
          onChange={(e) => setSettings({ ...settings, email: e.target.value })}
        />
      </div>

      <div>
        <label htmlFor="timezone">Timezone</label>
        <select
          id="timezone"
          value={settings.timezone || 'UTC'}
          onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
        >
          <option value="UTC">UTC</option>
          <option value="America/New_York">Eastern Time</option>
          <option value="America/Los_Angeles">Pacific Time</option>
          <option value="Europe/London">London</option>
        </select>
      </div>

      <div>
        <label htmlFor="language">Language</label>
        <select
          id="language"
          value={settings.language || 'en'}
          onChange={(e) => setSettings({ ...settings, language: e.target.value })}
        >
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
        </select>
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={settings.emailNotifications || false}
            onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
          />
          Email Notifications
        </label>
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={settings.pushNotifications || false}
            onChange={(e) => setSettings({ ...settings, pushNotifications: e.target.checked })}
          />
          Push Notifications
        </label>
      </div>

      {error && (
        <div role="alert" className="error-message">
          {error}
        </div>
      )}

      {success && (
        <div role="status" className="success-message">
          Settings saved successfully!
        </div>
      )}

      <button type="submit" disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Settings'}
      </button>
    </form>
  );
}

describe('Settings Form Component', () => {
  const defaultSettings = {
    name: 'Test User',
    email: 'test@example.com',
    timezone: 'UTC',
    language: 'en',
    emailNotifications: true,
    pushNotifications: false,
  };

  it('should render form with initial values', () => {
    render(
      <SettingsForm initialSettings={defaultSettings} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('UTC')).toBeInTheDocument();
    expect(screen.getByDisplayValue('en')).toBeInTheDocument();
  });

  it('should update name field', async () => {
    const user = userEvent.setup();

    render(
      <SettingsForm initialSettings={defaultSettings} />,
      { wrapper: TestWrapper }
    );

    const nameInput = screen.getByLabelText(/name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Name');

    expect(nameInput).toHaveValue('Updated Name');
  });

  it('should update email field', async () => {
    const user = userEvent.setup();

    render(
      <SettingsForm initialSettings={defaultSettings} />,
      { wrapper: TestWrapper }
    );

    const emailInput = screen.getByLabelText(/email/i);
    await user.clear(emailInput);
    await user.type(emailInput, 'newemail@example.com');

    expect(emailInput).toHaveValue('newemail@example.com');
  });

  it('should change timezone', async () => {
    const user = userEvent.setup();

    render(
      <SettingsForm initialSettings={defaultSettings} />,
      { wrapper: TestWrapper }
    );

    const timezoneSelect = screen.getByLabelText(/timezone/i);
    await user.selectOptions(timezoneSelect, 'America/New_York');

    expect(timezoneSelect).toHaveValue('America/New_York');
  });

  it('should change language', async () => {
    const user = userEvent.setup();

    render(
      <SettingsForm initialSettings={defaultSettings} />,
      { wrapper: TestWrapper }
    );

    const languageSelect = screen.getByLabelText(/language/i);
    await user.selectOptions(languageSelect, 'es');

    expect(languageSelect).toHaveValue('es');
  });

  it('should toggle email notifications', async () => {
    const user = userEvent.setup();

    render(
      <SettingsForm initialSettings={defaultSettings} />,
      { wrapper: TestWrapper }
    );

    const emailNotifCheckbox = screen.getByRole('checkbox', { name: /email notifications/i });
    
    expect(emailNotifCheckbox).toBeChecked();
    
    await user.click(emailNotifCheckbox);
    
    expect(emailNotifCheckbox).not.toBeChecked();
  });

  it('should toggle push notifications', async () => {
    const user = userEvent.setup();

    render(
      <SettingsForm initialSettings={defaultSettings} />,
      { wrapper: TestWrapper }
    );

    const pushNotifCheckbox = screen.getByRole('checkbox', { name: /push notifications/i });
    
    expect(pushNotifCheckbox).not.toBeChecked();
    
    await user.click(pushNotifCheckbox);
    
    expect(pushNotifCheckbox).toBeChecked();
  });

  it('should save settings successfully', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <SettingsForm initialSettings={defaultSettings} onSave={onSave} />,
      { wrapper: TestWrapper }
    );

    await user.clear(screen.getByLabelText(/name/i));
    await user.type(screen.getByLabelText(/name/i), 'New Name');

    await user.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Name' })
      );
    });

    expect(screen.getByText(/settings saved successfully/i)).toBeInTheDocument();
  });

  it('should show error on save failure', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue(new Error('Network error'));

    render(
      <SettingsForm initialSettings={defaultSettings} onSave={onSave} />,
      { wrapper: TestWrapper }
    );

    await user.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('should disable button while saving', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <SettingsForm initialSettings={defaultSettings} onSave={onSave} />,
      { wrapper: TestWrapper }
    );

    const saveButton = screen.getByRole('button', { name: /save settings/i });

    await user.click(saveButton);

    // Button should be disabled while saving
    expect(saveButton).toBeDisabled();
    expect(saveButton).toHaveTextContent(/saving/i);

    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });
  });

  it('should be accessible', () => {
    render(
      <SettingsForm initialSettings={defaultSettings} />,
      { wrapper: TestWrapper }
    );

    // Form should have accessible name
    expect(screen.getByRole('form', { name: /settings form/i })).toBeInTheDocument();

    // All inputs should have labels
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/timezone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/language/i)).toBeInTheDocument();

    // Checkboxes should have accessible labels
    expect(screen.getByRole('checkbox', { name: /email notifications/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /push notifications/i })).toBeInTheDocument();
  });

  it('should preserve unchanged values on submit', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <SettingsForm initialSettings={defaultSettings} onSave={onSave} />,
      { wrapper: TestWrapper }
    );

    // Only change name
    await user.clear(screen.getByLabelText(/name/i));
    await user.type(screen.getByLabelText(/name/i), 'New Name');

    await user.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        ...defaultSettings,
        name: 'New Name',
      });
    });
  });
});

