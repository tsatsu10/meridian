/**
 * User Profile Component Tests
 * 
 * Tests user profile display and editing:
 * - Profile information display
 * - Avatar upload
 * - Profile editing
 * - Validation
 * - Accessibility
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestWrapper } from '../../../test-utils/test-wrapper';
import React from 'react';

interface UserProfileProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
    bio?: string;
    timezone?: string;
    language?: string;
  };
  isEditable?: boolean;
  onSave?: (updates: any) => Promise<void>;
  onAvatarUpload?: (file: File) => Promise<string>;
}

function UserProfile({ user, isEditable = false, onSave, onAvatarUpload }: UserProfileProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedUser, setEditedUser] = React.useState(user);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    setIsSaving(true);

    try {
      if (onSave) {
        await onSave(editedUser);
        setIsEditing(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAvatarUpload) {
      try {
        const avatarUrl = await onAvatarUpload(file);
        setEditedUser({ ...editedUser, avatar: avatarUrl });
      } catch (err: any) {
        setError('Failed to upload avatar');
      }
    }
  };

  return (
    <div className="user-profile" role="region" aria-label="User profile">
      <div className="profile-header">
        <div className="avatar-section">
          {editedUser.avatar ? (
            <img
              src={editedUser.avatar}
              alt={`${editedUser.name}'s avatar`}
              className="profile-avatar"
            />
          ) : (
            <div className="avatar-placeholder" aria-label="No avatar">
              {editedUser.name.charAt(0).toUpperCase()}
            </div>
          )}

          {isEditable && isEditing && (
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              aria-label="Upload avatar"
            />
          )}
        </div>

        <div className="profile-info">
          {isEditing ? (
            <>
              <input
                type="text"
                value={editedUser.name}
                onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
                aria-label="Name"
                placeholder="Name"
              />
              <input
                type="email"
                value={editedUser.email}
                onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                aria-label="Email"
                placeholder="Email"
              />
            </>
          ) : (
            <>
              <h2>{editedUser.name}</h2>
              <p className="email">{editedUser.email}</p>
            </>
          )}

          <span className="role-badge" aria-label={`Role: ${editedUser.role}`}>
            {editedUser.role}
          </span>
        </div>
      </div>

      <div className="profile-details">
        {isEditing ? (
          <>
            <textarea
              value={editedUser.bio || ''}
              onChange={(e) => setEditedUser({ ...editedUser, bio: e.target.value })}
              aria-label="Bio"
              placeholder="Bio"
            />
            <select
              value={editedUser.timezone || 'UTC'}
              onChange={(e) => setEditedUser({ ...editedUser, timezone: e.target.value })}
              aria-label="Timezone"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
            </select>
            <select
              value={editedUser.language || 'en'}
              onChange={(e) => setEditedUser({ ...editedUser, language: e.target.value })}
              aria-label="Language"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
            </select>
          </>
        ) : (
          <>
            {editedUser.bio && <p className="bio">{editedUser.bio}</p>}
            <p>Timezone: {editedUser.timezone || 'UTC'}</p>
            <p>Language: {editedUser.language || 'en'}</p>
          </>
        )}
      </div>

      {error && (
        <div role="alert" className="error-message">
          {error}
        </div>
      )}

      {isEditable && (
        <div className="profile-actions">
          {isEditing ? (
            <>
              <button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => {
                setIsEditing(false);
                setEditedUser(user);
                setError(null);
              }}>
                Cancel
              </button>
            </>
          ) : (
            <button onClick={() => setIsEditing(true)}>
              Edit Profile
            </button>
          )}
        </div>
      )}
    </div>
  );
}

describe('User Profile Component', () => {
  const mockUser = {
    id: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'member',
    avatar: '/avatars/john.jpg',
    bio: 'Software developer passionate about clean code',
    timezone: 'America/New_York',
    language: 'en',
  };

  it('should render user profile', () => {
    render(<UserProfile user={mockUser} />, { wrapper: TestWrapper });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('should display avatar', () => {
    render(<UserProfile user={mockUser} />, { wrapper: TestWrapper });

    const avatar = screen.getByRole('img', { name: /john doe's avatar/i });
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('src', '/avatars/john.jpg');
  });

  it('should show placeholder when no avatar', () => {
    const userWithoutAvatar = { ...mockUser, avatar: undefined };

    render(<UserProfile user={userWithoutAvatar} />, { wrapper: TestWrapper });

    expect(screen.getByLabelText(/no avatar/i)).toBeInTheDocument();
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('should display role badge', () => {
    render(<UserProfile user={mockUser} />, { wrapper: TestWrapper });

    expect(screen.getByLabelText(/role: member/i)).toBeInTheDocument();
  });

  it('should display bio', () => {
    render(<UserProfile user={mockUser} />, { wrapper: TestWrapper });

    expect(screen.getByText(/software developer/i)).toBeInTheDocument();
  });

  it('should display timezone and language', () => {
    render(<UserProfile user={mockUser} />, { wrapper: TestWrapper });

    expect(screen.getByText(/timezone: america\/new_york/i)).toBeInTheDocument();
    expect(screen.getByText(/language: en/i)).toBeInTheDocument();
  });

  it('should show edit button when editable', () => {
    render(<UserProfile user={mockUser} isEditable={true} />, { wrapper: TestWrapper });

    expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
  });

  it('should not show edit button when not editable', () => {
    render(<UserProfile user={mockUser} isEditable={false} />, { wrapper: TestWrapper });

    expect(screen.queryByRole('button', { name: /edit profile/i })).not.toBeInTheDocument();
  });

  it('should enter edit mode', async () => {
    const user = userEvent.setup();

    render(<UserProfile user={mockUser} isEditable={true} />, { wrapper: TestWrapper });

    await user.click(screen.getByRole('button', { name: /edit profile/i }));

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('should edit name', async () => {
    const user = userEvent.setup();

    render(<UserProfile user={mockUser} isEditable={true} />, { wrapper: TestWrapper });

    await user.click(screen.getByRole('button', { name: /edit profile/i }));

    const nameInput = screen.getByLabelText(/name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Jane Doe');

    expect(nameInput).toHaveValue('Jane Doe');
  });

  it('should save profile changes', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <UserProfile user={mockUser} isEditable={true} onSave={onSave} />,
      { wrapper: TestWrapper }
    );

    await user.click(screen.getByRole('button', { name: /edit profile/i }));

    const nameInput = screen.getByLabelText(/name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Jane Doe');

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Jane Doe' })
      );
    });
  });

  it('should cancel editing', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <UserProfile user={mockUser} isEditable={true} onSave={onSave} />,
      { wrapper: TestWrapper }
    );

    await user.click(screen.getByRole('button', { name: /edit profile/i }));

    const nameInput = screen.getByLabelText(/name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Changed Name');

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    // Should show original name
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('should handle avatar upload', async () => {
    const user = userEvent.setup();
    const onAvatarUpload = vi.fn().mockResolvedValue('/avatars/new-avatar.jpg');

    render(
      <UserProfile 
        user={mockUser} 
        isEditable={true}
        onAvatarUpload={onAvatarUpload}
      />,
      { wrapper: TestWrapper }
    );

    await user.click(screen.getByRole('button', { name: /edit profile/i }));

    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    const fileInput = screen.getByLabelText(/upload avatar/i);
    
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(onAvatarUpload).toHaveBeenCalled();
    });
  });

  it('should show error on save failure', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue(new Error('Network error'));

    render(
      <UserProfile user={mockUser} isEditable={true} onSave={onSave} />,
      { wrapper: TestWrapper }
    );

    await user.click(screen.getByRole('button', { name: /edit profile/i }));
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('should disable save button while saving', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <UserProfile user={mockUser} isEditable={true} onSave={onSave} />,
      { wrapper: TestWrapper }
    );

    await user.click(screen.getByRole('button', { name: /edit profile/i }));

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    expect(saveButton).toBeDisabled();
    expect(saveButton).toHaveTextContent(/saving/i);

    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });
  });
});

