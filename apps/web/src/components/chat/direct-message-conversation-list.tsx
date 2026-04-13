// @epic-4.1-direct-messaging: Direct message conversation list component
// @persona-sarah: PM needs to see all direct conversations at a glance
// @persona-david: Team lead needs quick access to team member conversations

"use client"

import React, { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Plus, MoreVertical, Circle } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatDistanceToNow } from 'date-fns'
import { useDirectMessaging } from '@/hooks/use-direct-messaging'
import { DirectMessageConversation } from '@/fetchers/direct-messaging'
import useAuth from '@/components/providers/auth-provider/hooks/use-auth'

interface DirectMessageConversationListProps {
  selectedConversationId: string | null
  onSelectConversation: (conversationId: string) => void
  onStartNewConversation: () => void
}

export function DirectMessageConversationList({
  selectedConversationId,
  onSelectConversation,
  onStartNewConversation
}: DirectMessageConversationListProps) {
  const { user } = useAuth()
  const { conversations, onlineUsers, isLoading, error } = useDirectMessaging()
  const [searchQuery, setSearchQuery] = useState('')

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conv => {
    const otherUserEmail = conv.user1Email === user?.email ? conv.user2Email : conv.user1Email
    return otherUserEmail.toLowerCase().includes(searchQuery.toLowerCase())
  })

  // Get online status for a user
  const getUserOnlineStatus = (userEmail: string) => {
    return onlineUsers.find(user => user.userEmail === userEmail)?.status || 'offline'
  }

  // Get the other user in the conversation
  const getOtherUser = (conversation: DirectMessageConversation) => {
    return conversation.user1Email === user?.email ? conversation.user2Email : conversation.user1Email
  }

  // Get unread count for current user
  const getUnreadCount = (conversation: DirectMessageConversation) => {
    return conversation.user1Email === user?.email ? conversation.unreadCount1 : conversation.unreadCount2
  }

  // Get last message preview
  const getLastMessagePreview = (conversation: DirectMessageConversation) => {
    if (!conversation.lastMessageContent) return 'No messages yet'
    
    const sender = conversation.lastMessageSender === user?.email ? 'You' : conversation.lastMessageSender
    return `${sender}: ${conversation.lastMessageContent}`
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
        </div>
        <ScrollArea className="flex-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 border-b">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-2">Failed to load conversations</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Direct Messages
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onStartNewConversation}
            className="h-8 w-8 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
          />
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">
                {searchQuery ? 'No conversations found' : 'No direct messages yet'}
              </p>
              {!searchQuery && (
                <Button variant="outline" size="sm" onClick={onStartNewConversation}>
                  Start a conversation
                </Button>
              )}
            </div>
          </div>
        ) : (
          filteredConversations.map((conversation) => {
            const otherUser = getOtherUser(conversation)
            const onlineStatus = getUserOnlineStatus(otherUser)
            const unreadCount = getUnreadCount(conversation)
            const isSelected = selectedConversationId === conversation.id

            return (
              <div
                key={conversation.id}
                className={cn(
                  "p-4 border-b cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800",
                  isSelected && "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700"
                )}
                onClick={() => onSelectConversation(conversation.id)}
              >
                <div className="flex items-center space-x-3">
                  {/* Avatar with online status */}
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${otherUser}`} />
                      <AvatarFallback className="text-sm">
                        {otherUser.split('@')[0].substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1">
                      <Circle
                        className={cn(
                          "h-3 w-3",
                          onlineStatus === 'online' && "text-green-500 fill-current",
                          onlineStatus === 'away' && "text-yellow-500 fill-current",
                          onlineStatus === 'busy' && "text-red-500 fill-current",
                          onlineStatus === 'offline' && "text-gray-400"
                        )}
                      />
                    </div>
                  </div>

                  {/* Conversation details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {otherUser.split('@')[0]}
                      </h4>
                      {unreadCount > 0 && (
                        <Badge variant="destructive" className="h-5 w-5 rounded-full p-0 text-xs">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {getLastMessagePreview(conversation)}
                      </p>
                      {conversation.lastMessageAt && (
                        <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                          {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* More options */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </ScrollArea>
    </div>
  )
} 