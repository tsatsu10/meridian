/**
 * Global Search Component
 *
 * Advanced search interface for finding anything across the Meridian platform.
 * Features:
 * - Universal search across all entity types
 * - Real-time suggestions and autocomplete
 * - Faceted search with filters
 * - Search history and saved searches
 * - Keyboard shortcuts (Ctrl+K / Cmd+K)
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Search,
  X,
  Filter,
  History,
  Bookmark,
  Clock,
  FileText,
  Users,
  FolderOpen,
  CheckSquare,
  MessageSquare,
  Target,
  Calendar,
  Loader2,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { fetchApi } from '@/lib/fetch';
import { useAuth } from '@/components/providers/unified-context-provider';

// Types
type SearchEntityType =
  | 'task'
  | 'project'
  | 'workspace'
  | 'message'
  | 'user'
  | 'file'
  | 'milestone'
  | 'comment'
  | 'all';

interface SearchResult {
  id: string;
  type: SearchEntityType;
  title: string;
  content: string;
  url: string;
  relevanceScore: number;
  matchHighlights: string[];
  metadata: {
    createdAt: string;
    updatedAt?: string;
    author?: {
      id: string;
      name: string;
      email: string;
    };
    workspace?: {
      id: string;
      name: string;
    };
    project?: {
      id: string;
      name: string;
    };
    status?: string;
    priority?: string;
    tags?: string[];
    fileType?: string;
    size?: number;
  };
}

interface SearchFilters {
  entityTypes: SearchEntityType[];
  workspaceId?: string;
  projectId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  priority?: string;
  sortBy: 'relevance' | 'date' | 'title' | 'priority';
  sortOrder: 'asc' | 'desc';
}

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: SearchFilters;
  lastUsed: string;
}

interface GlobalSearchProps {
  className?: string;
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
  onResultSelect?: (result: SearchResult) => void;
}

// Entity type configuration
const ENTITY_CONFIG = {
  task: { icon: CheckSquare, label: 'Tasks', color: 'bg-blue-100 text-blue-800' },
  project: { icon: FolderOpen, label: 'Projects', color: 'bg-green-100 text-green-800' },
  workspace: { icon: Target, label: 'Workspaces', color: 'bg-purple-100 text-purple-800' },
  message: { icon: MessageSquare, label: 'Messages', color: 'bg-orange-100 text-orange-800' },
  user: { icon: Users, label: 'People', color: 'bg-pink-100 text-pink-800' },
  file: { icon: FileText, label: 'Files', color: 'bg-gray-100 text-gray-800' },
  milestone: { icon: Calendar, label: 'Milestones', color: 'bg-yellow-100 text-yellow-800' },
  comment: { icon: MessageSquare, label: 'Comments', color: 'bg-indigo-100 text-indigo-800' },
  all: { icon: Search, label: 'All', color: 'bg-slate-100 text-slate-800' },
};

export function GlobalSearch({
  className,
  trigger,
  defaultOpen = false,
  onResultSelect,
}: GlobalSearchProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({
    entityTypes: ['all'],
    sortBy: 'relevance',
    sortOrder: 'desc',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Keyboard shortcut handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load search history and saved searches
  useEffect(() => {
    if (user && isOpen) {
      loadSearchHistory();
      loadSavedSearches();
    }
  }, [user, isOpen]);

  const loadSearchHistory = useCallback(() => {
    const history = localStorage.getItem('meridian-search-history');
    if (history) {
      try {
        setSearchHistory(JSON.parse(history));
      } catch (error) {
        console.error('Failed to load search history:', error);
      }
    }
  }, []);

  const loadSavedSearches = useCallback(async () => {
    try {
      const response = await fetchApi('/search/saved-searches');
      if (response.success) {
        setSavedSearches(response.data.savedSearches);
      }
    } catch (error) {
      console.error('Failed to load saved searches:', error);
    }
  }, []);

  const saveToHistory = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;

    const newHistory = [searchQuery, ...searchHistory.filter(q => q !== searchQuery)].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem('meridian-search-history', JSON.stringify(newHistory));
  }, [searchHistory]);

  const performSearch = useCallback(async (searchQuery: string, searchFilters: SearchFilters) => {
    if (!searchQuery.trim() && searchFilters.entityTypes.includes('all')) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        query: searchQuery,
        sortBy: searchFilters.sortBy,
        sortOrder: searchFilters.sortOrder,
        limit: '50',
      });

      // Add entity types
      if (!searchFilters.entityTypes.includes('all')) {
        searchFilters.entityTypes.forEach(type => {
          params.append('entityTypes', type);
        });
      }

      // Add other filters
      if (searchFilters.workspaceId) params.append('workspaceId', searchFilters.workspaceId);
      if (searchFilters.projectId) params.append('projectId', searchFilters.projectId);
      if (searchFilters.dateFrom) params.append('dateFrom', searchFilters.dateFrom);
      if (searchFilters.dateTo) params.append('dateTo', searchFilters.dateTo);
      if (searchFilters.status) params.append('status', searchFilters.status);
      if (searchFilters.priority) params.append('priority', searchFilters.priority);

      const response = await fetchApi(`/search?${params.toString()}`);
      if (response.success) {
        setResults(response.data.results);
        saveToHistory(searchQuery);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [saveToHistory]);

  const handleSearch = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
    if (searchQuery.trim()) {
      performSearch(searchQuery, filters);
    } else {
      setResults([]);
    }
  }, [filters, performSearch]);

  const handleResultClick = useCallback((result: SearchResult) => {
    onResultSelect?.(result);

    // Navigate to the result URL
    if (result.url.startsWith('/')) {
      window.location.href = result.url;
    } else {
      window.open(result.url, '_blank');
    }

    setIsOpen(false);
  }, [onResultSelect]);

  const handleFilterChange = useCallback((newFilters: Partial<SearchFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);

    if (query.trim()) {
      performSearch(query, updatedFilters);
    }
  }, [filters, query, performSearch]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setSelectedIndex(0);
  }, []);

  const renderSearchResult = useCallback((result: SearchResult, index: number) => {
    const EntityIcon = ENTITY_CONFIG[result.type]?.icon || Search;
    const isSelected = index === selectedIndex;

    return (
      <div
        key={result.id}
        className={cn(
          'p-3 cursor-pointer border-l-2 hover:bg-gray-50 transition-colors',
          isSelected ? 'bg-blue-50 border-l-blue-500' : 'border-l-transparent'
        )}
        onClick={() => handleResultClick(result)}
      >
        <div className="flex items-start gap-3">
          <div className={cn('p-1 rounded', ENTITY_CONFIG[result.type]?.color)}>
            <EntityIcon className="w-4 h-4" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-sm truncate">{result.title}</h3>
              <Badge variant="secondary" className="text-xs">
                {ENTITY_CONFIG[result.type]?.label}
              </Badge>
            </div>

            {result.content && (
              <p className="text-xs text-gray-600 line-clamp-2">{result.content}</p>
            )}

            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              {result.metadata.workspace && (
                <span>{result.metadata.workspace.name}</span>
              )}
              {result.metadata.project && (
                <>
                  <span>•</span>
                  <span>{result.metadata.project.name}</span>
                </>
              )}
              {result.metadata.status && (
                <>
                  <span>•</span>
                  <Badge variant="outline" className="text-xs">
                    {result.metadata.status}
                  </Badge>
                </>
              )}
            </div>
          </div>

          <div className="text-xs text-gray-400">
            {new Date(result.metadata.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    );
  }, [selectedIndex, handleResultClick]);

  return (
    <>
      {trigger ? (
        <div onClick={() => setIsOpen(true)}>{trigger}</div>
      ) : (
        <Button
          variant="outline"
          className={cn('gap-2', className)}
          onClick={() => setIsOpen(true)}
        >
          <Search className="w-4 h-4" />
          Search...
          <Badge variant="secondary" className="ml-auto text-xs">
            ⌘K
          </Badge>
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl h-[80vh] p-0 gap-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="sr-only">Global Search</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col h-full">
            {/* Search Input */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search tasks, projects, messages, people..."
                  className="pl-10 pr-20"
                  autoFocus
                />
                {query && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSearch}
                    className="absolute right-12 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
                <Popover open={showFilters} onOpenChange={setShowFilters}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    >
                      <Filter className="w-3 h-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <SearchFilters filters={filters} onChange={handleFilterChange} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Searching...</span>
                  </div>
                </div>
              ) : results.length > 0 ? (
                <div className="h-full overflow-y-auto">
                  {results.map((result, index) => renderSearchResult(result, index))}
                </div>
              ) : query.trim() ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No results found for "{query}"</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Try adjusting your search terms or filters
                    </p>
                  </div>
                </div>
              ) : (
                <SearchHistory
                  history={searchHistory}
                  savedSearches={savedSearches}
                  onSearchSelect={handleSearch}
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Search Filters Component
function SearchFilters({
  filters,
  onChange,
}: {
  filters: SearchFilters;
  onChange: (filters: Partial<SearchFilters>) => void;
}) {
  const entityTypes = Object.keys(ENTITY_CONFIG) as SearchEntityType[];

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Content Types</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {entityTypes.map((type) => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox
                id={type}
                checked={filters.entityTypes.includes(type)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onChange({
                      entityTypes: [...filters.entityTypes.filter(t => t !== 'all'), type],
                    });
                  } else {
                    const newTypes = filters.entityTypes.filter(t => t !== type);
                    onChange({
                      entityTypes: newTypes.length === 0 ? ['all'] : newTypes,
                    });
                  }
                }}
              />
              <Label htmlFor={type} className="text-sm">
                {ENTITY_CONFIG[type].label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <Label className="text-sm font-medium">Sort By</Label>
        <select
          value={filters.sortBy}
          onChange={(e) => onChange({ sortBy: e.target.value as any })}
          className="w-full mt-2 px-3 py-2 border rounded-md text-sm"
        >
          <option value="relevance">Relevance</option>
          <option value="date">Date</option>
          <option value="title">Title</option>
          <option value="priority">Priority</option>
        </select>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="desc"
          checked={filters.sortOrder === 'desc'}
          onCheckedChange={(checked) =>
            onChange({ sortOrder: checked ? 'desc' : 'asc' })
          }
        />
        <Label htmlFor="desc" className="text-sm">
          Descending order
        </Label>
      </div>
    </div>
  );
}

// Search History Component
function SearchHistory({
  history,
  savedSearches,
  onSearchSelect,
}: {
  history: string[];
  savedSearches: SavedSearch[];
  onSearchSelect: (query: string) => void;
}) {
  return (
    <div className="p-4 space-y-4">
      {savedSearches.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Bookmark className="w-4 h-4 text-gray-500" />
            <h3 className="font-medium text-sm">Saved Searches</h3>
          </div>
          <div className="space-y-2">
            {savedSearches.slice(0, 5).map((saved) => (
              <div
                key={saved.id}
                onClick={() => onSearchSelect(saved.query)}
                className="p-2 hover:bg-gray-50 rounded cursor-pointer"
              >
                <div className="font-medium text-sm">{saved.name}</div>
                <div className="text-xs text-gray-500">"{saved.query}"</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-gray-500" />
            <h3 className="font-medium text-sm">Recent Searches</h3>
          </div>
          <div className="space-y-1">
            {history.slice(0, 8).map((query, index) => (
              <div
                key={index}
                onClick={() => onSearchSelect(query)}
                className="p-2 hover:bg-gray-50 rounded cursor-pointer text-sm"
              >
                {query}
              </div>
            ))}
          </div>
        </div>
      )}

      {history.length === 0 && savedSearches.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Start typing to search across Meridian</p>
          <p className="text-sm text-gray-400 mt-1">
            Find tasks, projects, messages, and more
          </p>
        </div>
      )}
    </div>
  );
}

export default GlobalSearch;