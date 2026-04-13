/**
 * Search Hook with Debouncing
 * 
 * React hook for performing full-text search with fuzzy matching
 * Includes debouncing, caching, and real-time results
 * 
 * @category Hooks
 * @example
 * const { results, loading, search } = useSearch();
 * 
 * const handleSearch = (query) => {
 *   search(query, { workspaceId: 'ws123' });
 * };
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL, API_URL } from '@/constants/urls';

export interface SearchResult {
  projects: Array<{
    id: string;
    name: string;
    description: string | null;
    status: string | null;
    priority: string | null;
    ownerId: string;
    score: number;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    description: string | null;
    status: string | null;
    priority: string | null;
    projectId: string;
    score: number;
  }>;
  totalResults: number;
  queryTime: number;
}

export interface SearchOptions {
  workspaceId: string;
  limit?: number;
  minScore?: number;
  projectId?: string;
  searchProjects?: boolean;
  searchTasks?: boolean;
}

export interface UseSearchOptions {
  debounceDelay?: number;
  cacheTime?: number;
  enabled?: boolean;
}

/**
 * Perform workspace search with fuzzy matching
 */
async function fetchWorkspaceSearch(
  query: string,
  options: SearchOptions
): Promise<SearchResult> {
  const params = new URLSearchParams({
    workspaceId: options.workspaceId,
    query,
    limit: String(options.limit ?? 30),
    minScore: String(options.minScore ?? 0.5),
    searchProjects: String(options.searchProjects ?? true),
    searchTasks: String(options.searchTasks ?? true),
  });

  if (options.projectId) {
    params.append("projectId", options.projectId);
  }

  const response = await fetch(`${API_BASE_URL}/search/fuzzy/workspace?${params}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Search failed");
  }

  const data = await response.json();
  return data.data;
}

/**
 * Perform project search with fuzzy matching
 */
async function fetchProjectSearch(
  query: string,
  workspaceId: string,
  options?: {
    limit?: number;
    minScore?: number;
    status?: string[];
    priority?: string[];
  }
): Promise<any> {
  const params = new URLSearchParams({
    workspaceId,
    query,
    limit: String(options?.limit ?? 50),
    minScore: String(options?.minScore ?? 0.5),
  });

  if (options?.status) {
    params.append("status", options.status.join(","));
  }
  if (options?.priority) {
    params.append("priority", options.priority.join(","));
  }

  const response = await fetch(`${API_BASE_URL}/search/fuzzy/projects?${params}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Project search failed");
  }

  const data = await response.json();
  return data.data;
}

/**
 * Perform task search with fuzzy matching
 */
async function fetchTaskSearch(
  query: string,
  projectId: string,
  options?: {
    limit?: number;
    minScore?: number;
    status?: string[];
    priority?: string[];
    assigneeId?: string;
  }
): Promise<any> {
  const params = new URLSearchParams({
    projectId,
    query,
    limit: String(options?.limit ?? 50),
    minScore: String(options?.minScore ?? 0.5),
  });

  if (options?.status) {
    params.append("status", options.status.join(","));
  }
  if (options?.priority) {
    params.append("priority", options.priority.join(","));
  }
  if (options?.assigneeId) {
    params.append("assigneeId", options.assigneeId);
  }

  const response = await fetch(`${API_BASE_URL}/search/fuzzy/tasks?${params}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Task search failed");
  }

  const data = await response.json();
  return data.data;
}

/**
 * Get search suggestions for autocomplete
 */
async function fetchSearchSuggestions(
  query: string,
  workspaceId: string,
  limit: number = 10
): Promise<{
  projects: string[];
  tasks: string[];
}> {
  const params = new URLSearchParams({
    workspaceId,
    query,
    limit: String(limit),
  });

  const response = await fetch(`${API_BASE_URL}/search/fuzzy/suggestions?${params}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Suggestions fetch failed");
  }

  const data = await response.json();
  return data.data.suggestions;
}

/**
 * Main search hook with debouncing and caching
 */
export function useSearch(options?: UseSearchOptions) {
  const debounceDelay = options?.debounceDelay ?? 300;

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  // Debounce query input
  useEffect(() => {
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceDelay);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, debounceDelay]);

  const handleSearch = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);

  const handleClearSearch = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
  }, []);

  return {
    query,
    debouncedQuery,
    handleSearch,
    handleClearSearch,
    isSearchActive: debouncedQuery.length > 0,
  };
}

/**
 * Workspace search query hook
 */
export function useWorkspaceSearch(
  searchOptions: SearchOptions,
  enabled: boolean = true
) {
  const { debouncedQuery, isSearchActive } = useSearch();

  const query = useQuery({
    queryKey: ["workspace-search", debouncedQuery, searchOptions],
    queryFn: () => fetchWorkspaceSearch(debouncedQuery, searchOptions),
    enabled: enabled && isSearchActive && debouncedQuery.length > 0,
    staleTime: 30 * 1000, // 30 seconds
  });

  return {
    results: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

/**
 * Project search query hook
 */
export function useProjectSearch(
  workspaceId: string,
  options?: {
    limit?: number;
    minScore?: number;
    status?: string[];
    priority?: string[];
    enabled?: boolean;
  }
) {
  const { debouncedQuery, isSearchActive, handleSearch, handleClearSearch } =
    useSearch();

  const query = useQuery({
    queryKey: ["project-search", debouncedQuery, workspaceId, options],
    queryFn: () =>
      fetchProjectSearch(debouncedQuery, workspaceId, {
        limit: options?.limit,
        minScore: options?.minScore,
        status: options?.status,
        priority: options?.priority,
      }),
    enabled:
      (options?.enabled ?? true) &&
      isSearchActive &&
      debouncedQuery.length > 0,
    staleTime: 30 * 1000,
  });

  return {
    results: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    search: handleSearch,
    clearSearch: handleClearSearch,
    query: debouncedQuery,
  };
}

/**
 * Task search query hook
 */
export function useTaskSearch(
  projectId: string,
  options?: {
    limit?: number;
    minScore?: number;
    status?: string[];
    priority?: string[];
    assigneeId?: string;
    enabled?: boolean;
  }
) {
  const { debouncedQuery, isSearchActive, handleSearch, handleClearSearch } =
    useSearch();

  const query = useQuery({
    queryKey: ["task-search", debouncedQuery, projectId, options],
    queryFn: () =>
      fetchTaskSearch(debouncedQuery, projectId, {
        limit: options?.limit,
        minScore: options?.minScore,
        status: options?.status,
        priority: options?.priority,
        assigneeId: options?.assigneeId,
      }),
    enabled:
      (options?.enabled ?? true) &&
      isSearchActive &&
      debouncedQuery.length > 0,
    staleTime: 30 * 1000,
  });

  return {
    results: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    search: handleSearch,
    clearSearch: handleClearSearch,
    query: debouncedQuery,
  };
}

/**
 * Search suggestions hook for autocomplete
 */
export function useSearchSuggestions(
  workspaceId: string,
  limit: number = 10,
  enabled: boolean = true
) {
  const { debouncedQuery, isSearchActive, handleSearch, handleClearSearch } =
    useSearch();

  const query = useQuery({
    queryKey: ["search-suggestions", debouncedQuery, workspaceId, limit],
    queryFn: () =>
      fetchSearchSuggestions(debouncedQuery, workspaceId, limit),
    enabled: enabled && isSearchActive && debouncedQuery.length > 1,
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    suggestions: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    search: handleSearch,
    clearSearch: handleClearSearch,
    query: debouncedQuery,
  };
}
