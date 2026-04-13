// @epic-3.1-messaging: Complete search interface with all optimizations
// @persona-sarah: PM needs comprehensive search functionality
// @persona-david: Team lead needs efficient search across all communications

import React, { useState, useCallback } from 'react';
import { Search, X, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SearchSuggestions } from './search-suggestions';
import { EnhancedSearchResults } from './enhanced-search-results';
import { cn } from '@/lib/utils';

interface SearchFilters {
  messageType?: string;
  userEmail?: string;
  channelId?: string;
  dateFrom?: string;
  dateTo?: string;
  isPinned?: boolean;
  sortBy?: 'relevance' | 'date' | 'user';
}

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

interface SearchInterfaceProps {
  className?: string;
  onResultSelect?: (result: SearchResult) => void;
  defaultOpen?: boolean;
}

export function SearchInterface({
  className = "",
  onResultSelect,
  defaultOpen = false
}: SearchInterfaceProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("search");
  const [filters, setFilters] = useState<SearchFilters>({});

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setActiveTab("results");
    }
  }, []);

  const handleResultClick = useCallback((result: SearchResult) => {
    onResultSelect?.(result);
    // Optionally close the dialog after selection
    // setIsOpen(false);
  }, [onResultSelect]);

  const clearSearch = () => {
    setSearchQuery("");
    setActiveTab("search");
  };

  return (
    <>
      {/* Search trigger button */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            className={cn("gap-2", className)}
            size="sm"
          >
            <Search className="w-4 h-4" />
            Search Messages
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center justify-between">
              <span>Search Messages</span>
              <div className="flex items-center gap-2">
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSearch}
                    className="gap-2"
                  >
                    <X className="w-4 h-4" />
                    Clear
                  </Button>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search input */}
            <div className="flex-shrink-0 mb-4">
              <SearchSuggestions
                value={searchQuery}
                onChange={setSearchQuery}
                onSearch={handleSearch}
                placeholder="Search for messages, mentions, files..."
                className="w-full"
                maxSuggestions={6}
              />
            </div>

            {/* Search interface tabs */}
            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab}
              className="flex-1 flex flex-col"
            >
              <TabsList className="flex-shrink-0 grid w-full grid-cols-3">
                <TabsTrigger value="search">Search</TabsTrigger>
                <TabsTrigger value="results">Results</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              {/* Search tab - getting started */}
              <TabsContent value="search" className="flex-1 overflow-auto">
                <SearchGettingStarted onQuickSearch={handleSearch} />
              </TabsContent>

              {/* Results tab */}
              <TabsContent value="results" className="flex-1 overflow-auto">
                <EnhancedSearchResults
                  searchQuery={searchQuery}
                  filters={filters}
                  onResultClick={handleResultClick}
                  className="h-full"
                />
              </TabsContent>

              {/* Advanced tab */}
              <TabsContent value="advanced" className="flex-1 overflow-auto">
                <AdvancedSearchOptions 
                  filters={filters}
                  onFiltersChange={setFilters}
                  onSearch={handleSearch}
                />
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Getting started component with search tips
function SearchGettingStarted({ onQuickSearch }: { onQuickSearch: (query: string) => void }) {
  const quickSearches = [
    { label: "Recent project updates", query: "project update" },
    { label: "Meeting notes", query: "meeting notes" },
    { label: "Bug reports", query: "bug report" },
    { label: "Feature requests", query: "feature request" },
    { label: "Code reviews", query: "code review" },
    { label: "Deployment notifications", query: "deployment" },
  ];

  return (
    <div className="space-y-6 p-4">
      <div>
        <h3 className="text-lg font-medium mb-4">Quick Searches</h3>
        <div className="grid grid-cols-2 gap-3">
          {quickSearches.map((search) => (
            <Button
              key={search.query}
              variant="outline"
              onClick={() => onQuickSearch(search.query)}
              className="justify-start h-auto p-3 text-left"
            >
              <div>
                <div className="font-medium">{search.label}</div>
                <div className="text-xs text-muted-foreground">"{search.query}"</div>
              </div>
            </Button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">Search Tips</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <div>
              <strong>Exact phrases:</strong> Use quotes for exact matches like "project deadline"
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <div>
              <strong>User mentions:</strong> Search for @username to find mentions
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <div>
              <strong>File types:</strong> Use filters to search specific message types
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <div>
              <strong>Date ranges:</strong> Use advanced filters for time-based searches
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Advanced search options component
function AdvancedSearchOptions({
  filters,
  onFiltersChange,
  onSearch
}: {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onSearch: (query: string) => void;
}) {
  const [advancedQuery, setAdvancedQuery] = useState("");

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleAdvancedSearch = () => {
    if (advancedQuery.trim()) {
      onSearch(advancedQuery);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div>
        <h3 className="text-lg font-medium mb-4">Advanced Search</h3>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Search Query</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={advancedQuery}
                onChange={(e) => setAdvancedQuery(e.target.value)}
                placeholder="Enter advanced search terms..."
                className="flex-1 px-3 py-2 border rounded-md text-sm"
              />
              <Button onClick={handleAdvancedSearch}>Search</Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Message Type</label>
              <select
                value={filters.messageType || ""}
                onChange={(e) => handleFilterChange('messageType', e.target.value || undefined)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="">All types</option>
                <option value="text">Text Messages</option>
                <option value="file">File Uploads</option>
                <option value="system">System Messages</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Sort Results By</label>
              <select
                value={filters.sortBy || "relevance"}
                onChange={(e) => handleFilterChange('sortBy', e.target.value as any)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="relevance">Relevance</option>
                <option value="date">Date (Newest First)</option>
                <option value="user">User Name</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">From Date</label>
              <input
                type="date"
                value={filters.dateFrom || ""}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value || undefined)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">To Date</label>
              <input
                type="date"
                value={filters.dateTo || ""}
                onChange={(e) => handleFilterChange('dateTo', e.target.value || undefined)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.isPinned || false}
                onChange={(e) => handleFilterChange('isPinned', e.target.checked ? true : undefined)}
              />
              <span className="text-sm">Only show pinned messages</span>
            </label>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">Search Operators</h3>
        <div className="space-y-2 text-sm">
          <div><code className="bg-muted px-2 py-1 rounded">AND</code> - All terms must match</div>
          <div><code className="bg-muted px-2 py-1 rounded">OR</code> - Any term can match</div>
          <div><code className="bg-muted px-2 py-1 rounded">NOT</code> - Exclude terms</div>
          <div><code className="bg-muted px-2 py-1 rounded">"exact phrase"</code> - Exact phrase matching</div>
          <div><code className="bg-muted px-2 py-1 rounded">*wildcard</code> - Partial word matching</div>
        </div>
      </div>
    </div>
  );
}

export default SearchInterface;