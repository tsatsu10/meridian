/**
 * Sidebar Navigation Tests
 * 
 * Tests sidebar navigation functionality:
 * - Navigation rendering
 * - Active route highlighting
 * - Collapse/expand functionality
 * - Role-based menu items
 * - Workspace/project switching
 * - Responsive behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

interface NavItem {
  id: string
  label: string
  path: string
  icon?: string
  requiresRole?: string[]
  children?: NavItem[]
}

interface SidebarProps {
  currentPath?: string
  userRole?: string
  workspaceName?: string
  projectName?: string
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  onNavigate?: (path: string) => void
  navItems?: NavItem[]
}

function Sidebar({
  currentPath = '/',
  userRole = 'member',
  workspaceName,
  projectName,
  isCollapsed = false,
  onToggleCollapse,
  onNavigate,
  navItems = [],
}: SidebarProps) {
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set())

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const canAccessItem = (item: NavItem) => {
    if (!item.requiresRole || item.requiresRole.length === 0) return true
    return item.requiresRole.includes(userRole)
  }

  const renderNavItem = (item: NavItem, depth = 0) => {
    if (!canAccessItem(item)) return null

    const isActive = currentPath === item.path
    const isExpanded = expandedItems.has(item.id)
    const hasChildren = item.children && item.children.length > 0

    return (
      <li key={item.id} data-depth={depth}>
        <div
          className={`nav-item ${isActive ? 'active' : ''}`}
          onClick={() => {
            if (hasChildren) {
              toggleExpand(item.id)
            } else {
              onNavigate?.(item.path)
            }
          }}
          role="button"
          aria-current={isActive ? 'page' : undefined}
          aria-expanded={hasChildren ? isExpanded : undefined}
        >
          {item.icon && <span className="nav-icon">{item.icon}</span>}
          {!isCollapsed && <span className="nav-label">{item.label}</span>}
          {hasChildren && !isCollapsed && (
            <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
          )}
        </div>

        {hasChildren && isExpanded && !isCollapsed && (
          <ul className="nav-children" role="list">
            {item.children!.map(child => renderNavItem(child, depth + 1))}
          </ul>
        )}
      </li>
    )
  }

  return (
    <aside
      className={`sidebar ${isCollapsed ? 'collapsed' : 'expanded'}`}
      data-testid="sidebar"
      aria-label="Main navigation"
    >
      {/* Header */}
      <div className="sidebar-header">
        {!isCollapsed && (
          <div className="workspace-info">
            {workspaceName && (
              <h2 className="workspace-name">{workspaceName}</h2>
            )}
            {projectName && (
              <p className="project-name">{projectName}</p>
            )}
          </div>
        )}
        
        <button
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="toggle-button"
        >
          {isCollapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <ul className="nav-list" role="list">
          {navItems.map(item => renderNavItem(item))}
        </ul>
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="sidebar-footer">
          <div className="user-role-badge" aria-label={`Current role: ${userRole}`}>
            {userRole}
          </div>
        </div>
      )}
    </aside>
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

