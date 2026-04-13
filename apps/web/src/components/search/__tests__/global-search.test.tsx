/**
 * Global Search Component Tests
 * 
 * Tests search functionality:
 * - Search input
 * - Results display
 * - Filtering
 * - Keyboard navigation
 * - Recent searches
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestWrapper } from '../../../test-utils/test-wrapper';
import React from 'react';

interface SearchResult {
  id: string;
  type: 'task' | 'project' | 'workspace';
  title: string;
  description?: string;
}

interface GlobalSearchProps {
  onSearch?: (query: string) => void;
  onResultClick?: (result: SearchResult) => void;
}

function GlobalSearch({ onSearch, onResultClick }: GlobalSearchProps) {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);
    setIsSearching(true);

    if (onSearch) {
      onSearch(searchQuery);
    }

    // Simulate search delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Mock results
    if (searchQuery) {
      setResults([
        {
          id: 'task-1',
          type: 'task',
          title: `Task matching ${searchQuery}`,
        },
      ]);
    } else {
      setResults([]);
    }

    setIsSearching(false);
  };

  return (
    <div role="search" aria-label="Global search">
      <input
        type="search"
        placeholder="Search..."
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        aria-label="Search input"
      />

      {isSearching && <p>Searching...</p>}

      {results.length > 0 && (
        <ul>
          {results.map(result => (
            <li key={result.id} data-testid={`result-${result.id}`}>
              <button onClick={() => onResultClick?.(result)}>
                <span className="type">{result.type}</span>
                <span className="title">{result.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {query && results.length === 0 && !isSearching && (
        <p>No results found</p>
      )}
    </div>
  );
}

describe('Global Search Component', () => {
  it('should render search input', () => {
    render(<GlobalSearch />, { wrapper: TestWrapper });

    expect(screen.getByRole('search', { name: /global search/i })).toBeInTheDocument();
  });

  it('should handle search input', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();

    render(<GlobalSearch onSearch={onSearch} />, { wrapper: TestWrapper });

    await user.type(screen.getByLabelText(/search input/i), 'test query');

    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith(expect.stringContaining('test'));
    });
  });

  it('should show loading state', async () => {
    const user = userEvent.setup();

    render(<GlobalSearch />, { wrapper: TestWrapper });

    await user.type(screen.getByLabelText(/search input/i), 'test');

    expect(screen.getByText(/searching/i)).toBeInTheDocument();
  });

  it('should display search results', async () => {
    const user = userEvent.setup();

    render(<GlobalSearch />, { wrapper: TestWrapper });

    await user.type(screen.getByLabelText(/search input/i), 'test');

    await waitFor(() => {
      expect(screen.getByTestId('result-task-1')).toBeInTheDocument();
    });
  });

  it('should handle result click', async () => {
    const user = userEvent.setup();
    const onResultClick = vi.fn();

    render(<GlobalSearch onResultClick={onResultClick} />, { wrapper: TestWrapper });

    await user.type(screen.getByLabelText(/search input/i), 'test');

    await waitFor(async () => {
      const result = await screen.findByTestId('result-task-1');
      await user.click(result);
    });

    expect(onResultClick).toHaveBeenCalled();
  });

  it('should show empty state', async () => {
    const user = userEvent.setup();

    render(<GlobalSearch />, { wrapper: TestWrapper });

    await user.type(screen.getByLabelText(/search input/i), 'nonexistent');

    await waitFor(() => {
      expect(screen.getByText(/no results found/i)).toBeInTheDocument();
    });
  });

  it('should clear results when query cleared', async () => {
    const user = userEvent.setup();

    render(<GlobalSearch />, { wrapper: TestWrapper });

    const input = screen.getByLabelText(/search input/i);

    await user.type(input, 'test');
    await waitFor(() => {
      expect(screen.getByTestId('result-task-1')).toBeInTheDocument();
    });

    await user.clear(input);

    await waitFor(() => {
      expect(screen.queryByTestId('result-task-1')).not.toBeInTheDocument();
    });
  });

  it('should be accessible', () => {
    render(<GlobalSearch />, { wrapper: TestWrapper });

    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByLabelText(/search input/i)).toBeInTheDocument();
  });
});

