/**
 * Team Settings Tests
 * 
 * Tests team settings and management:
 * - Team information display
 * - Team name/description editing
 * - Member management
 * - Role assignments
 * - Permissions management
 * - Delete/archive team
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
}

interface Team {
  id: string
  name: string
  description?: string
  members: TeamMember[]
  createdAt: string
  isArchived?: boolean
}

interface TeamSettingsProps {
  team: Team
  currentUserRole: string
  onUpdate?: (updates: Partial<Team>) => Promise<void>
  onAddMember?: (email: string, role: string) => Promise<void>
  onRemoveMember?: (memberId: string) => Promise<void>
  onUpdateMemberRole?: (memberId: string, newRole: string) => Promise<void>
  onArchive?: () => Promise<void>
  onDelete?: () => Promise<void>
}

function TeamSettings({
  team,
  currentUserRole,
  onUpdate,
  onAddMember,
  onRemoveMember,
  onUpdateMemberRole,
  onArchive,
  onDelete,
}: TeamSettingsProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [teamName, setTeamName] = React.useState(team.name)
  const [teamDescription, setTeamDescription] = React.useState(team.description || '')
  const [newMemberEmail, setNewMemberEmail] = React.useState('')
  const [newMemberRole, setNewMemberRole] = React.useState('member')
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const canManageTeam = ['admin', 'team-lead', 'workspace-manager'].includes(currentUserRole)
  const canDeleteTeam = ['admin', 'workspace-manager'].includes(currentUserRole)

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    try {
      await onUpdate?.({ name: teamName, description: teamDescription })
      setIsEditing(false)
    } catch (err) {
      setError('Failed to update team settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) return

    setIsSaving(true)
    setError(null)
    try {
      await onAddMember?.(newMemberEmail, newMemberRole)
      setNewMemberEmail('')
      setNewMemberRole('member')
    } catch (err) {
      setError('Failed to add team member')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return

    setIsSaving(true)
    setError(null)
    try {
      await onRemoveMember?.(memberId)
    } catch (err) {
      setError('Failed to remove team member')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
    setIsSaving(true)
    setError(null)
    try {
      await onUpdateMemberRole?.(memberId, newRole)
    } catch (err) {
      setError('Failed to update member role')
    } finally {
      setIsSaving(false)
    }
  }

  const handleArchive = async () => {
    if (!window.confirm('Are you sure you want to archive this team?')) return

    setIsSaving(true)
    setError(null)
    try {
      await onArchive?.()
    } catch (err) {
      setError('Failed to archive team')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('This action cannot be undone. Delete this team?')) return

    setIsSaving(true)
    setError(null)
    try {
      await onDelete?.()
    } catch (err) {
      setError('Failed to delete team')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="team-settings" data-testid="team-settings">
      <h1>Team Settings</h1>

      {error && (
        <div role="alert" className="error-message">
          {error}
        </div>
      )}

      {/* Team Information */}
      <section className="team-info">
        <h2>Team Information</h2>

        {isEditing ? (
          <div className="edit-form">
            <div className="form-group">
              <label htmlFor="team-name">Team Name</label>
              <input
                id="team-name"
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                disabled={isSaving}
              />
            </div>

            <div className="form-group">
              <label htmlFor="team-description">Description</label>
              <textarea
                id="team-description"
                value={teamDescription}
                onChange={(e) => setTeamDescription(e.target.value)}
                disabled={isSaving}
                rows={4}
              />
            </div>

            <div className="form-actions">
              <button onClick={handleSave} disabled={isSaving || !teamName.trim()}>
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setIsEditing(false)} disabled={isSaving}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="info-display">
            <div>
              <strong>Name:</strong> {team.name}
            </div>
            {team.description && (
              <div>
                <strong>Description:</strong> {team.description}
              </div>
            )}
            {canManageTeam && (
              <button onClick={() => setIsEditing(true)}>Edit</button>
            )}
          </div>
        )}
      </section>

      {/* Team Members */}
      <section className="team-members">
        <h2>Team Members ({team.members.length})</h2>

        {canManageTeam && (
          <div className="add-member-form">
            <h3>Add New Member</h3>
            <div className="form-group">
              <input
                type="email"
                placeholder="Email address"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                disabled={isSaving}
                aria-label="Member email"
              />
              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
                disabled={isSaving}
                aria-label="Member role"
              >
                <option value="member">Member</option>
                <option value="team-lead">Team Lead</option>
                <option value="admin">Admin</option>
              </select>
              <button 
                onClick={handleAddMember} 
                disabled={isSaving || !newMemberEmail.trim()}
                aria-label="Add member"
              >
                Add Member
              </button>
            </div>
          </div>
        )}

        <div className="members-list" role="list">
          {team.members.map((member) => (
            <div key={member.id} className="member-item" role="listitem">
              <div className="member-info">
                <strong>{member.name}</strong>
                <span>{member.email}</span>
              </div>

              <div className="member-actions">
                {canManageTeam ? (
                  <select
                    value={member.role}
                    onChange={(e) => handleUpdateMemberRole(member.id, e.target.value)}
                    disabled={isSaving}
                    aria-label={`Change role for ${member.name}`}
                  >
                    <option value="member">Member</option>
                    <option value="team-lead">Team Lead</option>
                    <option value="admin">Admin</option>
                  </select>
                ) : (
                  <span className="role-badge">{member.role}</span>
                )}

                {canManageTeam && (
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    disabled={isSaving}
                    aria-label={`Remove ${member.name}`}
                    className="remove-button"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}

          {team.members.length === 0 && (
            <p className="no-members">No team members yet</p>
          )}
        </div>
      </section>

      {/* Danger Zone */}
      {canManageTeam && (
        <section className="danger-zone">
          <h2>Danger Zone</h2>

          {onArchive && !team.isArchived && (
            <div className="danger-action">
              <div>
                <strong>Archive Team</strong>
                <p>Archive this team. It can be restored later.</p>
              </div>
              <button onClick={handleArchive} disabled={isSaving} className="archive-button">
                Archive Team
              </button>
            </div>
          )}

          {canDeleteTeam && onDelete && (
            <div className="danger-action">
              <div>
                <strong>Delete Team</strong>
                <p>Permanently delete this team. This action cannot be undone.</p>
              </div>
              <button onClick={handleDelete} disabled={isSaving} className="delete-button">
                Delete Team
              </button>
            </div>
          )}
        </section>
      )}
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

describe('TeamSettings', () => {
  const mockTeam: Team = {
    id: 'team-123',
    name: 'Engineering Team',
    description: 'Main engineering team for product development',
    members: [
      { id: 'member-1', name: 'John Doe', email: 'john@example.com', role: 'team-lead' },
      { id: 'member-2', name: 'Jane Smith', email: 'jane@example.com', role: 'member' },
    ],
    createdAt: '2024-01-01T00:00:00Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock window.confirm to always return true
    global.confirm = vi.fn(() => true)
  })

  it('should render team name and description', () => {
    render(
      <TeamSettings team={mockTeam} currentUserRole="member" />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByText('Engineering Team')).toBeInTheDocument()
    expect(screen.getByText('Main engineering team for product development')).toBeInTheDocument()
  })

  it('should display team members count', () => {
    render(
      <TeamSettings team={mockTeam} currentUserRole="member" />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByText(/team members \(2\)/i)).toBeInTheDocument()
  })

  it('should show all team members', () => {
    render(
      <TeamSettings team={mockTeam} currentUserRole="member" />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
  })

  it('should not show edit button for members', () => {
    render(
      <TeamSettings team={mockTeam} currentUserRole="member" />,
      { wrapper: TestWrapper }
    )

    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
  })

  it('should show edit button for team leads', () => {
    render(
      <TeamSettings team={mockTeam} currentUserRole="team-lead" />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
  })

  it('should show edit button for admins', () => {
    render(
      <TeamSettings team={mockTeam} currentUserRole="admin" />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
  })

  it('should enter edit mode when clicking edit', async () => {
    const user = userEvent.setup()

    render(
      <TeamSettings team={mockTeam} currentUserRole="admin" />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByRole('button', { name: /edit/i }))

    expect(screen.getByLabelText(/team name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
  })

  it('should allow editing team name', async () => {
    const user = userEvent.setup()

    render(
      <TeamSettings team={mockTeam} currentUserRole="admin" />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByRole('button', { name: /edit/i }))

    const nameInput = screen.getByLabelText(/team name/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Updated Team Name')

    expect(nameInput).toHaveValue('Updated Team Name')
  })

  it('should save team updates', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn().mockResolvedValue(undefined)

    render(
      <TeamSettings team={mockTeam} currentUserRole="admin" onUpdate={onUpdate} />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByRole('button', { name: /edit/i }))

    const nameInput = screen.getByLabelText(/team name/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Updated Name')

    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith({
        name: 'Updated Name',
        description: 'Main engineering team for product development',
      })
    })
  })

  it('should cancel editing', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()

    render(
      <TeamSettings team={mockTeam} currentUserRole="admin" onUpdate={onUpdate} />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByRole('button', { name: /edit/i }))

    const nameInput = screen.getByLabelText(/team name/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Changed Name')

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onUpdate).not.toHaveBeenCalled()
    expect(screen.queryByLabelText(/team name/i)).not.toBeInTheDocument()
  })

  it('should show add member form for team leads', () => {
    render(
      <TeamSettings team={mockTeam} currentUserRole="team-lead" />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByLabelText(/member email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/member role/i)).toBeInTheDocument()
  })

  it('should handle adding a new member', async () => {
    const user = userEvent.setup()
    const onAddMember = vi.fn().mockResolvedValue(undefined)

    render(
      <TeamSettings team={mockTeam} currentUserRole="admin" onAddMember={onAddMember} />,
      { wrapper: TestWrapper }
    )

    const emailInput = screen.getByLabelText(/member email/i)
    await user.type(emailInput, 'newmember@example.com')

    const roleSelect = screen.getByLabelText(/member role/i)
    await user.selectOptions(roleSelect, 'team-lead')

    await user.click(screen.getByRole('button', { name: /add member/i }))

    await waitFor(() => {
      expect(onAddMember).toHaveBeenCalledWith('newmember@example.com', 'team-lead')
    })
  })

  it('should disable add member button when email is empty', () => {
    render(
      <TeamSettings team={mockTeam} currentUserRole="admin" />,
      { wrapper: TestWrapper }
    )

    const addButton = screen.getByRole('button', { name: /add member/i })
    expect(addButton).toBeDisabled()
  })

  it('should handle removing a member', async () => {
    const user = userEvent.setup()
    const onRemoveMember = vi.fn().mockResolvedValue(undefined)

    render(
      <TeamSettings team={mockTeam} currentUserRole="admin" onRemoveMember={onRemoveMember} />,
      { wrapper: TestWrapper }
    )

    const removeButtons = screen.getAllByRole('button', { name: /remove/i })
    await user.click(removeButtons[0])

    await waitFor(() => {
      expect(onRemoveMember).toHaveBeenCalledWith('member-1')
    })
  })

  it('should handle updating member role', async () => {
    const user = userEvent.setup()
    const onUpdateMemberRole = vi.fn().mockResolvedValue(undefined)

    render(
      <TeamSettings 
        team={mockTeam} 
        currentUserRole="admin" 
        onUpdateMemberRole={onUpdateMemberRole} 
      />,
      { wrapper: TestWrapper }
    )

    const roleSelects = screen.getAllByLabelText(/change role for/i)
    await user.selectOptions(roleSelects[1], 'admin')

    await waitFor(() => {
      expect(onUpdateMemberRole).toHaveBeenCalledWith('member-2', 'admin')
    })
  })

  it('should show archive button for team leads', () => {
    render(
      <TeamSettings team={mockTeam} currentUserRole="team-lead" onArchive={vi.fn()} />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByRole('button', { name: /archive team/i })).toBeInTheDocument()
  })

  it('should handle archiving team', async () => {
    const user = userEvent.setup()
    const onArchive = vi.fn().mockResolvedValue(undefined)

    render(
      <TeamSettings team={mockTeam} currentUserRole="admin" onArchive={onArchive} />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByRole('button', { name: /archive team/i }))

    await waitFor(() => {
      expect(onArchive).toHaveBeenCalled()
    })
  })

  it('should only show delete button for admins and workspace managers', () => {
    const { rerender } = render(
      <TeamSettings team={mockTeam} currentUserRole="team-lead" onDelete={vi.fn()} />,
      { wrapper: TestWrapper }
    )

    expect(screen.queryByRole('button', { name: /delete team/i })).not.toBeInTheDocument()

    rerender(<TeamSettings team={mockTeam} currentUserRole="admin" onDelete={vi.fn()} />)

    expect(screen.getByRole('button', { name: /delete team/i })).toBeInTheDocument()
  })

  it('should handle deleting team', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn().mockResolvedValue(undefined)

    render(
      <TeamSettings team={mockTeam} currentUserRole="admin" onDelete={onDelete} />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByRole('button', { name: /delete team/i }))

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalled()
    })
  })

  it('should display error messages', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn().mockRejectedValue(new Error('Update failed'))

    render(
      <TeamSettings team={mockTeam} currentUserRole="admin" onUpdate={onUpdate} />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByRole('button', { name: /edit/i }))
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to update team settings')
    })
  })
})

