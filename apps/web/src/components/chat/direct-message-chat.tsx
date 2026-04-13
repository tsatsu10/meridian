// @epic-4.1-direct-messaging: Direct message chat component
// @persona-sarah: PM needs real-time messaging with team members
// @persona-david: Team lead needs efficient communication with team members

"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Send, 
  Paperclip, 
  Smile, 
  MoreVertical, 
  Reply, 
  Edit,
  Trash2,
  Circle
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatDistanceToNow } from 'date-fns'
import { useDirectMessaging, useDirectMessageHistory } from '@/hooks/use-direct-messaging'
import { DirectMessage } from '@/fetchers/direct-messaging'
import useAuth from '@/components/providers/auth-provider/hooks/use-auth'
import useWorkspaceStore from '@/store/workspace'

interface DirectMessageChatProps {
  conversationId: string | null
  onBack: () => void
}

export function DirectMessageChat({ conversationId, onBack }: DirectMessageChatProps) {
  const { user } = useAuth()
  const { workspace } = useWorkspaceStore()
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [replyingTo, setReplyingTo] = useState<DirectMessage | null>(null)
  const [editingMessage, setEditingMessage] = useState<DirectMessage | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const { 
    conversations, 
    onlineUsers, 
    sendDirectMessage, 
    markConversationAsRead,
    isConnected,
    connectionState 
  } = useDirectMessaging()

  const { data: messages = [], isLoading: messagesLoading } = useDirectMessageHistory(
    conversationId || '',
    { limit: 50 }
  )

  // Get current conversation details
  const currentConversation = conversations.find(conv => conv.id === conversationId)
  const otherUserEmail = currentConversation 
    ? (currentConversation.user1Email === user?.email ? currentConversation.user2Email : currentConversation.user1Email)
    : null

  // Get online status
  const otherUserStatus = onlineUsers.find(u => u.userEmail === otherUserEmail)?.status || 'offline'

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Mark conversation as read when messages are loaded
  useEffect(() => {
    if (conversationId && messages.length > 0) {
      markConversationAsRead(conversationId)
    }
  }, [conversationId, messages, markConversationAsRead])

  const handleSendMessage = async () => {
    if (!conversationId || !newMessage.trim()) return

    try {
      await sendDirectMessage(conversationId, newMessage.trim(), {
        parentMessageId: replyingTo?.id
      })
      setNewMessage('')
      setReplyingTo(null)
      setIsTyping(false)
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true)
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
    }, 3000)
  }

  const isOwnMessage = (message: DirectMessage) => message.userEmail === user?.email

  if (!conversationId || !currentConversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-2">Select a conversation to start messaging</p>
          <Button variant="outline" size="sm" onClick={onBack}>
            Back to conversations
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-white dark:bg-gray-900">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="p-0 h-8 w-8">
            ←
          </Button>
          
          <div className="relative">
            <Avatar className="h-8 w-8">
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${otherUserEmail}`} />
              <AvatarFallback className="text-xs">
                {otherUserEmail?.split('@')[0].substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Circle
              className={cn(
                "absolute -bottom-1 -right-1 h-2.5 w-2.5",
                otherUserStatus === 'online' && "text-green-500 fill-current",
                otherUserStatus === 'away' && "text-yellow-500 fill-current",
                otherUserStatus === 'busy' && "text-red-500 fill-current",
                otherUserStatus === 'offline' && "text-gray-400"
              )}
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {otherUserEmail?.split('@')[0]}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {otherUserStatus}
            </p>
          </div>
          
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messagesLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4" />
                  <div className="h-12 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">No messages yet</p>
              <p className="text-xs text-gray-400">Start the conversation!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex space-x-3",
                  isOwnMessage(message) && "flex-row-reverse space-x-reverse"
                )}
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${message.userEmail}`} />
                  <AvatarFallback className="text-xs">
                    {message.userEmail.split('@')[0].substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className={cn(
                  "flex-1 max-w-xs lg:max-w-md",
                  isOwnMessage(message) && "text-right"
                )}>
                  <div className={cn(
                    "inline-block p-3 rounded-lg",
                    isOwnMessage(message)
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  )}>
                    {replyingTo?.id === message.id && (
                      <div className="text-xs opacity-75 mb-1">
                        Replying to: {replyingTo.content.substring(0, 30)}...
                      </div>
                    )}
                    
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    
                    {message.isEdited && (
                      <p className="text-xs opacity-75 mt-1">(edited)</p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                    </span>
                    
                    {isOwnMessage(message) && (
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
                          onClick={() => setEditingMessage(message)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Reply indicator */}
      {replyingTo && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800 border-t">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-500">Replying to:</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                {replyingTo.content}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyingTo(null)}
              className="h-6 w-6 p-0"
            >
              ×
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t bg-white dark:bg-gray-900">
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <Input
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value)
                handleTyping()
              }}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="min-h-[40px] max-h-32 resize-none"
              disabled={!isConnected}
            />
          </div>
          
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Smile className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || !isConnected}
              className="h-8 w-8 p-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Connection status */}
        {!isConnected && (
          <p className="text-xs text-red-500 mt-2">
            Connecting... Please wait
          </p>
        )}
      </div>
    </div>
  )
} 