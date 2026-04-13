import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, X, ArrowUp, ArrowDown, Enter } from 'lucide-react';
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from 'date-fns';
import { useQuickMessageSearch } from '@/hooks/use-message-search';
import { SafeMessageContent } from '@/components/chat/safe-message-content';

interface QuickMessageSearchProps {
  channelId?: string;
  placeholder?: string;
  onMessageSelect?: (messageId: string, channelId: string) => void;
  onAdvancedSearch?: () => void;
  className?: string;
}

export default function QuickMessageSearch({
  channelId,
  placeholder = "Search messages...",
  onMessageSelect,
  onAdvancedSearch,
  className
}: QuickMessageSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  const { data: response, isLoading } = useQuickMessageSearch(
    query.trim().length >= 2 ? query : '', 
    channelId
  );
  const results = response?.messages || [];

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Safe state setter
  const safeSetState = useCallback((setter: () => void) => {
    if (isMountedRef.current) {
      setter();
    }
  }, []);

  // Handle message selection
  const handleSelectMessage = useCallback((message: any) => {
    try {
      onMessageSelect?.(message.id, message.channelId);
      safeSetState(() => {
        setIsOpen(false);
        setQuery('');
      });
    } catch (error) {
      console.error('Error selecting message:', error);
      safeSetState(() => setIsOpen(false));
    }
  }, [onMessageSelect, safeSetState]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || results.length === 0) return;

      try {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            safeSetState(() => setSelectedIndex(prev => Math.min(prev + 1, results.length - 1)));
            break;
          case 'ArrowUp':
            e.preventDefault();
            safeSetState(() => setSelectedIndex(prev => Math.max(prev - 1, 0)));
            break;
          case 'Enter':
            e.preventDefault();
            if (results[selectedIndex]) {
              handleSelectMessage(results[selectedIndex]);
            }
            break;
          case 'Escape':
            safeSetState(() => {
              setIsOpen(false);
              setQuery('');
            });
            break;
        }
      } catch (error) {
        console.error('Error handling keyboard navigation:', error);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results.length, selectedIndex, handleSelectMessage, safeSetState]);

  // Reset selected index when results change
  useEffect(() => {
    safeSetState(() => setSelectedIndex(0));
  }, [results.length, safeSetState]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
        safeSetState(() => setIsOpen(false));
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, safeSetState]);

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

  return (
    <div className={cn("relative", className)} ref={resultsRef}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            safeSetState(() => {
              setQuery(e.target.value);
              setIsOpen(e.target.value.trim().length >= 2);
            });
          }}
          onFocus={() => {
            if (query.trim().length >= 2) {
              safeSetState(() => setIsOpen(true));
            }
          }}
          className="pl-9 pr-20"
        />
        
        {/* Input Actions */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {query && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => {
                safeSetState(() => {
                  setQuery('');
                  setIsOpen(false);
                });
                inputRef.current?.focus();
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          
          {onAdvancedSearch && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={onAdvancedSearch}
            >
              Advanced
            </Button>
          )}
        </div>
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 border shadow-lg">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                {query.trim().length < 2 ? (
                  <p className="text-sm">Type at least 2 characters to search</p>
                ) : (
                  <div>
                    <p>No messages found</p>
                    {onAdvancedSearch && (
                      <Button
                        variant="link"
                        size="sm"
                        className="mt-2"
                        onClick={onAdvancedSearch}
                      >
                        Try advanced search
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <ScrollArea className="max-h-80">
                <div className="py-2">
                  {results.map((result, index) => (
                    <div
                      key={result.id}
                      className={cn(
                        "px-4 py-3 cursor-pointer transition-colors",
                        index === selectedIndex ? "bg-muted" : "hover:bg-muted/50"
                      )}
                      onClick={() => handleSelectMessage(result)}
                    >
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
                              <Badge variant="outline" className="text-xs">Pinned</Badge>
                            )}
                            {result.parentMessageId && (
                              <Badge variant="outline" className="text-xs">Reply</Badge>
                            )}
                          </div>
                          
                          <div className="text-sm text-foreground line-clamp-2">
                            {highlightText(result.content, query)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Show more results indicator */}
                  {response?.pagination?.hasMore && (
                    <div className="px-4 py-2 border-t">
                      <p className="text-xs text-muted-foreground text-center">
                        Showing first {results.length} results
                        {onAdvancedSearch && (
                          <Button
                            variant="link"
                            size="sm"
                            className="ml-2 p-0 h-auto"
                            onClick={onAdvancedSearch}
                          >
                            See all results
                          </Button>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {/* Keyboard shortcuts hint */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full right-0 mt-1 z-40">
          <Card className="border bg-background/95 backdrop-blur">
            <CardContent className="p-2">
              <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <kbd className="px-1 py-0.5 bg-muted rounded text-xs">↑↓</kbd>
                  <span>Navigate</span>
                </div>
                <div className="flex items-center space-x-1">
                  <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd>
                  <span>Select</span>
                </div>
                <div className="flex items-center space-x-1">
                  <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Esc</kbd>
                  <span>Close</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}