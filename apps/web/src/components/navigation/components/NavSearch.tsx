// Global search component with advanced filtering and keyboard navigation
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/cn';
import { useNavigation } from '../providers/NavigationProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  CommandShortcut,
} from '@/components/ui/command';
import {
  Search,
  File,
  Users,
  MessageSquare,
  FolderKanban,
  Calendar,
  Settings,
  Hash,
  ArrowRight,
  Clock,
  Star,
  Filter,
  X,
} from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'project' | 'task' | 'team' | 'user' | 'message' | 'file' | 'page';
  title: string;
  description?: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  metadata?: {
    workspace?: string;
    project?: string;
    team?: string;
    timestamp?: string;
    tags?: string[];
  };
}

interface NavSearchProps {
  placeholder?: string;
  className?: string;
  showShortcut?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'input' | 'button' | 'command';
}

const SEARCH_TYPES = {
  project: { icon: FolderKanban, label: 'Projects', color: 'bg-blue-500' },
  task: { icon: Hash, label: 'Tasks', color: 'bg-green-500' },
  team: { icon: Users, label: 'Teams', color: 'bg-purple-500' },
  user: { icon: Users, label: 'Users', color: 'bg-orange-500' },
  message: { icon: MessageSquare, label: 'Messages', color: 'bg-blue-600' },
  file: { icon: File, label: 'Files', color: 'bg-gray-500' },
  page: { icon: Settings, label: 'Pages', color: 'bg-indigo-500' },
};

// Recent searches storage
const RECENT_SEARCHES_KEY = 'meridian_recent_searches';
const MAX_RECENT_SEARCHES = 5;

