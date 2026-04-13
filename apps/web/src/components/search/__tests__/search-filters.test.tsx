/**
 * Search & Filters Tests
 * 
 * Tests search and filtering functionality:
 * - Search input
 * - Filter application
 * - Sort options
 * - Filter combinations
 * - Clear filters
 * - Saved filters
 * - Filter counts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

interface FilterOption {
  id: string
  label: string
  value: string
  count?: number
}

interface FilterGroup {
  id: string
  label: string
  options: FilterOption[]
  type: 'checkbox' | 'radio' | 'select'
}

interface SearchFiltersProps {
  filterGroups?: FilterGroup[]
  searchPlaceholder?: string
  onSearch?: (query: string) => void
  onFilterChange?: (filterId: string, values: string[]) => void
  onClearAll?: () => void
  onSaveFilter?: (name: string, filters: Record<string, string[]>) => void
  activeFilters?: Record<string, string[]>
  resultCount?: number
}

function SearchFilters({
  filterGroups = [],
  searchPlaceholder = 'Search...',
  onSearch,
  onFilterChange,
  onClearAll,
  onSaveFilter,
  activeFilters = {},
  resultCount,
}: SearchFiltersProps) {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [filters, setFilters] = React.useState<Record<string, string[]>>(activeFilters)
  const [filterName, setFilterName] = React.useState('')
  const [showSaveDialog, setShowSaveDialog] = React.useState(false)

  React.useEffect(() => {
    setFilters(activeFilters)
  }, [activeFilters])

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    onSearch?.(value)
  }

  const handleFilterToggle = (groupId: string, optionValue: string, type: 'checkbox' | 'radio') => {
    const currentValues = filters[groupId] || []

    let newValues: string[]
    if (type === 'radio') {
      newValues = [optionValue]
    } else {
      if (currentValues.includes(optionValue)) {
        newValues = currentValues.filter(v => v !== optionValue)
      } else {
        newValues = [...currentValues, optionValue]
      }
    }

    const newFilters = { ...filters, [groupId]: newValues }
    setFilters(newFilters)
    onFilterChange?.(groupId, newValues)
  }

  const handleSelectChange = (groupId: string, value: string) => {
    const newFilters = { ...filters, [groupId]: value ? [value] : [] }
    setFilters(newFilters)
    onFilterChange?.(groupId, value ? [value] : [])
  }

  const handleClearAll = () => {
    setSearchQuery('')
    setFilters({})
    onClearAll?.()
  }

  const handleSaveFilter = () => {
    if (filterName.trim()) {
      onSaveFilter?.(filterName, filters)
      setFilterName('')
      setShowSaveDialog(false)
    }
  }

  const activeFilterCount = Object.values(filters).reduce(
    (sum, values) => sum + values.length,
    0
  ) + (searchQuery ? 1 : 0)

  const renderFilterGroup = (group: FilterGroup) => {
    const groupValues = filters[group.id] || []

    if (group.type === 'select') {
      return (
        <div key={group.id} className="filter-group">
          <label htmlFor={group.id}>{group.label}</label>
          <select
            id={group.id}
            value={groupValues[0] || ''}
            onChange={(e) => handleSelectChange(group.id, e.target.value)}
            aria-label={`Filter by ${group.label}`}
          >
            <option value="">All</option>
            {group.options.map(option => (
              <option key={option.id} value={option.value}>
                {option.label}
                {option.count !== undefined && ` (${option.count})`}
              </option>
            ))}
          </select>
        </div>
      )
    }

    return (
      <div key={group.id} className="filter-group">
        <h3>{group.label}</h3>
        {group.options.map(option => (
          <label key={option.id} className="filter-option">
            <input
              type={group.type}
              name={group.type === 'radio' ? group.id : option.id}
              checked={groupValues.includes(option.value)}
              onChange={() => handleFilterToggle(group.id, option.value, group.type)}
              aria-label={`${option.label}${option.count !== undefined ? ` (${option.count})` : ''}`}
            />
            {option.label}
            {option.count !== undefined && (
              <span className="filter-count">({option.count})</span>
            )}
          </label>
        ))}
      </div>
    )
  }

  return (
    <div className="search-filters" data-testid="search-filters">
      {/* Search Bar */}
      <div className="search-bar">
        <input
          type="search"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          aria-label="Search"
        />
        {searchQuery && (
          <button
            onClick={() => handleSearchChange('')}
            aria-label="Clear search"
            className="clear-search"
          >
            ×
          </button>
        )}
      </div>

      {/* Active Filter Count */}
      {activeFilterCount > 0 && (
        <div className="filter-summary" aria-live="polite">
          <span>{activeFilterCount} active filters</span>
          <button onClick={handleClearAll} aria-label="Clear all filters">
            Clear all
          </button>
        </div>
      )}

      {/* Result Count */}
      {resultCount !== undefined && (
        <div className="result-count" aria-live="polite">
          {resultCount} results
        </div>
      )}

      {/* Filter Groups */}
      <div className="filter-groups">
        {filterGroups.map(renderFilterGroup)}
      </div>

      {/* Save Filter */}
      {activeFilterCount > 0 && (
        <div className="save-filter">
          {!showSaveDialog ? (
            <button
              onClick={() => setShowSaveDialog(true)}
              aria-label="Save current filters"
            >
              Save Filter
            </button>
          ) : (
            <div className="save-filter-dialog">
              <input
                type="text"
                placeholder="Filter name..."
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                aria-label="Filter name"
              />
              <button
                onClick={handleSaveFilter}
                disabled={!filterName.trim()}
                aria-label="Confirm save filter"
              >
                Save
              </button>
              <button
                onClick={() => setShowSaveDialog(false)}
                aria-label="Cancel save filter"
              >
                Cancel
              </button>
            </div>
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

describe('SearchFilters', () => {
  const mockFilterGroups: FilterGroup[] = [
    {
      id: 'status',
      label: 'Status',
      type: 'checkbox',
      options: [
        { id: 'todo', label: 'To Do', value: 'todo', count: 10 },
        { id: 'in_progress', label: 'In Progress', value: 'in_progress', count: 5 },
        { id: 'done', label: 'Done', value: 'done', count: 20 },
      ],
    },
    {
      id: 'priority',
      label: 'Priority',
      type: 'radio',
      options: [
        { id: 'high', label: 'High', value: 'high', count: 3 },
        { id: 'medium', label: 'Medium', value: 'medium', count: 8 },
        { id: 'low', label: 'Low', value: 'low', count: 4 },
      ],
    },
    {
      id: 'assignee',
      label: 'Assignee',
      type: 'select',
      options: [
        { id: 'user1', label: 'John Doe', value: 'user1' },
        { id: 'user2', label: 'Jane Smith', value: 'user2' },
      ],
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render search input', () => {
    render(<SearchFilters />, { wrapper: TestWrapper })

    expect(screen.getByLabelText('Search')).toBeInTheDocument()
  })

  it('should handle search input', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()

    render(<SearchFilters onSearch={onSearch} />, { wrapper: TestWrapper })

    await user.type(screen.getByLabelText('Search'), 'test query')

    expect(onSearch).toHaveBeenCalledWith('test query')
  })

  it('should show clear search button when query exists', async () => {
    const user = userEvent.setup()

    render(<SearchFilters />, { wrapper: TestWrapper })

    await user.type(screen.getByLabelText('Search'), 'test')

    expect(screen.getByLabelText('Clear search')).toBeInTheDocument()
  })

  it('should clear search query', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()

    render(<SearchFilters onSearch={onSearch} />, { wrapper: TestWrapper })

    const searchInput = screen.getByLabelText('Search')
    await user.type(searchInput, 'test')
    await user.click(screen.getByLabelText('Clear search'))

    expect(searchInput).toHaveValue('')
    expect(onSearch).toHaveBeenLastCalledWith('')
  })

  it('should render filter groups', () => {
    render(<SearchFilters filterGroups={mockFilterGroups} />, { wrapper: TestWrapper })

    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Priority')).toBeInTheDocument()
    expect(screen.getByText('Assignee')).toBeInTheDocument()
  })

  it('should render checkbox filters', () => {
    render(<SearchFilters filterGroups={mockFilterGroups} />, { wrapper: TestWrapper })

    expect(screen.getByLabelText(/to do/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/in progress/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/done/i)).toBeInTheDocument()
  })

  it('should render radio filters', () => {
    render(<SearchFilters filterGroups={mockFilterGroups} />, { wrapper: TestWrapper })

    expect(screen.getByLabelText(/high/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/medium/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/low/i)).toBeInTheDocument()
  })

  it('should render select filters', () => {
    render(<SearchFilters filterGroups={mockFilterGroups} />, { wrapper: TestWrapper })

    expect(screen.getByLabelText(/filter by assignee/i)).toBeInTheDocument()
  })

  it('should display filter counts', () => {
    render(<SearchFilters filterGroups={mockFilterGroups} />, { wrapper: TestWrapper })

    expect(screen.getByText('(10)')).toBeInTheDocument()
    expect(screen.getByText('(5)')).toBeInTheDocument()
    expect(screen.getByText('(20)')).toBeInTheDocument()
  })

  it('should handle checkbox filter toggle', async () => {
    const user = userEvent.setup()
    const onFilterChange = vi.fn()

    render(
      <SearchFilters filterGroups={mockFilterGroups} onFilterChange={onFilterChange} />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByLabelText(/to do/i))

    expect(onFilterChange).toHaveBeenCalledWith('status', ['todo'])
  })

  it('should handle multiple checkbox selections', async () => {
    const user = userEvent.setup()
    const onFilterChange = vi.fn()

    render(
      <SearchFilters filterGroups={mockFilterGroups} onFilterChange={onFilterChange} />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByLabelText(/to do/i))
    await user.click(screen.getByLabelText(/in progress/i))

    expect(onFilterChange).toHaveBeenCalledWith('status', ['todo', 'in_progress'])
  })

  it('should handle radio filter selection', async () => {
    const user = userEvent.setup()
    const onFilterChange = vi.fn()

    render(
      <SearchFilters filterGroups={mockFilterGroups} onFilterChange={onFilterChange} />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByLabelText(/high/i))

    expect(onFilterChange).toHaveBeenCalledWith('priority', ['high'])
  })

  it('should handle select filter change', async () => {
    const user = userEvent.setup()
    const onFilterChange = vi.fn()

    render(
      <SearchFilters filterGroups={mockFilterGroups} onFilterChange={onFilterChange} />,
      { wrapper: TestWrapper }
    )

    await user.selectOptions(screen.getByLabelText(/filter by assignee/i), 'user1')

    expect(onFilterChange).toHaveBeenCalledWith('assignee', ['user1'])
  })

  it('should show active filter count', async () => {
    const user = userEvent.setup()

    render(<SearchFilters filterGroups={mockFilterGroups} />, { wrapper: TestWrapper })

    await user.click(screen.getByLabelText(/to do/i))
    await user.click(screen.getByLabelText(/high/i))

    await waitFor(() => {
      expect(screen.getByText('2 active filters')).toBeInTheDocument()
    })
  })

  it('should include search query in active filter count', async () => {
    const user = userEvent.setup()

    render(<SearchFilters filterGroups={mockFilterGroups} />, { wrapper: TestWrapper })

    await user.type(screen.getByLabelText('Search'), 'test')

    await waitFor(() => {
      expect(screen.getByText('1 active filters')).toBeInTheDocument()
    })
  })

  it('should clear all filters', async () => {
    const user = userEvent.setup()
    const onClearAll = vi.fn()

    render(
      <SearchFilters filterGroups={mockFilterGroups} onClearAll={onClearAll} />,
      { wrapper: TestWrapper }
    )

    await user.type(screen.getByLabelText('Search'), 'test')
    await user.click(screen.getByLabelText(/to do/i))

    await user.click(screen.getByLabelText(/clear all filters/i))

    expect(onClearAll).toHaveBeenCalled()
    expect(screen.getByLabelText('Search')).toHaveValue('')
  })

  it('should display result count', () => {
    render(
      <SearchFilters filterGroups={mockFilterGroups} resultCount={42} />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByText('42 results')).toBeInTheDocument()
  })

  it('should show save filter button when filters are active', async () => {
    const user = userEvent.setup()

    render(<SearchFilters filterGroups={mockFilterGroups} />, { wrapper: TestWrapper })

    expect(screen.queryByLabelText(/save current filters/i)).not.toBeInTheDocument()

    await user.click(screen.getByLabelText(/to do/i))

    await waitFor(() => {
      expect(screen.getByLabelText(/save current filters/i)).toBeInTheDocument()
    })
  })

  it('should open save filter dialog', async () => {
    const user = userEvent.setup()

    render(<SearchFilters filterGroups={mockFilterGroups} />, { wrapper: TestWrapper })

    await user.click(screen.getByLabelText(/to do/i))
    await user.click(screen.getByLabelText(/save current filters/i))

    expect(screen.getByLabelText('Filter name')).toBeInTheDocument()
  })

  it('should save filter with name', async () => {
    const user = userEvent.setup()
    const onSaveFilter = vi.fn()

    render(
      <SearchFilters filterGroups={mockFilterGroups} onSaveFilter={onSaveFilter} />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByLabelText(/to do/i))
    await user.click(screen.getByLabelText(/save current filters/i))

    await user.type(screen.getByLabelText('Filter name'), 'My Custom Filter')
    await user.click(screen.getByLabelText(/confirm save filter/i))

    expect(onSaveFilter).toHaveBeenCalledWith('My Custom Filter', {
      status: ['todo'],
    })
  })

  it('should cancel save filter dialog', async () => {
    const user = userEvent.setup()

    render(<SearchFilters filterGroups={mockFilterGroups} />, { wrapper: TestWrapper })

    await user.click(screen.getByLabelText(/to do/i))
    await user.click(screen.getByLabelText(/save current filters/i))

    await user.click(screen.getByLabelText(/cancel save filter/i))

    expect(screen.queryByLabelText('Filter name')).not.toBeInTheDocument()
  })

  it('should disable save button when filter name is empty', async () => {
    const user = userEvent.setup()

    render(<SearchFilters filterGroups={mockFilterGroups} />, { wrapper: TestWrapper })

    await user.click(screen.getByLabelText(/to do/i))
    await user.click(screen.getByLabelText(/save current filters/i))

    const saveButton = screen.getByLabelText(/confirm save filter/i)
    expect(saveButton).toBeDisabled()
  })

  it('should uncheck filter when clicked again', async () => {
    const user = userEvent.setup()
    const onFilterChange = vi.fn()

    render(
      <SearchFilters filterGroups={mockFilterGroups} onFilterChange={onFilterChange} />,
      { wrapper: TestWrapper }
    )

    const todoCheckbox = screen.getByLabelText(/to do/i)

    // Check
    await user.click(todoCheckbox)
    expect(onFilterChange).toHaveBeenCalledWith('status', ['todo'])

    // Uncheck
    await user.click(todoCheckbox)
    expect(onFilterChange).toHaveBeenCalledWith('status', [])
  })

  it('should allow only one radio selection per group', async () => {
    const user = userEvent.setup()
    const onFilterChange = vi.fn()

    render(
      <SearchFilters filterGroups={mockFilterGroups} onFilterChange={onFilterChange} />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByLabelText(/high/i))
    expect(onFilterChange).toHaveBeenCalledWith('priority', ['high'])

    await user.click(screen.getByLabelText(/medium/i))
    expect(onFilterChange).toHaveBeenCalledWith('priority', ['medium'])
  })
})