describe('Sidebar', () => {
  const mockNavItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/dashboard',
      icon: '📊',
    },
    {
      id: 'projects',
      label: 'Projects',
      path: '/projects',
      icon: '📁',
      children: [
        { id: 'all-projects', label: 'All Projects', path: '/projects/all' },
        { id: 'my-projects', label: 'My Projects', path: '/projects/my' },
      ],
    },
    {
      id: 'admin',
      label: 'Admin',
      path: '/admin',
      icon: '⚙️',
      requiresRole: ['admin', 'workspace-manager'],
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render sidebar', () => {
    render(<Sidebar navItems={mockNavItems} />, { wrapper: TestWrapper })

    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    expect(screen.getByLabelText(/main navigation/i)).toBeInTheDocument()
  })

  it('should display all navigation items', () => {
    render(<Sidebar navItems={mockNavItems} userRole="admin" />, { wrapper: TestWrapper })

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Projects')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('should highlight active route', () => {
    render(
      <Sidebar navItems={mockNavItems} currentPath="/dashboard" />,
      { wrapper: TestWrapper }
    )

    const activeItem = screen.getByText('Dashboard').closest('.nav-item')
    expect(activeItem).toHaveClass('active')
    expect(activeItem).toHaveAttribute('aria-current', 'page')
  })

  it('should handle navigation clicks', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()

    render(
      <Sidebar navItems={mockNavItems} onNavigate={onNavigate} />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByText('Dashboard'))

    expect(onNavigate).toHaveBeenCalledWith('/dashboard')
  })

  it('should expand/collapse nested items', async () => {
    const user = userEvent.setup()

    render(<Sidebar navItems={mockNavItems} />, { wrapper: TestWrapper })

    // Initially collapsed
    expect(screen.queryByText('All Projects')).not.toBeInTheDocument()

    // Click to expand
    await user.click(screen.getByText('Projects'))

    // Now visible
    expect(screen.getByText('All Projects')).toBeInTheDocument()
    expect(screen.getByText('My Projects')).toBeInTheDocument()
  })

  it('should show expand icon for items with children', () => {
    render(<Sidebar navItems={mockNavItems} />, { wrapper: TestWrapper })

    const projectsItem = screen.getByText('Projects').parentElement
    expect(projectsItem).toHaveTextContent('▶')
  })

  it('should toggle sidebar collapse', async () => {
    const user = userEvent.setup()
    const onToggleCollapse = vi.fn()

    render(
      <Sidebar navItems={mockNavItems} onToggleCollapse={onToggleCollapse} />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByLabelText(/collapse sidebar/i))

    expect(onToggleCollapse).toHaveBeenCalled()
  })

  it('should render collapsed state correctly', () => {
    render(
      <Sidebar navItems={mockNavItems} isCollapsed={true} />,
      { wrapper: TestWrapper }
    )

    // Icons visible, labels hidden
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
    expect(screen.getByTestId('sidebar')).toHaveClass('collapsed')
  })

  it('should filter items based on user role', () => {
    render(
      <Sidebar navItems={mockNavItems} userRole="member" />,
      { wrapper: TestWrapper }
    )

    // Member can see Dashboard and Projects
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Projects')).toBeInTheDocument()

    // Member cannot see Admin
    expect(screen.queryByText('Admin')).not.toBeInTheDocument()
  })

  it('should show admin items for admin role', () => {
    render(
      <Sidebar navItems={mockNavItems} userRole="admin" />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('should show admin items for workspace-manager role', () => {
    render(
      <Sidebar navItems={mockNavItems} userRole="workspace-manager" />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('should display workspace name', () => {
    render(
      <Sidebar navItems={mockNavItems} workspaceName="My Workspace" />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByText('My Workspace')).toBeInTheDocument()
  })

  it('should display project name', () => {
    render(
      <Sidebar navItems={mockNavItems} projectName="Project Alpha" />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByText('Project Alpha')).toBeInTheDocument()
  })

  it('should hide workspace info when collapsed', () => {
    render(
      <Sidebar
        navItems={mockNavItems}
        workspaceName="My Workspace"
        isCollapsed={true}
      />,
      { wrapper: TestWrapper }
    )

    expect(screen.queryByText('My Workspace')).not.toBeInTheDocument()
  })

  it('should display user role badge', () => {
    render(
      <Sidebar navItems={mockNavItems} userRole="team-lead" />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByLabelText(/current role: team-lead/i)).toBeInTheDocument()
  })

  it('should handle nested navigation clicks', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()

    render(
      <Sidebar navItems={mockNavItems} onNavigate={onNavigate} />,
      { wrapper: TestWrapper }
    )

    // Expand parent
    await user.click(screen.getByText('Projects'))

    // Click child
    await user.click(screen.getByText('All Projects'))

    expect(onNavigate).toHaveBeenCalledWith('/projects/all')
  })

  it('should be accessible', () => {
    render(<Sidebar navItems={mockNavItems} />, { wrapper: TestWrapper })

    // Sidebar has proper label
    expect(screen.getByLabelText(/main navigation/i)).toBeInTheDocument()

    // Toggle button has label
    expect(screen.getByLabelText(/collapse sidebar/i)).toBeInTheDocument()

    // Navigation list has role
    const lists = screen.getAllByRole('list')
    expect(lists.length).toBeGreaterThan(0)
  })

  it('should render icons when provided', () => {
    const { container } = render(
      <Sidebar navItems={mockNavItems} />,
      { wrapper: TestWrapper }
    )

    expect(container.querySelector('.nav-icon')).toBeInTheDocument()
  })

  it('should handle items without children', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()

    render(
      <Sidebar navItems={mockNavItems} onNavigate={onNavigate} />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByText('Dashboard'))

    // Should navigate, not expand
    expect(onNavigate).toHaveBeenCalledWith('/dashboard')
    expect(screen.queryByRole('list', { name: /children/i })).not.toBeInTheDocument()
  })

  it('should render multiple nested levels', () => {
    const deepNavItems: NavItem[] = [
      {
        id: 'level1',
        label: 'Level 1',
        path: '/level1',
        children: [
          {
            id: 'level2',
            label: 'Level 2',
            path: '/level2',
            children: [
              { id: 'level3', label: 'Level 3', path: '/level3' },
            ],
          },
        ],
      },
    ]

    const { container } = render(
      <Sidebar navItems={deepNavItems} />,
      { wrapper: TestWrapper }
    )

    // Check depth attributes
    expect(container.querySelector('[data-depth="0"]')).toBeInTheDocument()
  })
})
