// @epic-3.1-messaging: Enhanced search results with performance optimizations
// @persona-sarah: PM needs fast, relevant search results with clear highlighting
// @persona-david: Team lead needs efficient search interface with filtering

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL, API_URL } from '@/constants/urls';
import { format } from 'date-fns';
import { 
  Search, 
  Filter, 
  Calendar, 
  User, 
  MessageSquare, 
  Pin, 
  Clock,
  TrendingUp,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { MessageSearchHighlight } from './search-result-highlight';

interface SearchResult {
  id: string;
  content: string;
  messageType: string;
  userEmail: string;
  userName?: string;
  channelId: string;
  createdAt: string;
  isEdited: boolean;
  isPinned: boolean;
  relevanceScore: number;
  matchHighlights?: string[];
}

interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  query: {
    terms: string[];
    filters: Record<string, any>;
  };
  performance: {
    queryTime: number;
    fromCache: boolean;
  };
}

interface SearchFilters {
  messageType?: string;
  userEmail?: string;
  channelId?: string;
  dateFrom?: string;
  dateTo?: string;
  isPinned?: boolean;
  sortBy?: 'relevance' | 'date' | 'user';
}

interface EnhancedSearchResultsProps {
  searchQuery: string;
  filters?: SearchFilters;
  onResultClick?: (result: SearchResult) => void;
  className?: string;
}

async function fetchSearchResults(
  query: string, 
  filters: SearchFilters = {}, 
  page: number = 0, 
  limit: number = 20
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    search: query,
    limit: limit.toString(),
    offset: (page * limit).toString(),
  });

  if (filters.messageType) params.set('type', filters.messageType);
  if (filters.userEmail) params.set('user', filters.userEmail);
  if (filters.channelId) params.set('channelId', filters.channelId);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.isPinned !== undefined) params.set('pinned', filters.isPinned.toString());

  const response = await fetch(`${API_BASE_URL}/messages/search?${params}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
  });

  if (!response.ok) {
    throw new Error('Search failed');
  }

  return response.json();
}

export function EnhancedSearchResults({
  searchQuery,
  filters = {},
  onResultClick,
  className = ""
}: EnhancedSearchResultsProps) {
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);

  const {
    data: searchResponse,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['searchResults', searchQuery, localFilters, page],
    queryFn: () => fetchSearchResults(searchQuery, localFilters, page),
    enabled: !!searchQuery,
    staleTime: 1000 * 60 * 2, // 2 minutes
    keepPreviousData: true,
  });

  // Memoized results for performance
  const processedResults = useMemo(() => {
    if (!searchResponse?.results) return [];

    return searchResponse.results.map(result => ({
      ...result,
      createdAt: new Date(result.createdAt),
      displayRelevance: Math.round(result.relevanceScore * 100),
    }));
  }, [searchResponse?.results]);

  // Group results by relevance tiers
  const groupedResults = useMemo(() => {
    const highRelevance = processedResults.filter(r => r.relevanceScore > 0.8);
    const mediumRelevance = processedResults.filter(r => r.relevanceScore <= 0.8 && r.relevanceScore > 0.4);
    const lowRelevance = processedResults.filter(r => r.relevanceScore <= 0.4);

    return { highRelevance, mediumRelevance, lowRelevance };
  }, [processedResults]);

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
    setPage(0); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setLocalFilters({});
    setPage(0);
  };

  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  if (!searchQuery) {
    return (
      <div className={cn("text-center py-12", className)}>
        <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Search Messages</h3>
        <p className="text-muted-foreground">Enter a search term to find relevant messages</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("text-center py-12", className)}>
        <div className="text-red-500 mb-4">Search failed</div>
        <Button onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search metadata and filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {searchResponse && (
            <div className="text-sm text-muted-foreground">
              {searchResponse.totalCount} results found in {searchResponse.performance.queryTime}ms
              {searchResponse.performance.fromCache && (
                <Badge variant="secondary" className="ml-2">Cached</Badge>
              )}
            </div>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
          {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      {/* Advanced filters */}
      <Collapsible open={showFilters} onOpenChange={setShowFilters}>
        <CollapsibleContent>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Search Filters</h4>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Message Type</label>
                <Select
                  value={localFilters.messageType || ""}
                  onValueChange={(value) => handleFilterChange('messageType', value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All types</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="file">File</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Sort By</label>
                <Select
                  value={localFilters.sortBy || "relevance"}
                  onValueChange={(value) => handleFilterChange('sortBy', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">From Date</label>
                <input
                  type="date"
                  value={localFilters.dateFrom || ""}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value || undefined)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">To Date</label>
                <input
                  type="date"
                  value={localFilters.dateTo || ""}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value || undefined)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Search results grouped by relevance */}
      {searchResponse && !isLoading && (
        <div className="space-y-6">
          {/* High relevance results */}
          {groupedResults.highRelevance.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <h3 className="font-medium text-green-600">Highly Relevant</h3>
                <Badge variant="secondary">{groupedResults.highRelevance.length}</Badge>
              </div>
              <div className="space-y-3">
                {groupedResults.highRelevance.map((result) => (
                  <SearchResultCard
                    key={result.id}
                    result={result}
                    searchTerms={searchResponse.query.terms}
                    onClick={() => onResultClick?.(result)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Medium relevance results */}
          {groupedResults.mediumRelevance.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Search className="w-4 h-4 text-blue-600" />
                <h3 className="font-medium text-blue-600">Relevant</h3>
                <Badge variant="secondary">{groupedResults.mediumRelevance.length}</Badge>
              </div>
              <div className="space-y-3">
                {groupedResults.mediumRelevance.map((result) => (
                  <SearchResultCard
                    key={result.id}
                    result={result}
                    searchTerms={searchResponse.query.terms}
                    onClick={() => onResultClick?.(result)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Low relevance results */}
          {groupedResults.lowRelevance.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-medium text-muted-foreground">Other Results</h3>
                <Badge variant="secondary">{groupedResults.lowRelevance.length}</Badge>
              </div>
              <div className="space-y-3">
                {groupedResults.lowRelevance.map((result) => (
                  <SearchResultCard
                    key={result.id}
                    result={result}
                    searchTerms={searchResponse.query.terms}
                    onClick={() => onResultClick?.(result)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Load more */}
          {searchResponse.pagination.hasMore && (
            <div className="text-center">
              <Button onClick={loadMore} variant="outline">
                Load More Results
              </Button>
            </div>
          )}

          {/* No results */}
          {processedResults.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No results found</h3>
              <p className="text-muted-foreground">Try adjusting your search terms or filters</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Individual search result card component
function SearchResultCard({
  result,
  searchTerms,
  onClick
}: {
  result: SearchResult & { createdAt: Date; displayRelevance: number };
  searchTerms: string[];
  onClick?: () => void;
}) {
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="text-xs">
              {result.userName?.charAt(0) || result.userEmail.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-sm">
                {result.userName || result.userEmail}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(result.createdAt, 'MMM d, yyyy')}
              </span>
              {result.isPinned && (
                <Pin className="w-3 h-3 text-yellow-500" />
              )}
              <Badge variant="outline" className="text-xs">
                {result.displayRelevance}% match
              </Badge>
            </div>

            <div className="mb-2">
              <MessageSearchHighlight
                content={result.content}
                searchTerms={searchTerms}
              />
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {result.messageType}
              </div>
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {result.channelId}
              </div>
              {result.isEdited && (
                <span>(edited)</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default EnhancedSearchResults;