/**
 * Workspace Switcher Tests
 * 
 * Tests workspace switching functionality:
 * - Workspace list display
 * - Active workspace indication
 * - Workspace switching
 * - Navigation
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

interface Workspace {
  id: string
  name: string
  description?: string
}

interface WorkspaceSwitcherProps {
  workspaces: Workspace[]
  activeWorkspaceId: string
  onWorkspaceChange: (workspaceId: string) => void
}

function WorkspaceSwitcher({ workspaces, activeWorkspaceId, onWorkspaceChange }: WorkspaceSwitcherProps) {
  return (
    <div role="navigation" aria-label="Workspace switcher">
      <h3>Workspaces</h3>
      <ul>
        {workspaces.map((workspace) => (
          <li key={workspace.id}>
            <button
              onClick={() => onWorkspaceChange(workspace.id)}
              aria-current={workspace.id === activeWorkspaceId ? 'true' : undefined}
              className={workspace.id === activeWorkspaceId ? 'active' : ''}
            >
              {workspace.name}
            </button>
          </li>
        ))}
      </ul>
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

describe('WorkspaceSwitcher', () => {
  const mockWorkspaces = [
    { id: 'ws-1', name: 'Personal Workspace' },
    { id: 'ws-2', name: 'Team Workspace' },
    { id: 'ws-3', name: 'Client Projects' },
  ]

  it('should render workspace list', () => {
    const mockOnChange = vi.fn()

    render(
      <WorkspaceSwitcher
        workspaces={mockWorkspaces}
        activeWorkspaceId="ws-1"
        onWorkspaceChange={mockOnChange}
      />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByText('Personal Workspace')).toBeInTheDocument()
    expect(screen.getByText('Team Workspace')).toBeInTheDocument()
    expect(screen.getByText('Client Projects')).toBeInTheDocument()
  })

  it('should indicate active workspace', () => {
    const mockOnChange = vi.fn()

    render(
      <WorkspaceSwitcher
        workspaces={mockWorkspaces}
        activeWorkspaceId="ws-2"
        onWorkspaceChange={mockOnChange}
      />,
      { wrapper: TestWrapper }
    )

    const activeButton = screen.getByText('Team Workspace')
    expect(activeButton).toHaveAttribute('aria-current', 'true')
    expect(activeButton).toHaveClass('active')
  })

  it('should handle workspace switching', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()

    render(
      <WorkspaceSwitcher
        workspaces={mockWorkspaces}
        activeWorkspaceId="ws-1"
        onWorkspaceChange={mockOnChange}
      />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByText('Team Workspace'))

    expect(mockOnChange).toHaveBeenCalledWith('ws-2')
  })

  it('should handle empty workspace list', () => {
    const mockOnChange = vi.fn()

    render(
      <WorkspaceSwitcher
        workspaces={[]}
        activeWorkspaceId=""
        onWorkspaceChange={mockOnChange}
      />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByRole('navigation')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('should be accessible', () => {
    const mockOnChange = vi.fn()

    render(
      <WorkspaceSwitcher
        workspaces={mockWorkspaces}
        activeWorkspaceId="ws-1"
        onWorkspaceChange={mockOnChange}
      />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByRole('navigation', { name: /workspace switcher/i })).toBeInTheDocument()
  })

  it('should display all workspaces regardless of status', () => {
    const mixedWorkspaces = [
      ...mockWorkspaces,
      { id: 'ws-4', name: 'Archived Workspace' },
    ]
    const mockOnChange = vi.fn()

    render(
      <WorkspaceSwitcher
        workspaces={mixedWorkspaces}
        activeWorkspaceId="ws-1"
        onWorkspaceChange={mockOnChange}
      />,
      { wrapper: TestWrapper }
    )

    expect(screen.getAllByRole('button')).toHaveLength(4)
  })

  it('should handle single workspace', () => {
    const singleWorkspace = [{ id: 'ws-1', name: 'Only Workspace' }]
    const mockOnChange = vi.fn()

    render(
      <WorkspaceSwitcher
        workspaces={singleWorkspace}
        activeWorkspaceId="ws-1"
        onWorkspaceChange={mockOnChange}
      />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByText('Only Workspace')).toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveAttribute('aria-current', 'true')
  })
})

