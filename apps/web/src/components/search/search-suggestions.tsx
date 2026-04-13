// @epic-3.1-messaging: Search suggestions and autocomplete component
// @persona-sarah: PM needs quick search assistance and query suggestions
// @persona-david: Team lead needs efficient search input with autocomplete

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL, API_URL } from '@/constants/urls';
import { Search, Clock, TrendingUp, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
// Custom debounce hook
function useDebounce(callback: Function, delay: number) {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback((...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => callback(...args), delay);
  }, [callback, delay]);
}

interface SearchSuggestionsProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
  maxSuggestions?: number;
}

interface SearchSuggestion {
  text: string;
  type: 'recent' | 'popular' | 'suggestion';
  frequency?: number;
}

// Mock popular search terms - in real implementation, this would come from analytics
const POPULAR_SEARCHES = [
  'project update',
  'meeting notes',
  'deadline',
  'bug report',
  'feature request',
  'sprint review',
  'code review',
  'deployment'
];

async function fetchSearchSuggestions(prefix: string): Promise<string[]> {
  if (!prefix || prefix.length < 2) {
    return [];
  }

  const response = await fetch(`${API_BASE_URL}/messages/search/suggestions?q=${encodeURIComponent(prefix)}&limit=8`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return data.suggestions || [];
}

export function SearchSuggestions({
  value,
  onChange,
  onSearch,
  placeholder = "Search messages...",
  className = "",
  maxSuggestions = 8
}: SearchSuggestionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to parse recent searches:', error);
      }
    }
  }, []);

  // Debounced suggestion fetching
  const debouncedFetch = useDebounce((query: string) => {
    if (query.length >= 2) {
      refetch();
    }
  }, 300);

  // Fetch suggestions from API
  const { data: apiSuggestions = [], refetch } = useQuery({
    queryKey: ['searchSuggestions', value],
    queryFn: () => fetchSearchSuggestions(value),
    enabled: false, // Only fetch when triggered
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    debouncedFetch(value);
  }, [value, debouncedFetch]);

  // Combine all suggestion types
  const allSuggestions: SearchSuggestion[] = React.useMemo(() => {
    const suggestions: SearchSuggestion[] = [];

    // Add recent searches that match the current input
    if (value.length === 0) {
      recentSearches.slice(0, 3).forEach(search => {
        suggestions.push({
          text: search,
          type: 'recent'
        });
      });
    } else {
      recentSearches
        .filter(search => search.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 2)
        .forEach(search => {
          suggestions.push({
            text: search,
            type: 'recent'
          });
        });
    }

    // Add popular searches
    if (value.length === 0) {
      POPULAR_SEARCHES.slice(0, 3).forEach(search => {
        if (!suggestions.some(s => s.text === search)) {
          suggestions.push({
            text: search,
            type: 'popular'
          });
        }
      });
    }

    // Add API suggestions
    apiSuggestions.forEach(suggestion => {
      if (!suggestions.some(s => s.text === suggestion) && suggestions.length < maxSuggestions) {
        suggestions.push({
          text: suggestion,
          type: 'suggestion'
        });
      }
    });

    return suggestions.slice(0, maxSuggestions);
  }, [value, recentSearches, apiSuggestions, maxSuggestions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setSelectedIndex(-1);
    setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < allSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : allSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < allSuggestions.length) {
          selectSuggestion(allSuggestions[selectedIndex].text);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const selectSuggestion = (suggestion: string) => {
    onChange(suggestion);
    setIsOpen(false);
    setSelectedIndex(-1);
    handleSearch(suggestion);
  };

  const handleSearch = (searchTerm?: string) => {
    const query = searchTerm || value;
    if (!query.trim()) return;

    // Add to recent searches
    const updatedRecent = [query, ...recentSearches.filter(s => s !== query)].slice(0, 10);
    setRecentSearches(updatedRecent);
    localStorage.setItem('recentSearches', JSON.stringify(updatedRecent));

    onSearch(query);
    setIsOpen(false);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const removeRecentSearch = (searchToRemove: string) => {
    const updated = recentSearches.filter(s => s !== searchToRemove);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'recent':
        return <Clock className="w-4 h-4 text-muted-foreground" />;
      case 'popular':
        return <TrendingUp className="w-4 h-4 text-muted-foreground" />;
      case 'suggestion':
        return <Search className="w-4 h-4 text-muted-foreground" />;
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="pl-10 pr-4"
        />
        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange('')}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {isOpen && allSuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
        >
          {/* Recent searches header */}
          {recentSearches.length > 0 && value.length === 0 && (
            <div className="flex items-center justify-between p-3 border-b">
              <span className="text-sm font-medium text-muted-foreground">Recent searches</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearRecentSearches}
                className="text-xs h-6 px-2"
              >
                Clear all
              </Button>
            </div>
          )}

          {/* Suggestion items */}
          {allSuggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.type}-${suggestion.text}`}
              onClick={() => selectSuggestion(suggestion.text)}
              className={cn(
                "flex items-center justify-between p-3 cursor-pointer transition-colors",
                "hover:bg-muted",
                selectedIndex === index && "bg-muted"
              )}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {getSuggestionIcon(suggestion.type)}
                <span className="text-sm truncate">{suggestion.text}</span>
                {suggestion.type === 'popular' && (
                  <Badge variant="secondary" className="text-xs">
                    Popular
                  </Badge>
                )}
              </div>
              
              {suggestion.type === 'recent' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRecentSearch(suggestion.text);
                  }}
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}

          {/* No suggestions message */}
          {value.length >= 2 && allSuggestions.length === 0 && (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No suggestions found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchSuggestions;