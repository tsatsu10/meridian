import React, { useState, useCallback, useMemo } from 'react';
import { API_BASE_URL } from '@/constants/urls';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Search, 
  Filter, 
  Calendar as CalendarIcon, 
  User, 
  FileText, 
  Pin, 
  Download,
  X,
  ChevronDown,
  ArrowUpDown
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/fetch';
import { SafeMessageContent } from '@/components/chat/safe-message-content';
import { useAuth } from '@/components/providers/unified-context-provider';

interface SearchFilters {
  query: string;
  users: string[];
  dateFrom?: Date;
  dateTo?: Date;
  messageTypes: string[];
  includeThreads: boolean;
  pinnedOnly: boolean;
  sortBy: 'newest' | 'oldest' | 'relevance';
}

interface SearchResult {
  id: string;
  content: string;
  messageType: string;
  userEmail: string;
  userName?: string;
  channelId: string;
  createdAt: Date;
  isEdited: boolean;
  isPinned: boolean;
  attachments?: string;
  reactions?: string;
  parentMessageId?: string;
}

interface AdvancedMessageSearchProps {
  channelId?: string;
  trigger?: React.ReactNode;
  onMessageSelect?: (messageId: string, channelId: string) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const MESSAGE_TYPES = [
  { value: 'text', label: 'Text Messages', icon: FileText },
  { value: 'file', label: 'File Attachments', icon: FileText },
  { value: 'system', label: 'System Messages', icon: FileText },
];

export default function AdvancedMessageSearch({
  channelId,
  trigger,
  onMessageSelect,
  isOpen: externalIsOpen,
  onOpenChange: externalOnOpenChange
}: AdvancedMessageSearchProps) {
  const { user } = useAuth();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  // Use external control if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = externalOnOpenChange || setInternalIsOpen;
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    users: [],
    messageTypes: ['text', 'file'],
    includeThreads: false,
    pinnedOnly: false,
    sortBy: 'newest'
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Search query with debouncing
  const { data: searchResults = [], isLoading, error } = useQuery({
    queryKey: ['messageSearch', channelId, filters],
    queryFn: async () => {
      if (!filters.query.trim() && !filters.users.length && !filters.dateFrom && !filters.pinnedOnly) {
        return [];
      }

      const params = new URLSearchParams();
      if (filters.query.trim()) params.set('search', filters.query);
      if (filters.users.length > 0) params.set('user', filters.users.join(','));
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom.toISOString());
      if (filters.dateTo) params.set('dateTo', filters.dateTo.toISOString());
      if (filters.messageTypes.length > 0) params.set('type', filters.messageTypes.join(','));
      if (filters.includeThreads) params.set('includeThreads', 'true');
      if (filters.pinnedOnly) params.set('pinned', 'true');
      params.set('limit', '100');

      const endpoint = channelId 
        ? `/message/channel/${channelId}?${params.toString()}`
        : `/message/search?${params.toString()}`;

      const response = await fetchApi(endpoint);
      return response.messages as SearchResult[];
    },
    enabled: isOpen && (!!filters.query.trim() || filters.users.length > 0 || !!filters.dateFrom || filters.pinnedOnly),
  });

  // Sort results based on selected sorting
  const sortedResults = useMemo(() => {
    if (!searchResults) return [];
    
    const results = [...searchResults];
    
    switch (filters.sortBy) {
      case 'oldest':
        return results.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case 'newest':
        return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'relevance':
        // Simple relevance scoring based on query matches
        return results.sort((a, b) => {
          if (!filters.query) return 0;
          const aMatches = (a.content.toLowerCase().match(new RegExp(filters.query.toLowerCase(), 'g')) || []).length;
          const bMatches = (b.content.toLowerCase().match(new RegExp(filters.query.toLowerCase(), 'g')) || []).length;
          return bMatches - aMatches;
        });
      default:
        return results;
    }
  }, [searchResults, filters.sortBy, filters.query]);

  const updateFilter = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleUser = (userEmail: string) => {
    setFilters(prev => ({
      ...prev,
      users: prev.users.includes(userEmail)
        ? prev.users.filter(u => u !== userEmail)
        : [...prev.users, userEmail]
    }));
  };

  const toggleMessageType = (type: string) => {
    setFilters(prev => ({
      ...prev,
      messageTypes: prev.messageTypes.includes(type)
        ? prev.messageTypes.filter(t => t !== type)
        : [...prev.messageTypes, type]
    }));
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      users: [],
      messageTypes: ['text', 'file'],
      includeThreads: false,
      pinnedOnly: false,
      sortBy: 'newest'
    });
  };

  const exportResults = async (format: 'csv' | 'json') => {
    if (!searchResults?.length) return;

    const params = new URLSearchParams();
    if (filters.query.trim()) params.set('search', filters.query);
    if (filters.users.length > 0) params.set('user', filters.users.join(','));
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom.toISOString());
    if (filters.dateTo) params.set('dateTo', filters.dateTo.toISOString());
    if (filters.messageTypes.length > 0) params.set('type', filters.messageTypes.join(','));
    params.set('export', format);
    params.set('limit', '1000');

    const endpoint = channelId 
      ? `/message/channel/${channelId}?${params.toString()}`
      : `/message/search?${params.toString()}`;

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `search-results.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-black font-medium">
          {part}
        </mark>
      ) : part
    );
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Search className="h-4 w-4 mr-2" />
      Advanced Search
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Advanced Message Search
            {channelId && <Badge variant="secondary">Current Channel</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search messages..."
              value={filters.query}
              onChange={(e) => updateFilter('query', e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center space-x-2 flex-wrap">
            <Button
              variant={showAdvancedFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              <ChevronDown className={cn("h-4 w-4 ml-2 transition-transform", showAdvancedFilters && "rotate-180")} />
            </Button>

            <Select value={filters.sortBy} onValueChange={(value) => updateFilter('sortBy', value as any)}>
              <SelectTrigger className="w-32">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="relevance">Most relevant</SelectItem>
              </SelectContent>
            </Select>

            {(filters.users.length > 0 || filters.dateFrom || filters.pinnedOnly) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Date Range */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date Range</label>
                    <div className="flex space-x-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm">
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            {filters.dateFrom ? format(filters.dateFrom, 'MMM dd') : 'From'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={filters.dateFrom}
                            onSelect={(date) => updateFilter('dateFrom', date)}
                          />
                        </PopoverContent>
                      </Popover>
                      
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm">
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            {filters.dateTo ? format(filters.dateTo, 'MMM dd') : 'To'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={filters.dateTo}
                            onSelect={(date) => updateFilter('dateTo', date)}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Message Types */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Message Types</label>
                    <div className="space-y-2">
                      {MESSAGE_TYPES.map((type) => (
                        <div key={type.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={type.value}
                            checked={filters.messageTypes.includes(type.value)}
                            onCheckedChange={() => toggleMessageType(type.value)}
                          />
                          <label htmlFor={type.value} className="text-sm flex items-center">
                            <type.icon className="h-4 w-4 mr-2" />
                            {type.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Additional Options */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeThreads"
                      checked={filters.includeThreads}
                      onCheckedChange={(checked) => updateFilter('includeThreads', !!checked)}
                    />
                    <label htmlFor="includeThreads" className="text-sm">Include thread replies</label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="pinnedOnly"
                      checked={filters.pinnedOnly}
                      onCheckedChange={(checked) => updateFilter('pinnedOnly', !!checked)}
                    />
                    <label htmlFor="pinnedOnly" className="text-sm flex items-center">
                      <Pin className="h-4 w-4 mr-2" />
                      Pinned messages only
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results Header */}
          {sortedResults.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {sortedResults.length} result{sortedResults.length !== 1 ? 's' : ''} found
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportResults('csv')}
                  disabled={!sortedResults.length}
                >
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportResults('json')}
                  disabled={!sortedResults.length}
                >
                  <Download className="h-4 w-4 mr-2" />
                  JSON
                </Button>
              </div>
            </div>
          )}

          {/* Search Results */}
          <ScrollArea className="h-96">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">
                <p>Error searching messages</p>
                <p className="text-sm">{error.message}</p>
              </div>
            ) : sortedResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {filters.query || filters.users.length > 0 || filters.dateFrom ? (
                  <div>
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No messages found</p>
                    <p className="text-sm">Try adjusting your search criteria</p>
                  </div>
                ) : (
                  <div>
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Enter search terms to find messages</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {sortedResults.map((result) => (
                  <Card
                    key={result.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      onMessageSelect?.(result.id, result.channelId);
                      setIsOpen(false);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarFallback className="text-xs">
                            {result.userName?.charAt(0) || result.userEmail.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-sm">
                              {result.userName || result.userEmail.split('@')[0]}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(result.createdAt), { addSuffix: true })}
                            </span>
                            {result.isPinned && (
                              <Pin className="h-3 w-3 text-orange-500" />
                            )}
                            {result.isEdited && (
                              <Badge variant="outline" className="text-xs">edited</Badge>
                            )}
                            {result.parentMessageId && (
                              <Badge variant="outline" className="text-xs">reply</Badge>
                            )}
                          </div>
                          
                          <div className="text-sm text-foreground">
                            {filters.query ? (
                              <div>{highlightText(result.content, filters.query)}</div>
                            ) : (
                              <SafeMessageContent content={result.content} className="line-clamp-2" />
                            )}
                          </div>
                          
                          {result.attachments && (
                            <div className="mt-2">
                              <Badge variant="outline" className="text-xs">
                                <FileText className="h-3 w-3 mr-1" />
                                Has attachments
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}