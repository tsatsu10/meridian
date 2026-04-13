// Phase 2.2: Advanced Message Search & Filtering Component
import React, { useState, useEffect, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Search,
  Filter,
  Calendar,
  User,
  Hash,
  X,
  Clock,
  MessageSquare
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

interface SimpleMessage {
  id: string
  content: string
  userEmail: string
  userName: string
  createdAt: string
  user: {
    email: string
    name: string
  }
}

interface SearchFilters {
  query: string
  userId: string
  dateRange: 'all' | 'today' | 'week' | 'month'
  channel: string
  hasAttachments: boolean
}

interface MessageSearchProps {
  messages: SimpleMessage[]
  onSelectMessage?: (message: SimpleMessage) => void
  trigger?: React.ReactNode
}

export function MessageSearch({ messages, onSelectMessage, trigger }: MessageSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    userId: '',
    dateRange: 'all',
    channel: '',
    hasAttachments: false,
  })

  // Extract unique users from messages
  const uniqueUsers = useMemo(() => {
    const users = new Map<string, { email: string; name: string }>()
    messages.forEach(msg => {
      users.set(msg.userEmail, { email: msg.userEmail, name: msg.userName })
    })
    return Array.from(users.values())
  }, [messages])

  // Filter messages based on search criteria
  const filteredMessages = useMemo(() => {
    let filtered = messages

    // Text search
    if (filters.query.trim()) {
      const query = filters.query.toLowerCase()
      filtered = filtered.filter(msg => 
        msg.content.toLowerCase().includes(query) ||
        msg.userName.toLowerCase().includes(query) ||
        msg.userEmail.toLowerCase().includes(query)
      )
    }

    // User filter
    if (filters.userId) {
      filtered = filtered.filter(msg => msg.userEmail === filters.userId)
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date()
      const filterDate = new Date()
      
      switch (filters.dateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0)
          break
        case 'week':
          filterDate.setDate(filterDate.getDate() - 7)
          break
        case 'month':
          filterDate.setMonth(filterDate.getMonth() - 1)
          break
      }
      
      filtered = filtered.filter(msg => 
        new Date(msg.createdAt) >= filterDate
      )
    }

    // Sort by relevance (most recent first)
    return filtered.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [messages, filters])

  // Reset filters
  const clearFilters = () => {
    setFilters({
      query: '',
      userId: '',
      dateRange: 'all',
      channel: '',
      hasAttachments: false,
    })
  }

  // Highlight search terms in content
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 rounded px-1">
          {part}
        </mark>
      ) : part
    )
  }

  const activeFiltersCount = [
    filters.query,
    filters.userId,
    filters.dateRange !== 'all' ? filters.dateRange : '',
    filters.channel,
    filters.hasAttachments ? 'attachments' : '',
  ].filter(Boolean).length

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="relative">
            <Search className="w-4 h-4" />
            {activeFiltersCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Search Messages
            <Badge variant="secondary">{filteredMessages.length} results</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Search Filters */}
        <div className="flex flex-col gap-4 py-4 border-b">
          {/* Main Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search messages..."
              value={filters.query}
              onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
              className="pl-10"
            />
          </div>

          {/* Filter Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* User Filter */}
            <Select 
              value={filters.userId} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, userId: value }))}
            >
              <SelectTrigger className="w-auto min-w-[120px]">
                <User className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Any user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any user</SelectItem>
                {uniqueUsers.map(user => (
                  <SelectItem key={user.email} value={user.email}>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={`https://avatar.vercel.sh/${user.email}`} />
                        <AvatarFallback className="text-xs">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      {user.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range Filter */}
            <Select 
              value={filters.dateRange} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value as SearchFilters['dateRange'] }))}
            >
              <SelectTrigger className="w-auto min-w-[120px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Past week</SelectItem>
                <SelectItem value="month">Past month</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Clear ({activeFiltersCount})
              </Button>
            )}
          </div>
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-auto">
          {filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Search className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg fontWeight-medium mb-2">No messages found</p>
              <p className="text-sm">Try adjusting your search criteria</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMessages.map((message) => (
                <div
                  key={message.id}
                  className="p-4 rounded-lg border hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => {
                    onSelectMessage?.(message)
                    setIsOpen(false)
                  }}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={`https://avatar.vercel.sh/${message.userEmail}`} />
                      <AvatarFallback className="text-xs">
                        {message.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-900">
                          {message.userName}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-700 line-clamp-3">
                        {highlightText(message.content, filters.query)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Search Tips */}
        {filters.query === '' && filteredMessages.length === messages.length && (
          <div className="border-t pt-4">
            <div className="text-xs text-gray-500 space-y-1">
              <p><strong>Search tips:</strong></p>
              <p>• Search by content, user name, or email address</p>
              <p>• Use filters to narrow down results by user or date</p>
              <p>• Click on any message to navigate to it in the chat</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}