/**
 * Team Member Card Tests
 * 
 * Tests team member display and interaction:
 * - Member information display
 * - Role badges
 * - Status indicators
 * - Quick actions
 * - Accessibility
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  avatar?: string
  status?: 'online' | 'away' | 'offline'
  tasksCompleted?: number
  currentTask?: string
}

interface TeamMemberCardProps {
  member: TeamMember
  onViewProfile?: (memberId: string) => void
  onRemove?: (memberId: string) => void
  onChangeRole?: (memberId: string, newRole: string) => void
  showActions?: boolean
}

function TeamMemberCard({ 
  member, 
  onViewProfile, 
  onRemove, 
  onChangeRole,
  showActions = true 
}: TeamMemberCardProps) {
  const getStatusColor = (status?: string) => {
    const colors: Record<string, string> = {
      online: 'bg-green-500',
      away: 'bg-yellow-500',
      offline: 'bg-gray-400',
    }
    return colors[status || 'offline'] || 'bg-gray-400'
  }

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      'project-manager': 'text-purple-600',
      'team-lead': 'text-blue-600',
      'member': 'text-gray-600',
      'admin': 'text-red-600',
    }
    return colors[role] || 'text-gray-600'
  }

  return (
    <div
      className="team-member-card"
      data-member-id={member.id}
      role="article"
      aria-label={`Team member: ${member.name}`}
    >
      <div className="member-header">
        <div className="member-avatar">
          {member.avatar ? (
            <img src={member.avatar} alt={`${member.name}'s avatar`} />
          ) : (
            <div className="avatar-placeholder">
              {member.name.split(' ').map(n => n[0]).join('')}
            </div>
          )}
          {member.status && (
            <span
              className={`status-indicator ${getStatusColor(member.status)}`}
              aria-label={`Status: ${member.status}`}
            />
          )}
        </div>

        <div className="member-info">
          <h3 className="member-name">{member.name}</h3>
          <p className="member-email">{member.email}</p>
          <span className={`member-role ${getRoleColor(member.role)}`}>
            {member.role}
          </span>
        </div>
      </div>

      {member.tasksCompleted !== undefined && (
        <div className="member-stats" aria-label={`${member.tasksCompleted} tasks completed`}>
          <span className="stat-label">Tasks Completed:</span>
          <span className="stat-value">{member.tasksCompleted}</span>
        </div>
      )}

      {member.currentTask && (
        <div className="current-task" aria-label={`Currently working on: ${member.currentTask}`}>
          <span className="task-label">Current Task:</span>
          <span className="task-name">{member.currentTask}</span>
        </div>
      )}

      {showActions && (
        <div className="member-actions" role="group" aria-label="Member actions">
          <button
            onClick={() => onViewProfile?.(member.id)}
            aria-label="View profile"
          >
            View Profile
          </button>
          {onRemove && (
            <button
              onClick={() => onRemove(member.id)}
              aria-label="Remove member"
              className="danger"
            >
              Remove
            </button>
          )}
        </div>
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

describe('TeamMemberCard', () => {
  const mockMember: TeamMember = {
    id: 'member-123',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'member',
    status: 'online',
    tasksCompleted: 15,
    currentTask: 'Implement authentication',
  }

  it('should render member name and email', () => {
    render(<TeamMemberCard member={mockMember} />, { wrapper: TestWrapper })

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })

  it('should display member role', () => {
    render(<TeamMemberCard member={mockMember} />, { wrapper: TestWrapper })

    expect(screen.getByText('member')).toBeInTheDocument()
  })

  it('should show online status indicator', () => {
    render(<TeamMemberCard member={mockMember} />, { wrapper: TestWrapper })

    expect(screen.getByLabelText(/status: online/i)).toBeInTheDocument()
  })

  it('should display tasks completed', () => {
    render(<TeamMemberCard member={mockMember} />, { wrapper: TestWrapper })

    expect(screen.getByLabelText(/15 tasks completed/i)).toBeInTheDocument()
  })

  it('should show current task', () => {
    render(<TeamMemberCard member={mockMember} />, { wrapper: TestWrapper })

    expect(screen.getByLabelText(/currently working on/i)).toHaveTextContent('Implement authentication')
  })

  it('should render avatar placeholder when no avatar provided', () => {
    const memberNoAvatar = {
      ...mockMember,
      avatar: undefined,
    }

    const { container } = render(
      <TeamMemberCard member={memberNoAvatar} />,
      { wrapper: TestWrapper }
    )

    expect(container.querySelector('.avatar-placeholder')).toBeInTheDocument()
    expect(container.querySelector('.avatar-placeholder')).toHaveTextContent('JD')
  })

  it('should handle view profile action', async () => {
    const user = userEvent.setup()
    const onViewProfile = vi.fn()

    render(
      <TeamMemberCard member={mockMember} onViewProfile={onViewProfile} />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByRole('button', { name: /view profile/i }))

    expect(onViewProfile).toHaveBeenCalledWith('member-123')
  })

  it('should handle remove member action', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()

    render(
      <TeamMemberCard member={mockMember} onRemove={onRemove} />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByRole('button', { name: /remove member/i }))

    expect(onRemove).toHaveBeenCalledWith('member-123')
  })

  it('should hide actions when showActions is false', () => {
    render(
      <TeamMemberCard member={mockMember} showActions={false} />,
      { wrapper: TestWrapper }
    )

    expect(screen.queryByRole('group', { name: /member actions/i })).not.toBeInTheDocument()
  })

  it('should be accessible', () => {
    render(<TeamMemberCard member={mockMember} />, { wrapper: TestWrapper })

    // Card should have article role
    expect(screen.getByRole('article', { name: /team member: john doe/i })).toBeInTheDocument()

    // Action group should have proper label
    expect(screen.getByRole('group', { name: /member actions/i })).toBeInTheDocument()

    // Buttons should have accessible labels
    expect(screen.getByRole('button', { name: /view profile/i })).toBeInTheDocument()
  })
})

