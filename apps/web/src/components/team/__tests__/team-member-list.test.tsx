/**
 * Team Member List Component Tests
 * 
 * Tests team member list display and interactions:
 * - Member display
 * - Role badges
 * - Avatar rendering
 * - Member actions
 * - Filtering
 * - Accessibility
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestWrapper } from '../../../test-utils/test-wrapper';
import React from 'react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  status: 'active' | 'away' | 'offline';
  joinedAt: Date;
}

interface TeamMemberListProps {
  members: TeamMember[];
  currentUserEmail: string;
  onMemberClick?: (memberId: string) => void;
  onRemoveMember?: (memberId: string) => void;
  onChangeRole?: (memberId: string, newRole: string) => void;
}

function TeamMemberList({
  members,
  currentUserEmail,
  onMemberClick,
  onRemoveMember,
  onChangeRole,
}: TeamMemberListProps) {
  const [filter, setFilter] = React.useState('');

  const filteredMembers = members.filter(
    m => m.name.toLowerCase().includes(filter.toLowerCase()) ||
         m.email.toLowerCase().includes(filter.toLowerCase())
  );

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      'workspace-manager': 'bg-purple-500',
      'admin': 'bg-red-500',
      'team-lead': 'bg-blue-500',
      'project-manager': 'bg-green-500',
      'member': 'bg-gray-500',
      'guest': 'bg-yellow-500',
    };
    return colors[role] || 'bg-gray-500';
  };

  const getStatusIndicator = (status: string) => {
    const indicators: Record<string, string> = {
      active: '🟢',
      away: '🟡',
      offline: '⚫',
    };
    return indicators[status] || '⚫';
  };

  return (
    <div className="team-member-list" role="region" aria-label="Team members">
      <div className="list-header">
        <h2>Team Members ({filteredMembers.length})</h2>
        <input
          type="text"
          placeholder="Search members..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Search team members"
        />
      </div>

      <ul className="member-list" role="list">
        {filteredMembers.map((member) => {
          const isCurrentUser = member.email === currentUserEmail;

          return (
            <li
              key={member.id}
              className="member-item"
              role="listitem"
              aria-label={`Team member: ${member.name}`}
            >
              <div
                className="member-info"
                onClick={() => onMemberClick?.(member.id)}
              >
                {member.avatar ? (
                  <img
                    src={member.avatar}
                    alt={`${member.name}'s avatar`}
                    className="avatar"
                  />
                ) : (
                  <div className="avatar-placeholder" aria-label="No avatar">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="member-details">
                  <div className="member-name">
                    {member.name}
                    {isCurrentUser && <span className="you-badge">(You)</span>}
                  </div>
                  <div className="member-email">{member.email}</div>
                </div>

                <span
                  className="status-indicator"
                  aria-label={`Status: ${member.status}`}
                >
                  {getStatusIndicator(member.status)}
                </span>

                <span
                  className={`role-badge ${getRoleBadgeColor(member.role)}`}
                  aria-label={`Role: ${member.role}`}
                >
                  {member.role}
                </span>
              </div>

              {!isCurrentUser && (
                <div className="member-actions">
                  <button
                    onClick={() => onChangeRole?.(member.id, 'admin')}
                    aria-label={`Change ${member.name}'s role`}
                  >
                    Change Role
                  </button>
                  <button
                    onClick={() => onRemoveMember?.(member.id)}
                    aria-label={`Remove ${member.name}`}
                    className="danger"
                  >
                    Remove
                  </button>
                </div>
              )}
            </li>
          );
        })}

        {filteredMembers.length === 0 && (
          <li className="empty-state" aria-label="No members found">
            No team members found
          </li>
        )}
      </ul>
    </div>
  );
}

describe('Team Member List Component', () => {
  const mockMembers: TeamMember[] = [
    {
      id: 'user-1',
      name: 'Alice Johnson',
      email: 'alice@example.com',
      role: 'workspace-manager',
      avatar: '/avatars/alice.jpg',
      status: 'active',
      joinedAt: new Date('2025-01-01'),
    },
    {
      id: 'user-2',
      name: 'Bob Smith',
      email: 'bob@example.com',
      role: 'member',
      status: 'away',
      joinedAt: new Date('2025-02-01'),
    },
    {
      id: 'user-3',
      name: 'Charlie Davis',
      email: 'charlie@example.com',
      role: 'admin',
      avatar: '/avatars/charlie.jpg',
      status: 'offline',
      joinedAt: new Date('2025-03-01'),
    },
  ];

  const currentUserEmail = 'bob@example.com';

  it('should render all team members', () => {
    render(
      <TeamMemberList members={mockMembers} currentUserEmail={currentUserEmail} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    expect(screen.getByText('Charlie Davis')).toBeInTheDocument();
  });

  it('should display member count', () => {
    render(
      <TeamMemberList members={mockMembers} currentUserEmail={currentUserEmail} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText(/team members \(3\)/i)).toBeInTheDocument();
  });

  it('should display member emails', () => {
    render(
      <TeamMemberList members={mockMembers} currentUserEmail={currentUserEmail} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    expect(screen.getByText('charlie@example.com')).toBeInTheDocument();
  });

  it('should display role badges', () => {
    render(
      <TeamMemberList members={mockMembers} currentUserEmail={currentUserEmail} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText('workspace-manager')).toBeInTheDocument();
    expect(screen.getByText('member')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('should display status indicators', () => {
    render(
      <TeamMemberList members={mockMembers} currentUserEmail={currentUserEmail} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByLabelText(/status: active/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/status: away/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/status: offline/i)).toBeInTheDocument();
  });

  it('should show avatar when available', () => {
    render(
      <TeamMemberList members={mockMembers} currentUserEmail={currentUserEmail} />,
      { wrapper: TestWrapper }
    );

    const avatars = screen.getAllByRole('img');
    expect(avatars.length).toBeGreaterThanOrEqual(2);
    expect(avatars[0]).toHaveAttribute('alt', "Alice Johnson's avatar");
  });

  it('should show placeholder when no avatar', () => {
    render(
      <TeamMemberList members={mockMembers} currentUserEmail={currentUserEmail} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByLabelText(/no avatar/i)).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument(); // Bob's initial
  });

  it('should highlight current user', () => {
    render(
      <TeamMemberList members={mockMembers} currentUserEmail={currentUserEmail} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText('(You)')).toBeInTheDocument();
  });

  it('should not show actions for current user', () => {
    render(
      <TeamMemberList members={mockMembers} currentUserEmail={currentUserEmail} />,
      { wrapper: TestWrapper }
    );

    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    
    // Should have remove buttons for all members except current user
    expect(removeButtons.length).toBe(2); // 3 members - 1 current user
  });

  it('should filter members by search', async () => {
    const user = userEvent.setup();

    render(
      <TeamMemberList members={mockMembers} currentUserEmail={currentUserEmail} />,
      { wrapper: TestWrapper }
    );

    const searchInput = screen.getByLabelText(/search team members/i);
    await user.type(searchInput, 'Alice');

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
      expect(screen.queryByText('Charlie Davis')).not.toBeInTheDocument();
    });

    expect(screen.getByText(/team members \(1\)/i)).toBeInTheDocument();
  });

  it('should filter by email', async () => {
    const user = userEvent.setup();

    render(
      <TeamMemberList members={mockMembers} currentUserEmail={currentUserEmail} />,
      { wrapper: TestWrapper }
    );

    const searchInput = screen.getByLabelText(/search team members/i);
    await user.type(searchInput, 'charlie@');

    await waitFor(() => {
      expect(screen.getByText('Charlie Davis')).toBeInTheDocument();
      expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument();
    });
  });

  it('should show empty state when no matches', async () => {
    const user = userEvent.setup();

    render(
      <TeamMemberList members={mockMembers} currentUserEmail={currentUserEmail} />,
      { wrapper: TestWrapper }
    );

    const searchInput = screen.getByLabelText(/search team members/i);
    await user.type(searchInput, 'NonExistentUser');

    await waitFor(() => {
      expect(screen.getByLabelText(/no members found/i)).toBeInTheDocument();
    });
  });

  it('should handle member click', async () => {
    const user = userEvent.setup();
    const onMemberClick = vi.fn();

    render(
      <TeamMemberList 
        members={mockMembers} 
        currentUserEmail={currentUserEmail}
        onMemberClick={onMemberClick}
      />,
      { wrapper: TestWrapper }
    );

    await user.click(screen.getByText('Alice Johnson'));

    expect(onMemberClick).toHaveBeenCalledWith('user-1');
  });

  it('should handle remove member', async () => {
    const user = userEvent.setup();
    const onRemoveMember = vi.fn();

    render(
      <TeamMemberList 
        members={mockMembers} 
        currentUserEmail={currentUserEmail}
        onRemoveMember={onRemoveMember}
      />,
      { wrapper: TestWrapper }
    );

    const removeButtons = screen.getAllByRole('button', { name: /remove alice/i });
    await user.click(removeButtons[0]);

    expect(onRemoveMember).toHaveBeenCalledWith('user-1');
  });

  it('should handle change role', async () => {
    const user = userEvent.setup();
    const onChangeRole = vi.fn();

    render(
      <TeamMemberList 
        members={mockMembers} 
        currentUserEmail={currentUserEmail}
        onChangeRole={onChangeRole}
      />,
      { wrapper: TestWrapper }
    );

    const changeRoleButtons = screen.getAllByRole('button', { name: /change.*role/i });
    await user.click(changeRoleButtons[0]);

    expect(onChangeRole).toHaveBeenCalledWith('user-1', 'admin');
  });

  it('should be accessible', () => {
    render(
      <TeamMemberList members={mockMembers} currentUserEmail={currentUserEmail} />,
      { wrapper: TestWrapper }
    );

    // Main container should have region role
    expect(screen.getByRole('region', { name: /team members/i })).toBeInTheDocument();

    // List should have list role
    expect(screen.getByRole('list')).toBeInTheDocument();

    // Members should have listitem role
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(3);

    // Search should be accessible
    expect(screen.getByLabelText(/search team members/i)).toBeInTheDocument();
  });

  it('should handle empty team', () => {
    render(
      <TeamMemberList members={[]} currentUserEmail={currentUserEmail} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText(/team members \(0\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/no members found/i)).toBeInTheDocument();
  });

  it('should display different role badge colors', () => {
    const { container } = render(
      <TeamMemberList members={mockMembers} currentUserEmail={currentUserEmail} />,
      { wrapper: TestWrapper }
    );

    const roleBadges = container.querySelectorAll('.role-badge');
    expect(roleBadges.length).toBe(3);
    
    // Each badge should have a color class
    roleBadges.forEach(badge => {
      expect(badge.className).toMatch(/bg-\w+-500/);
    });
  });

  it('should clear search filter', async () => {
    const user = userEvent.setup();

    render(
      <TeamMemberList members={mockMembers} currentUserEmail={currentUserEmail} />,
      { wrapper: TestWrapper }
    );

    const searchInput = screen.getByLabelText(/search team members/i);
    
    await user.type(searchInput, 'Alice');
    expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();

    await user.clear(searchInput);
    await waitFor(() => {
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    });
  });
});

