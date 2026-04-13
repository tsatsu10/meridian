import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../../test/utils'
import QuickMessageSearch from '../quick-message-search'
import * as useMessageSearchModule from '../../../hooks/use-message-search'

// Mock the search hook
vi.mock('../../../hooks/use-message-search', () => ({
  useQuickMessageSearch: vi.fn(),
}))

const mockSearchResults = {
  data: {
    messages: [
      {
        id: 'msg-1',
        content: 'Hello world test message',
        userEmail: 'user1@example.com',
        userName: 'User One',
        createdAt: new Date('2024-01-01T10:00:00Z'),
        isPinned: false,
        parentMessageId: null,
      },
      {
        id: 'msg-2',
        content: 'Another test message here',
        userEmail: 'user2@example.com',
        userName: 'User Two',
        createdAt: new Date('2024-01-01T11:00:00Z'),
        isPinned: true,
        parentMessageId: 'msg-1',
      },
    ],
    pagination: {
      hasMore: true,
    },
  },
  isLoading: false,
}

describe('QuickMessageSearch', () => {
  const mockOnMessageSelect = vi.fn()
  const mockOnAdvancedSearch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useMessageSearchModule.useQuickMessageSearch).mockReturnValue(mockSearchResults)
  })

  it('renders search input with placeholder', () => {
    render(
      <QuickMessageSearch
        channelId="channel-1"
        placeholder="Search messages..."
        onMessageSelect={mockOnMessageSelect}
        onAdvancedSearch={mockOnAdvancedSearch}
      />
    )

    expect(screen.getByPlaceholderText('Search messages...')).toBeInTheDocument()
  })

  it('shows loading state when searching', () => {
    vi.mocked(useMessageSearchModule.useQuickMessageSearch).mockReturnValue({
      ...mockSearchResults,
      isLoading: true,
    })

    render(
      <QuickMessageSearch
        channelId="channel-1"
        onMessageSelect={mockOnMessageSelect}
        onAdvancedSearch={mockOnAdvancedSearch}
      />
    )

    const input = screen.getByPlaceholderText('Search messages...')
    fireEvent.change(input, { target: { value: 'test' } })

    // Check for loading spinner by its container
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('shows search results when query has 2+ characters', async () => {
    const user = userEvent.setup()
    
    render(
      <QuickMessageSearch
        channelId="channel-1"
        onMessageSelect={mockOnMessageSelect}
        onAdvancedSearch={mockOnAdvancedSearch}
      />
    )

    const input = screen.getByPlaceholderText('Search messages...')
    await user.type(input, 'test')

    await waitFor(() => {
      expect(screen.getByText((content, element) => {
        return element && element.textContent === 'Hello world test message'
      })).toBeInTheDocument()
      expect(screen.getByText('User One')).toBeInTheDocument()
      expect(screen.getByText('User Two')).toBeInTheDocument()
    })
  })

  it('highlights search query in results', async () => {
    const user = userEvent.setup()
    
    render(
      <QuickMessageSearch
        channelId="channel-1"
        onMessageSelect={mockOnMessageSelect}
        onAdvancedSearch={mockOnAdvancedSearch}
      />
    )

    const input = screen.getByPlaceholderText('Search messages...')
    await user.type(input, 'test')

    await waitFor(() => {
      const highlightedElements = screen.getAllByText('test')
      expect(highlightedElements.some(el => el.tagName.toLowerCase() === 'mark')).toBe(true)
    })
  })

  it('shows badges for pinned and reply messages', async () => {
    const user = userEvent.setup()
    
    render(
      <QuickMessageSearch
        channelId="channel-1"
        onMessageSelect={mockOnMessageSelect}
        onAdvancedSearch={mockOnAdvancedSearch}
      />
    )

    const input = screen.getByPlaceholderText('Search messages...')
    await user.type(input, 'test')

    await waitFor(() => {
      expect(screen.getByText('Pinned')).toBeInTheDocument()
      expect(screen.getByText('Reply')).toBeInTheDocument()
    })
  })

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup()
    
    render(
      <QuickMessageSearch
        channelId="channel-1"
        onMessageSelect={mockOnMessageSelect}
        onAdvancedSearch={mockOnAdvancedSearch}
      />
    )

    const input = screen.getByPlaceholderText('Search messages...')
    await user.type(input, 'test')

    // Wait for results to appear
    await waitFor(() => {
      expect(screen.getByText((content, element) => {
        return element && element.textContent === 'Hello world test message'
      })).toBeInTheDocument()
    })

    // Test arrow key navigation
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{ArrowUp}')

    // Test Enter to select
    await user.keyboard('{Enter}')

    expect(mockOnMessageSelect).toHaveBeenCalledWith('msg-1', undefined)
  })

  it('handles Escape key to close results', async () => {
    const user = userEvent.setup()
    
    render(
      <QuickMessageSearch
        channelId="channel-1"
        onMessageSelect={mockOnMessageSelect}
        onAdvancedSearch={mockOnAdvancedSearch}
      />
    )

    const input = screen.getByPlaceholderText('Search messages...')
    await user.type(input, 'test')

    // Wait for results to appear
    await waitFor(() => {
      expect(screen.getByText((content, element) => {
        return element?.textContent === 'Hello world test message'
      })).toBeInTheDocument()
    })

    // Press Escape
    await user.keyboard('{Escape}')

    expect(screen.queryByText((content, element) => {
      return element?.textContent === 'Hello world test message'
    })).not.toBeInTheDocument()
    expect(input).toHaveValue('')
  })

  it('shows "more results" indicator when hasMore is true', async () => {
    const user = userEvent.setup()
    
    render(
      <QuickMessageSearch
        channelId="channel-1"
        onMessageSelect={mockOnMessageSelect}
        onAdvancedSearch={mockOnAdvancedSearch}
      />
    )

    const input = screen.getByPlaceholderText('Search messages...')
    await user.type(input, 'test')

    await waitFor(() => {
      expect(screen.getByText(/Showing first 2 results/)).toBeInTheDocument()
      expect(screen.getByText('See all results')).toBeInTheDocument()
    })
  })

  it('calls onAdvancedSearch when advanced search is clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <QuickMessageSearch
        channelId="channel-1"
        onMessageSelect={mockOnMessageSelect}
        onAdvancedSearch={mockOnAdvancedSearch}
      />
    )

    const advancedButton = screen.getByText('Advanced')
    await user.click(advancedButton)

    expect(mockOnAdvancedSearch).toHaveBeenCalled()
  })

  it('shows keyboard shortcuts hint when results are open', async () => {
    const user = userEvent.setup()
    
    render(
      <QuickMessageSearch
        channelId="channel-1"
        onMessageSelect={mockOnMessageSelect}
        onAdvancedSearch={mockOnAdvancedSearch}
      />
    )

    const input = screen.getByPlaceholderText('Search messages...')
    await user.type(input, 'test')

    await waitFor(() => {
      expect(screen.getByText('Navigate')).toBeInTheDocument()
      expect(screen.getByText('Select')).toBeInTheDocument()
      expect(screen.getByText('Close')).toBeInTheDocument()
    })
  })

  it('shows no results message when search returns empty', async () => {
    const user = userEvent.setup()
    
    vi.mocked(useMessageSearchModule.useQuickMessageSearch).mockReturnValue({
      data: { messages: [], pagination: { hasMore: false } },
      isLoading: false,
    })

    render(
      <QuickMessageSearch
        channelId="channel-1"
        onMessageSelect={mockOnMessageSelect}
        onAdvancedSearch={mockOnAdvancedSearch}
      />
    )

    const input = screen.getByPlaceholderText('Search messages...')
    await user.type(input, 'nonexistent')

    await waitFor(() => {
      expect(screen.getByText('No messages found')).toBeInTheDocument()
      expect(screen.getByText('Try advanced search')).toBeInTheDocument()
    })
  })

  it('closes results when clicking outside', async () => {
    const user = userEvent.setup()
    
    render(
      <div>
        <QuickMessageSearch
          channelId="channel-1"
          onMessageSelect={mockOnMessageSelect}
          onAdvancedSearch={mockOnAdvancedSearch}
        />
        <div data-testid="outside">Outside element</div>
      </div>
    )

    const input = screen.getByPlaceholderText('Search messages...')
    await user.type(input, 'test')

    // Wait for results to appear
    await waitFor(() => {
      expect(screen.getByText((content, element) => {
        return element?.textContent === 'Hello world test message'
      })).toBeInTheDocument()
    })

    // Click outside
    await user.click(screen.getByTestId('outside'))

    await waitFor(() => {
      expect(screen.queryByText((content, element) => {
        return element?.textContent === 'Hello world test message'
      })).not.toBeInTheDocument()
    })
  })
})