function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (error) {
        console.warn('Failed to parse recent searches:', error);
      }
    }
  }, []);

  const addRecentSearch = useCallback((query: string) => {
    if (!query.trim()) return;
    
    setRecentSearches(prev => {
      const updated = [query, ...prev.filter(q => q !== query)].slice(0, MAX_RECENT_SEARCHES);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  }, []);

  return { recentSearches, addRecentSearch, clearRecentSearches };
}

export const NavSearch: React.FC<NavSearchProps> = ({
  placeholder = "Search projects, tasks, teams...",
  className,
  showShortcut = true,
  size = 'md',
  variant = 'input',
}) => {
  const { state, setSearchQuery, performSearch, clearSearch } = useNavigation();
  const { recentSearches, addRecentSearch, clearRecentSearches } = useRecentSearches();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filters, setFilters] = useState<string[]>([]);
  const [localQuery, setLocalQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        clearSearch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearSearch]);

  // Search execution
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      clearSearch();
      return;
    }

    setSearchQuery(query);
    await performSearch(query);
    addRecentSearch(query);
  }, [setSearchQuery, performSearch, clearSearch, addRecentSearch]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuery) {
        handleSearch(localQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localQuery, handleSearch]);

  // Filter results based on selected filters
  const filteredResults = state.searchResults.filter(result => {
    if (filters.length === 0) return true;
    return filters.includes(result.type);
  });

  // Group results by type
  const groupedResults = filteredResults.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  // Handle result selection
  const handleResultSelect = (result: SearchResult) => {
    setIsOpen(false);
    clearSearch();
    setLocalQuery('');
    addRecentSearch(localQuery);
  };

  // Render search input variant
  if (variant === 'input') {
    const inputSizes = {
      sm: 'h-8 text-sm',
      md: 'h-9 text-sm',
      lg: 'h-10 text-base',
    };

    return (
      <>
        <div className={cn('relative', className)}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder={placeholder}
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              onFocus={() => setIsOpen(true)}
              className={cn(
                'pl-10 pr-16',
                inputSizes[size],
                'bg-background border-border focus:border-ring'
              )}
            />
            {showShortcut && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Badge variant="outline" className="h-5 px-1.5 text-xs font-mono">
                  ⌘K
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Search Results Modal */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-2xl p-0">
            <Command>
              <div className="flex items-center border-b px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <CommandInput
                  placeholder={placeholder}
                  value={localQuery}
                  onValueChange={setLocalQuery}
                  className="flex-1"
                />
                {filters.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilters([])}
                    className="ml-2"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              <CommandList className="max-h-96">
                {!localQuery && recentSearches.length > 0 && (
                  <CommandGroup heading="Recent Searches">
                    {recentSearches.map((search, index) => (
                      <CommandItem
                        key={index}
                        onSelect={() => {
                          setLocalQuery(search);
                          handleSearch(search);
                        }}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        {search}
                      </CommandItem>
                    ))}
                    <CommandItem onSelect={clearRecentSearches}>
                      <X className="mr-2 h-4 w-4" />
                      Clear recent searches
                    </CommandItem>
                  </CommandGroup>
                )}

                {state.isSearching && (
                  <CommandEmpty>
                    <div className="flex items-center justify-center py-6">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      <span className="ml-2">Searching...</span>
                    </div>
                  </CommandEmpty>
                )}

                {!state.isSearching && localQuery && Object.keys(groupedResults).length === 0 && (
                  <CommandEmpty>
                    <div className="text-center py-6">
                      <Search className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <p>No results found for "{localQuery}"</p>
                      <p className="text-sm text-muted-foreground">
                        Try adjusting your search terms
                      </p>
                    </div>
                  </CommandEmpty>
                )}

                {Object.entries(groupedResults).map(([type, results]) => {
                  const typeInfo = SEARCH_TYPES[type as keyof typeof SEARCH_TYPES];
                  if (!typeInfo || results.length === 0) return null;

                  return (
                    <CommandGroup key={type} heading={typeInfo.label}>
                      {results.map((result) => {
                        const Icon = result.icon || typeInfo.icon;
                        return (
                          <CommandItem
                            key={result.id}
                            onSelect={() => handleResultSelect(result)}
                            asChild
                          >
                            <Link to={result.href} className="flex items-center gap-3 p-2">
                              <div className={cn(
                                'flex items-center justify-center h-8 w-8 rounded',
                                typeInfo.color,
                                'text-white'
                              )}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{result.title}</p>
                                {result.description && (
                                  <p className="text-sm text-muted-foreground truncate">
                                    {result.description}
                                  </p>
                                )}
                                {result.metadata && (
                                  <div className="flex items-center gap-2 mt-1">
                                    {result.metadata.workspace && (
                                      <Badge variant="outline" className="h-4 px-1 text-xs">
                                        {result.metadata.workspace}
                                      </Badge>
                                    )}
                                    {result.metadata.tags?.map(tag => (
                                      <Badge key={tag} variant="outline" className="h-4 px-1 text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </Link>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  );
                })}

                {localQuery && (
                  <>
                    <CommandSeparator />
                    <CommandGroup heading="Search Filters">
                      {Object.entries(SEARCH_TYPES).map(([type, info]) => (
                        <CommandItem
                          key={type}
                          onSelect={() => {
                            setFilters(prev =>
                              prev.includes(type)
                                ? prev.filter(f => f !== type)
                                : [...prev, type]
                            );
                          }}
                        >
                          <div className={cn(
                            'w-3 h-3 rounded mr-2',
                            info.color
                          )} />
                          Filter by {info.label}
                          {filters.includes(type) && (
                            <Badge variant="secondary" className="ml-auto h-4 px-1">
                              ✓
                            </Badge>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Render button variant
  if (variant === 'button') {
    return (
      <Button
        variant="outline"
        className={cn('justify-start text-muted-foreground', className)}
        onClick={() => setIsOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        {placeholder}
        {showShortcut && (
          <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-xs font-mono">
            ⌘K
          </Badge>
        )}
      </Button>
    );
  }

  // Command variant - just the command dialog
  return (
    <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
      {/* Similar implementation to the modal above */}
    </CommandDialog>
  );
};

// Compact search for smaller spaces
export const CompactNavSearch: React.FC<Omit<NavSearchProps, 'size' | 'showShortcut'>> = (props) => {
  return (
    <NavSearch
      {...props}
      size="sm"
      showShortcut={false}
      placeholder="Search..."
    />
  );
};

// Search button for mobile
export const MobileSearchButton: React.FC<{ onSearchOpen: () => void }> = ({ onSearchOpen }) => {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onSearchOpen}
      className="lg:hidden"
    >
      <Search className="h-4 w-4" />
      <span className="sr-only">Search</span>
    </Button>
  );
};

export default NavSearch;