// @epic-3.1-messaging: Advanced Search Modal
// @persona-sarah: PM needs to quickly find messages, channels, and people
// @persona-david: Team lead needs efficient search across all communications

import React, { useState, useEffect, useRef } from 'react'
import { API_BASE_URL, API_URL } from '@/constants/urls'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  Search,
  Hash,
  MessageSquare,
  Users,
  User,
  Clock,
  TrendingUp,
  Loader2,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatDistanceToNow } from 'date-fns'
import useWorkspaceStore from '@/store/workspace'
import { ClickableUserProfile } from '@/components/user/clickable-user-profile'
import { logger } from '@/lib/logger'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectChannel?: (channelId: string) => void
  onSelectMessage?: (messageId: string, channelId: string) => void
}

type SearchResult = {
  type: 'message' | 'channel' | 'user'
  id: string
  title: string
  subtitle?: string
  timestamp?: string
  channelName?: string
  channelId?: string
  userEmail?: string
  avatar?: string
}

export function SearchModal({ isOpen, onClose, onSelectChannel, onSelectMessage }: SearchModalProps) {
  const { workspace } = useWorkspaceStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const selectedRef = useRef<HTMLDivElement>(null)

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setSearchQuery('')
      setSelectedIndex(0)
      loadRecentSearches()
    }
  }, [isOpen])

  // Load recent searches from localStorage
  const loadRecentSearches = () => {
    const saved = localStorage.getItem(`meridian-recent-searches-${workspace?.id}`)
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved))
      } catch (e) {
        setRecentSearches([])
      }
    }
  }

  // Save recent search
  const saveRecentSearch = (query: string) => {
    if (!query.trim() || !workspace?.id) return
    
    const updated = [query, ...recentSearches.filter(q => q !== query)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem(`meridian-recent-searches-${workspace.id}`, JSON.stringify(updated))
  }

  // Scroll selected item into view
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      })
    }
  }, [selectedIndex])

  // Perform search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const timeoutId = setTimeout(async () => {
      try {
        // Call real search API
        const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(searchQuery)}&workspaceId=${workspace?.id}&limit=10`, {
          credentials: 'include',
        })
        
        if (!response.ok) {
          throw new Error('Search failed')
        }
        
        const data = await response.json()
        
        // Map API results to SearchResult format
        const mappedResults: SearchResult[] = (data.results || []).map((result: any) => {
          if (result.type === 'channel') {
            return {
              type: 'channel',
              id: result.id,
              title: `#${result.name}`,
              subtitle: result.description || 'Channel',
            }
          } else if (result.type === 'message') {
            return {
              type: 'message',
              id: result.id,
              title: result.authorName ? `${result.authorName}:` : (result.title || 'Message'),
              subtitle: result.content || result.description || '',
              timestamp: result.createdAt,
              channelName: result.channelName || '',
              channelId: result.channelId || result.conversationId || '',
            }
          } else if (result.type === 'user') {
            return {
              type: 'user',
              id: result.id,
              title: result.name || '',
              subtitle: result.email || '',
              userEmail: result.email || '',
            }
          }
          return null
        }).filter(Boolean) as SearchResult[]
        
        setSearchResults(mappedResults)
      } catch (error) {
        logger.error('Chat search failed', { error })
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300) // Debounce

    return () => clearTimeout(timeoutId)
  }, [searchQuery, workspace?.id])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const results = searchQuery.trim() ? searchResults : recentSearches.map(q => ({ type: 'recent' as const, id: q, title: q }))
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : 0)
        break
      case 'Enter':
        e.preventDefault()
        if (results.length > 0) {
          const selected = results[selectedIndex] as any
          if (selected.type === 'recent') {
            setSearchQuery(selected.title)
          } else {
            handleSelect(selected)
          }
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
    }
  }

  const handleSelect = (result: SearchResult) => {
    saveRecentSearch(searchQuery)
    
    if (result.type === 'channel' && onSelectChannel) {
      onSelectChannel(result.id)
      onClose()
    } else if (result.type === 'message' && result.channelId && onSelectMessage) {
      onSelectMessage(result.id, result.channelId)
      onClose()
    }
  }

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'channel':
        return <Hash className="w-4 h-4" />
      case 'message':
        return <MessageSquare className="w-4 h-4" />
      case 'user':
        return <User className="w-4 h-4" />
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <Input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search messages, channels, or people..."
            className="border-0 shadow-none focus-visible:ring-0 text-base px-0"
          />
          {isSearching && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
        </div>

        {/* Search Results */}
        <ScrollArea className="max-h-[60vh]">
          {!searchQuery.trim() ? (
            /* Recent Searches & Quick Actions */
            <div className="py-2">
              {recentSearches.length > 0 && (
                <>
                  <div className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    Recent Searches
                  </div>
                  {recentSearches.map((query, index) => (
                    <div
                      key={query}
                      ref={index === selectedIndex ? selectedRef : null}
                      onClick={() => setSearchQuery(query)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors",
                        index === selectedIndex
                          ? "bg-blue-100 dark:bg-blue-900/30"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800/50"
                      )}
                    >
                      <Search className="w-4 h-4 text-slate-400" />
                      <span className="flex-1 text-sm">{query}</span>
                      {index === selectedIndex && (
                        <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                  ))}
                  <Separator className="my-2" />
                </>
              )}

              <div className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <TrendingUp className="w-3 h-3" />
                Quick Actions
              </div>
              <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                Search by:
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge variant="outline">#channel-name</Badge>
                  <Badge variant="outline">@username</Badge>
                  <Badge variant="outline">from:user</Badge>
                  <Badge variant="outline">in:#channel</Badge>
                </div>
              </div>
            </div>
          ) : searchResults.length > 0 ? (
            /* Search Results */
            <div className="py-2">
              {searchResults.map((result, index) => (
                <div
                  key={`${result.type}-${result.id}`}
                  ref={index === selectedIndex ? selectedRef : null}
                  onClick={() => handleSelect(result)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors",
                    index === selectedIndex
                      ? "bg-blue-100 dark:bg-blue-900/30"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800/50"
                  )}
                >
                  {result.type === 'user' ? (
                    <ClickableUserProfile
                      userId={result.id}
                      userEmail={result.userEmail}
                      userName={result.title}
                      userAvatar={`https://avatar.vercel.sh/${result.userEmail}`}
                      size="sm"
                      openMode="both"
                    />
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                        {getResultIcon(result.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{result.title}</div>
                        {result.subtitle && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {result.subtitle}
                          </div>
                        )}
                        {result.channelName && (
                          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            <Hash className="w-3 h-3" />
                            {result.channelName}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {result.timestamp && (
                    <div className="text-xs text-slate-400 flex-shrink-0">
                      {formatDistanceToNow(new Date(result.timestamp), { addSuffix: true })}
                    </div>
                  )}

                  {index === selectedIndex && (
                    <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          ) : !isSearching ? (
            /* No Results */
            <div className="py-12 text-center text-slate-500 dark:text-slate-400">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No results found for "{searchQuery}"</p>
              <p className="text-xs mt-1">Try using different keywords</p>
            </div>
          ) : null}
        </ScrollArea>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-[10px]">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-[10px]">↵</kbd>
                Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-[10px]">esc</kbd>
                Close
              </span>
            </div>
            <div className="text-[10px]">
              Powered by Meridian Search
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

