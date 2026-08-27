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

import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TestWrapper } from "../../../test-utils/test-wrapper";
import React from "react";

interface SearchResult {
  id: string;
  type: "task" | "project" | "workspace";
  title: string;
  description?: string;
}

interface GlobalSearchProps {
  onSearch?: (query: string) => void;
  onResultClick?: (result: SearchResult) => void;
  /**
   * How long the simulated search takes. Injectable so the loading-state test
   * can make the in-flight window unbounded instead of racing a real 100ms
   * timer — see the note on that test.
   */
  searchDelay?: number;
}

function GlobalSearch({
  onSearch,
  onResultClick,
  searchDelay = 100,
}: GlobalSearchProps) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const latestRequest = React.useRef(0);

  const handleSearch = async (searchQuery: string) => {
    // Typing "test" fires one search per keystroke, each with its own delay.
    // Without this guard an earlier keystroke's delay can resolve *after* the
    // final keystroke set isSearching(true) and clear the loading state while
    // the latest search is still in flight — a stale-response race that made
    // the loading-state assertion below fail under parallel-suite load.
    const requestId = ++latestRequest.current;

    setQuery(searchQuery);
    setIsSearching(true);

    if (onSearch) {
      onSearch(searchQuery);
    }

    // Simulate search delay
    await new Promise((resolve) => setTimeout(resolve, searchDelay));

    // A superseded search must not publish its results or clear the spinner.
    if (requestId !== latestRequest.current) {
      return;
    }

    // Mock results — only queries containing "test" match, so searches like
    // "nonexistent" exercise the empty state
    if (searchQuery.toLowerCase().includes("test")) {
      setResults([
        {
          id: "task-1",
          type: "task",
          title: `Task matching ${searchQuery}`,
        },
      ]);
    } else {
      setResults([]);
    }

    setIsSearching(false);
  };

  return (
    <div
      // biome-ignore lint/a11y/useSemanticElements: test mock component
      role="search"
      aria-label="Global search"
    >
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
          {results.map((result) => (
            <li key={result.id} data-testid={`result-${result.id}`}>
              <button type="button" onClick={() => onResultClick?.(result)}>
                <span className="type">{result.type}</span>
                <span className="title">{result.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {query && results.length === 0 && !isSearching && <p>No results found</p>}
    </div>
  );
}

describe("Global Search Component", () => {
  it("should render search input", () => {
    render(<GlobalSearch />, { wrapper: TestWrapper });

    expect(
      screen.getByRole("search", { name: /global search/i }),
    ).toBeInTheDocument();
  });

  it("should handle search input", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();

    render(<GlobalSearch onSearch={onSearch} />, { wrapper: TestWrapper });

    await user.type(screen.getByLabelText(/search input/i), "test query");

    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith(expect.stringContaining("test"));
    });
  });

  it("should show loading state", async () => {
    const user = userEvent.setup();

    // A search that outlives the test. With the default 100ms delay the spinner
    // only exists for a 100ms window of *wall* time, so under parallel-suite
    // load the assertion could arrive after it had already cleared — this test
    // flaked twice for that reason. A search that never finishes makes "is the
    // spinner shown while one is in flight" a question about state, not timing.
    // Finite on purpose: setTimeout coerces Infinity to 1ms, which would invert
    // this and make the window shorter than the default.
    render(<GlobalSearch searchDelay={1_000_000} />, {
      wrapper: TestWrapper,
    });

    await user.type(screen.getByLabelText(/search input/i), "test");

    expect(await screen.findByText(/searching/i)).toBeInTheDocument();
  });

  it("should display search results", async () => {
    const user = userEvent.setup();

    render(<GlobalSearch />, { wrapper: TestWrapper });

    await user.type(screen.getByLabelText(/search input/i), "test");

    await waitFor(() => {
      expect(screen.getByTestId("result-task-1")).toBeInTheDocument();
    });
  });

  it("should handle result click", async () => {
    const user = userEvent.setup();
    const onResultClick = vi.fn();

    render(<GlobalSearch onResultClick={onResultClick} />, {
      wrapper: TestWrapper,
    });

    await user.type(screen.getByLabelText(/search input/i), "test");

    // The click handler lives on the button inside the result item
    const result = await screen.findByTestId("result-task-1");
    await user.click(within(result).getByRole("button"));

    expect(onResultClick).toHaveBeenCalled();
  });

  it("should show empty state", async () => {
    const user = userEvent.setup();

    render(<GlobalSearch />, { wrapper: TestWrapper });

    await user.type(screen.getByLabelText(/search input/i), "nonexistent");

    await waitFor(() => {
      expect(screen.getByText(/no results found/i)).toBeInTheDocument();
    });
  });

  it("should clear results when query cleared", async () => {
    const user = userEvent.setup();

    render(<GlobalSearch />, { wrapper: TestWrapper });

    const input = screen.getByLabelText(/search input/i);

    await user.type(input, "test");
    await waitFor(() => {
      expect(screen.getByTestId("result-task-1")).toBeInTheDocument();
    });

    await user.clear(input);

    await waitFor(() => {
      expect(screen.queryByTestId("result-task-1")).not.toBeInTheDocument();
    });
  });

  it("should be accessible", () => {
    render(<GlobalSearch />, { wrapper: TestWrapper });

    expect(screen.getByRole("search")).toBeInTheDocument();
    expect(screen.getByLabelText(/search input/i)).toBeInTheDocument();
  });
});
