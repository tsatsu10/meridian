// @epic-3.1-messaging: Mentions Autocomplete Component
// @persona-sarah: PM needs to mention team members in messages
// @persona-david: Team lead needs efficient communication with @mentions

import React, { useEffect, useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/cn'
import { AtSign } from 'lucide-react'

interface User {
  email: string
  name: string
  role?: string
}

interface MentionsAutocompleteProps {
  users: User[]
  searchQuery: string
  selectedIndex: number
  onSelect: (user: User) => void
  onClose: () => void
  position: { top: number; left: number }
}

export function MentionsAutocomplete({
  users,
  searchQuery,
  selectedIndex,
  onSelect,
  onClose,
  position
}: MentionsAutocompleteProps) {
  const selectedRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase()
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    )
  }).slice(0, 8) // Limit to 8 results

  // Scroll selected item into view
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      })
    }
  }, [selectedIndex])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  if (filteredUsers.length === 0) {
    return (
      <div
        ref={containerRef}
        className="absolute z-50 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl"
        style={{
          bottom: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
          <AtSign className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No users found matching "{searchQuery}"
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="absolute z-50 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden"
      style={{
        bottom: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <AtSign className="w-3 h-3" />
          <span>Mention someone</span>
          <span className="ml-auto text-slate-400 dark:text-slate-500">
            ↑↓ navigate • ↵ select • esc close
          </span>
        </div>
      </div>
      
      <ScrollArea className="max-h-64">
        <div className="py-1">
          {filteredUsers.map((user, index) => (
            <div
              key={user.email}
              ref={index === selectedIndex ? selectedRef : null}
              className={cn(
                "flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors",
                index === selectedIndex 
                  ? "bg-blue-100 dark:bg-blue-900/30" 
                  : "hover:bg-slate-100 dark:hover:bg-slate-700/50"
              )}
              onClick={() => onSelect(user)}
            >
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarImage src={`https://avatar.vercel.sh/${user.email}`} />
                <AvatarFallback className="text-xs">
                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-slate-900 dark:text-white truncate">
                  {user.name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {user.email}
                </div>
              </div>
              
              {index === selectedIndex && (
                <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  ↵
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

