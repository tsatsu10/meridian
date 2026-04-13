// @epic-3.1-messaging: Chat Main Area - Phase 1 Integration
// @persona-sarah: PM needs real-time messaging interface for team coordination
// @persona-david: Team lead needs efficient communication with team members

import React, { useState, useEffect, useRef } from 'react'
import { API_URL } from '@/constants/urls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { useVirtualizer } from '@tanstack/react-virtual'
import { 
  Send, 
  Paperclip, 
  Smile, 
  MoreVertical, 
  Reply, 
  Heart,
  ThumbsUp,
  Laugh,
  Type,
  Users,
  Hash,
  Lock,
  X,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatDistanceToNow } from 'date-fns'
import { useUnifiedWebSocket } from '@/hooks/useUnifiedWebSocket'
import useWorkspaceStore from '@/store/workspace'
import useAuth from '@/components/providers/auth-provider/hooks/use-auth'
import { EmojiPicker } from './emoji-picker'
import { FileUploadModal } from './file-upload-modal'
import { ChannelMembersModal } from './channel-members-modal'
import { MentionsAutocomplete } from './mentions-autocomplete'
import { ChannelSettingsModal } from './channel-settings-modal'
import { ReactionPicker } from './reaction-picker'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { chatService } from '@/services/chatService'
import { toast } from 'sonner'

interface ChatMainAreaProps {
  selectedChatId: string | null
  onSelectUser?: (user: any) => void
  onSelectChat?: (chatId: string | null) => void
}

interface Reaction {
  emoji: string
  users: string[] // User emails who reacted
  count: number
}

interface Message {
  id: string
  content: string
  userEmail: string
  userName: string
  messageType: 'text' | 'file' | 'system'
  createdAt: string
  isEdited?: boolean
  editedAt?: string
  mentions?: string[]
  attachments?: any[]
  parentMessageId?: string
  reactions?: Reaction[]
  user: {
    email: string
    name: string
  }
}

interface Channel {
  id: string
  name: string
  type: 'public' | 'private' | 'dm' | 'announcement'
  description?: string
  memberCount?: number
}

export function ChatMainArea({ selectedChatId, onSelectUser, onSelectChat }: ChatMainAreaProps) {
  const { workspace } = useWorkspaceStore()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [showChannelSettings, setShowChannelSettings] = useState(false)
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set())
  const [showMentions, setShowMentions] = useState(false)
  const [mentionSearchQuery, setMentionSearchQuery] = useState('')
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0)
  const [mentionCursorPosition, setMentionCursorPosition] = useState(0)
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null)
  const [messageReactions, setMessageReactions] = useState<Record<string, Reaction[]>>({})
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // ✅ Load real messages from API
  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', selectedChatId],
    queryFn: async () => {
      if (!selectedChatId) return []
      const messages = await chatService.getMessages(selectedChatId, 50)
      return messages
    },
    enabled: Boolean(selectedChatId),
    staleTime: 10000, // 10 seconds
  })

  const messages = messagesData || []

  // ✅ Load channel info from API
  const { data: channelInfo } = useQuery({
    queryKey: ['channel', selectedChatId],
    queryFn: async () => {
      if (!selectedChatId) return null
      const response = await fetch(`${API_URL}/api/channel/${selectedChatId}`, {
        credentials: 'include',
      })
      if (!response.ok) {
        if (response.status === 404) return null
        throw new Error('Failed to load channel info')
      }
      const data = await response.json()
      return data.channel || null
    },
    enabled: Boolean(selectedChatId),
  })

  // Fetch workspace users for @mentions
  const { data: workspaceUsers = [] } = useQuery({
    queryKey: ['workspace-users', workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return []
      const response = await fetch(`${API_URL}/api/workspace-user/${workspace.id}/users`, {
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('Failed to load users')
      }
      const data = await response.json()
      return data.users || []
    },
    enabled: Boolean(workspace?.id),
    staleTime: 60000, // 1 minute
  })

  // ✅ Initialize Unified WebSocket connection with optimistic updates
  const unifiedWS = useUnifiedWebSocket({
    userEmail: user?.email!,
    workspaceId: workspace?.id!,
    enabled: Boolean(user?.email && workspace?.id),
    onMessage: (message) => {
      if (message.data?.message) {
        // Optimistically update the cache
        queryClient.setQueryData(['messages', selectedChatId], (old: any) => {
          if (!old) return [message.data.message]
          return [...old, message.data.message]
        })
        scrollToBottom()
      }
    },
    onTyping: (user) => {
      console.log(`${user.userEmail} is typing...`);
    },
    onError: (error) => {
      if (error === 'Access denied to channel') {
        setAccessDenied(true);
      }
      toast.error(`Chat error: ${error}`)
    },
    onChannelAccessDenied: async (channelId) => {
      // Try to join the channel automatically for public channels
      if (selectedChatId && workspace?.id) {
        try {
          const response = await fetch(`${API_URL}/api/channels/${selectedChatId}/join`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${user?.token}`,
            },
          });
          
          if (response.ok) {
            setAccessDenied(false);
            // Reconnect WebSocket
            unifiedWS.connect();
          } else {
            console.error('❌ Failed to join channel:', await response.text());
            setAccessDenied(true);
          }
        } catch (error) {
          console.error('❌ Error joining channel:', error);
          setAccessDenied(true);
        }
      }
    }
  })

  // Reset accessDenied when switching channels
  useEffect(() => {
    setAccessDenied(false);
  }, [selectedChatId]);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }

  // Auto-scroll to bottom on new messages (only if near bottom already)
  useEffect(() => {
    if (scrollContainerRef.current && messages.length > 0) {
      const scrollContainer = scrollContainerRef.current
      const isNearBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 200
      
      // Only auto-scroll if user is near the bottom
      if (isNearBottom || messages.length === 1) {
        setTimeout(() => {
          scrollToBottom()
        }, 100)
      }
    }
  }, [messages.length])

  // Scroll to bottom when changing channels
  useEffect(() => {
    if (scrollContainerRef.current && selectedChatId) {
      setTimeout(() => {
        scrollToBottom()
      }, 200)
    }
  }, [selectedChatId])

  // ✅ Join/leave channel when selectedChatId changes
  useEffect(() => {
    if (selectedChatId && unifiedWS.connectionState.isConnected) {
      unifiedWS.joinChannel(selectedChatId)
    }

    return () => {
      if (selectedChatId) {
        unifiedWS.leaveChannel(selectedChatId)
      }
    }
  }, [selectedChatId, unifiedWS.connectionState.isConnected])

  // ✅ Send message with optimistic updates
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChatId || !user?.email) return

    const tempId = `temp-${Date.now()}`
    const optimisticMessage: Message = {
      id: tempId,
      content: newMessage.trim(),
      userEmail: user.email,
      userName: user.name || user.email,
      messageType: 'text',
      createdAt: new Date().toISOString(),
      parentMessageId: replyingTo?.id,
      user: {
        email: user.email,
        name: user.name || user.email
      }
    }

    // Optimistically add to cache
    queryClient.setQueryData(['messages', selectedChatId], (old: any) => {
      if (!old) return [optimisticMessage]
      return [...old, optimisticMessage]
    })

    const messageContent = newMessage.trim()
    setNewMessage('')
    setReplyingTo(null)
    
    if (isTyping) {
      unifiedWS.stopTyping(selectedChatId)
      setIsTyping(false)
    }

    try {
      // Send via WebSocket
      unifiedWS.sendMessage(selectedChatId, messageContent, {
        parentMessageId: replyingTo?.id
      })
    } catch (error) {
      // Rollback on error
      queryClient.setQueryData(['messages', selectedChatId], (old: any) => {
        if (!old) return []
        return old.filter((m: Message) => m.id !== tempId)
      })
      toast.error('Failed to send message')
      setNewMessage(messageContent) // Restore message
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Don't send message if mentions dropdown is open
    if (showMentions && e.key === 'Enter') {
      return // Let handleMentionsKeyDown handle it
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji)
    setShowEmojiPicker(false)
  }

  const handleReaction = (messageId: string, emoji: string) => {
    if (!user?.email) return

    setMessageReactions(prev => {
      const currentReactions = prev[messageId] || []
      const existingReactionIndex = currentReactions.findIndex(r => r.emoji === emoji)
      
      let newReactions: Reaction[]
      
      if (existingReactionIndex >= 0) {
        // Reaction exists, toggle user's reaction
        const existingReaction = currentReactions[existingReactionIndex]
        const userHasReacted = existingReaction.users.includes(user.email)
        
        if (userHasReacted) {
          // Remove user's reaction
          const updatedUsers = existingReaction.users.filter(u => u !== user.email)
          if (updatedUsers.length === 0) {
            // Remove reaction entirely if no users left
            newReactions = currentReactions.filter((_, i) => i !== existingReactionIndex)
          } else {
            // Update reaction with new user list
            newReactions = currentReactions.map((r, i) => 
              i === existingReactionIndex 
                ? { ...r, users: updatedUsers, count: updatedUsers.length }
                : r
            )
          }
        } else {
          // Add user to existing reaction
          const updatedUsers = [...existingReaction.users, user.email]
          newReactions = currentReactions.map((r, i) => 
            i === existingReactionIndex
              ? { ...r, users: updatedUsers, count: updatedUsers.length }
              : r
          )
        }
      } else {
        // New reaction for this message
        newReactions = [...currentReactions, {
          emoji,
          users: [user.email],
          count: 1
        }]
      }
      
      return { ...prev, [messageId]: newReactions }
    })

    // TODO: Send reaction to backend via WebSocket
    // unifiedWS.socket?.emit('message:reaction', { messageId, emoji, action: 'toggle' })
    
    // Close reaction picker
    setReactionPickerMessageId(null)
  }

  const handleEdit = (message: Message) => {
    // TODO: Implement message editing
    console.log('Edit message:', message)
  }

  const handleDelete = (messageId: string) => {
    // TODO: Implement message deletion
    console.log('Delete message:', messageId)
  }

  const handlePin = (messageId: string) => {
    // TODO: Implement message pinning
    console.log('Pin message:', messageId)
  }

  const handleFileUpload = async (files: File[]) => {
    // TODO: Implement actual file upload to backend
    console.log('Uploading files:', files);
    
    // Mock file upload - in production, this would upload to server
    // and send file references via WebSocket
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // After upload, could send message with file attachments
      if (selectedChatId) {
        const fileMessage = `Shared ${files.length} file(s): ${files.map(f => f.name).join(', ')}`;
        unifiedWS.sendMessage(selectedChatId, fileMessage, {
          attachments: files.map(f => ({
            name: f.name,
            size: f.size,
            type: f.type
          }))
        });
      }
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'private':
        return <Lock className="w-4 h-4" />
      case 'dm':
        return <Users className="w-4 h-4" />
      default:
        return <Hash className="w-4 h-4" />
    }
  }

  // Organize messages into threads
  const organizeThreads = (messages: Message[]) => {
    const messageMap = new Map<string, Message>()
    const threads: Message[] = []
    const replies = new Map<string, Message[]>()

    // First pass: build message map and identify top-level messages
    messages.forEach(message => {
      messageMap.set(message.id, message)
      if (!message.parentMessageId) {
        threads.push(message)
      }
    })

    // Second pass: organize replies
    messages.forEach(message => {
      if (message.parentMessageId) {
        const existing = replies.get(message.parentMessageId) || []
        replies.set(message.parentMessageId, [...existing, message])
      }
    })

    return { threads, replies, messageMap }
  }

  // Prepare virtualized items
  const { threads, replies, messageMap } = organizeThreads(messages)
  const virtualItems = threads.flatMap((thread) => {
    const threadReplies = replies.get(thread.id) || []
    const isExpanded = expandedThreads.has(thread.id)
    
    // Return thread and its expanded replies
    const items = [{ type: 'message' as const, message: thread, isReply: false, replyCount: threadReplies.length }]
    
    if (isExpanded && threadReplies.length > 0) {
      threadReplies.forEach(reply => {
        items.push({ type: 'message' as const, message: reply, isReply: true, parentMessage: thread })
      })
    }
    
    return items
  })

  // Set up virtualizer
  const rowVirtualizer = useVirtualizer({
    count: virtualItems.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 100, // Estimated row height in pixels
    overscan: 5, // Number of items to render outside visible area
  })

  const toggleThread = (messageId: string) => {
    setExpandedThreads(prev => {
      const newSet = new Set(prev)
      if (newSet.has(messageId)) {
        newSet.delete(messageId)
      } else {
        newSet.add(messageId)
      }
      return newSet
    })
  }

  // Handle input change and detect @mentions
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const cursorPos = e.target.selectionStart || 0
    
    setNewMessage(value)
    
    // Detect @ symbol for mentions
    const textBeforeCursor = value.substring(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
      // Check if there's no space after @ (still typing mention)
      if (!textAfterAt.includes(' ') && lastAtIndex === textBeforeCursor.length - textAfterAt.length - 1) {
        setShowMentions(true)
        setMentionSearchQuery(textAfterAt)
        setMentionCursorPosition(lastAtIndex)
        setMentionSelectedIndex(0)
      } else {
        setShowMentions(false)
      }
    } else {
      setShowMentions(false)
    }
    
    // Handle typing indicator
    if (!isTyping && selectedChatId) {
      unifiedWS.startTyping(selectedChatId)
      setIsTyping(true)
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      if (selectedChatId) {
        unifiedWS.stopTyping(selectedChatId)
        setIsTyping(false)
      }
    }, 3000)
  }

  // Handle mention selection
  const handleMentionSelect = (user: any) => {
    const beforeMention = newMessage.substring(0, mentionCursorPosition)
    const afterMention = newMessage.substring(inputRef.current?.selectionStart || newMessage.length)
    const newText = `${beforeMention}@${user.name} ${afterMention}`
    
    setNewMessage(newText)
    setShowMentions(false)
    setMentionSearchQuery('')
    
    // Focus back on input
    setTimeout(() => {
      inputRef.current?.focus()
      const newCursorPos = beforeMention.length + user.name.length + 2
      inputRef.current?.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  // Handle keyboard navigation for mentions
  const handleMentionsKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showMentions) return
    
    const filteredUsers = workspaceUsers.filter((u: any) => {
      const query = mentionSearchQuery.toLowerCase()
      return (
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
      )
    }).slice(0, 8)
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setMentionSelectedIndex(prev => 
          prev < filteredUsers.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setMentionSelectedIndex(prev => prev > 0 ? prev - 1 : 0)
        break
      case 'Enter':
        if (filteredUsers.length > 0) {
          e.preventDefault()
          handleMentionSelect(filteredUsers[mentionSelectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowMentions(false)
        break
    }
  }

  const renderMessage = (message: Message, isReply: boolean = false, parentMessage?: Message, replyCount?: number) => {
    const isOwnMessage = message.userEmail === (user?.email || '')
    const hasReplies = (replyCount ?? 0) > 0
    const isExpanded = expandedThreads.has(message.id)
    
    return (
      <div
        key={message.id}
        className={cn(
          "flex gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
          isOwnMessage && "bg-blue-50/30 dark:bg-blue-500/5",
          isReply && "ml-12 pl-4 border-l-2 border-blue-500/30 dark:border-blue-400/30 bg-slate-50/50 dark:bg-slate-800/30"
        )}
      >
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={`https://avatar.vercel.sh/${message.userEmail}`} />
          <AvatarFallback className="text-xs">
            {message.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-semibold text-sm text-slate-900 dark:text-white">
              {message.userName}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
            </span>
            {message.isEdited && (
              <Badge variant="secondary" className="text-xs px-1 py-0">
                edited
              </Badge>
            )}
            {isReply && (
              <Badge variant="outline" className="text-xs px-1.5 py-0 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-400/30">
                <Reply className="w-2.5 h-2.5 mr-1" />
                Reply
              </Badge>
            )}
          </div>
          
          {/* Show parent message context inline for replies */}
          {isReply && parentMessage && (
            <div className="mb-2 p-2 rounded bg-gradient-to-r from-slate-100/80 to-slate-50/50 dark:from-slate-800/80 dark:to-slate-800/50 border-l-2 border-blue-400 dark:border-blue-500">
              <div className="flex items-center gap-1.5 mb-1">
                <Avatar className="w-4 h-4">
                  <AvatarImage src={`https://avatar.vercel.sh/${parentMessage.userEmail}`} />
                  <AvatarFallback className="text-[8px]">
                    {parentMessage.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {parentMessage.userName}
                </span>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                {parentMessage.content}
              </div>
            </div>
          )}
          
          <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
            {message.content}
          </div>
          
          {message.mentions && message.mentions.length > 0 && (
            <div className="flex gap-1 mt-2">
              {message.mentions.map((mention, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  @{mention}
                </Badge>
              ))}
            </div>
          )}
          
          {/* Reactions Display */}
          {(messageReactions[message.id]?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {messageReactions[message.id].map((reaction) => {
                const userHasReacted = reaction.users.includes(user?.email || '')
                return (
                  <Button
                    key={reaction.emoji}
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-6 px-2 text-xs gap-1 transition-all hover:scale-110",
                      userHasReacted 
                        ? "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600"
                        : "hover:bg-slate-100 dark:hover:bg-slate-700"
                    )}
                    onClick={() => handleReaction(message.id, reaction.emoji)}
                    title={`${reaction.users.length} ${reaction.users.length === 1 ? 'person' : 'people'} reacted with ${reaction.emoji}`}
                  >
                    <span className="text-base leading-none">{reaction.emoji}</span>
                    <span className="text-xs font-medium">{reaction.count}</span>
                  </Button>
                )
              })}
            </div>
          )}
          
          <div className="flex items-center gap-2 mt-2 relative">
            {/* Show reply count and expand/collapse for threaded messages */}
            {!isReply && hasReplies && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                onClick={() => toggleThread(message.id)}
              >
                <Reply className="w-3 h-3 mr-1" />
                {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                {isExpanded ? ' ▼' : ' ►'}
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700"
              onClick={() => setReplyingTo(message)}
            >
              <Reply className="w-3 h-3 mr-1" />
              Reply
            </Button>
            
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700"
                onClick={() => setReactionPickerMessageId(message.id)}
              >
                <Smile className="w-3 h-3 mr-1" />
                React
              </Button>
              
              {/* Reaction Picker */}
              {reactionPickerMessageId === message.id && (
                <ReactionPicker
                  onReactionSelect={(emoji) => handleReaction(message.id, emoji)}
                  onClose={() => setReactionPickerMessageId(null)}
                />
              )}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => handleEdit(message)}>
                  Edit message
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleDelete(message.id)}
                  className="text-red-600 dark:text-red-400"
                >
                  Delete message
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePin(message.id)}>
                  Pin message
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <Lock className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-red-700 mb-2">
            Access Denied
          </h3>
          <p className="text-slate-500 mb-6">
            You do not have permission to access this channel. This might be a private channel, or you may need to join it first.
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => {
                setAccessDenied(false);
                unifiedWS.connect();
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (onSelectChat) {
                  onSelectChat(null);
                }
                setAccessDenied(false);
              }}
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedChatId) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Hash className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Select a Channel
          </h3>
          <p className="text-slate-500 dark:text-slate-400">
            Choose a channel from the sidebar to start chatting with your team
          </p>
        </div>
      </div>
    )
  }

  const typingUsers = unifiedWS.getTypingUsers(selectedChatId || '')

  return (
    <div className="h-full flex flex-col">
      {/* Channel Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {channelInfo && getChannelIcon(channelInfo.type)}
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {channelInfo?.name || 'Channel'}
              </h2>
            </div>
            {channelInfo?.memberCount && (
              <Badge variant="secondary" className="text-xs">
                {channelInfo.memberCount} members
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowMembersModal(true)}
              title="View members"
            >
              <Users className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowChannelSettings(true)}
              title="Channel settings"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {channelInfo?.description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {channelInfo.description}
          </p>
        )}
        
        {/* Connection Status */}
        <div className="flex items-center gap-2 mt-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            unifiedWS.connectionState.isConnected ? "bg-green-500" : "bg-red-500"
          )} />
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {unifiedWS.connectionState.isConnected ? 'Connected' : 'Disconnected'}
          </span>
          {unifiedWS.connectionState.error && (
            <span className="text-xs text-red-500">
              - {unifiedWS.connectionState.error}
            </span>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 min-h-0">
        {messagesLoading ? (
          <div className="h-full p-4 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div 
            ref={scrollContainerRef}
            className="h-full overflow-auto"
            style={{ position: 'relative' }}
          >
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const item = virtualItems[virtualRow.index]
                
                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="border-b border-slate-100 dark:border-slate-800"
                  >
                    {renderMessage(
                      item.message,
                      item.isReply,
                      item.isReply ? item.parentMessage : undefined,
                      !item.isReply ? item.replyCount : undefined
                    )}
                  </div>
                )
              })}
            </div>
            
            {/* Typing Indicators */}
            {typingUsers.length > 0 && (
              <div 
                className="sticky bottom-0 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 border-t border-slate-200 dark:border-slate-700"
                style={{ marginTop: `${rowVirtualizer.getTotalSize()}px` }}
              >
                <Type className="w-4 h-4 animate-pulse" />
                <span>
                  {typingUsers.length === 1 
                    ? `${typingUsers[0]} is typing...`
                    : `${typingUsers.slice(0, -1).join(', ')} and ${typingUsers[typingUsers.length - 1]} are typing...`
                  }
                </span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Reply Banner */}
      {replyingTo && (
        <div className="flex-shrink-0 px-6 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Reply className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600 dark:text-slate-400">
                Replying to <strong>{replyingTo.userName}</strong>
              </span>
              <span className="text-slate-500 dark:text-slate-500 truncate max-w-xs">
                {replyingTo.content}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setReplyingTo(null)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="flex-shrink-0 p-6 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <div className="relative">
              <Input
                ref={inputRef}
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={handleMentionsKeyDown}
                onKeyPress={handleKeyPress}
                placeholder={`Message #${channelInfo?.name || 'channel'}... (Type @ to mention)`}
                className="pr-12 resize-none min-h-[40px] max-h-32"
                disabled={!unifiedWS.connectionState.isConnected}
              />
              
              {/* Mentions Autocomplete */}
              {showMentions && workspaceUsers.length > 0 && (
                <MentionsAutocomplete
                  users={workspaceUsers}
                  searchQuery={mentionSearchQuery}
                  selectedIndex={mentionSelectedIndex}
                  onSelect={handleMentionSelect}
                  onClose={() => setShowMentions(false)}
                  position={{ top: 80, left: 16 }}
                />
              )}
              
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={() => setShowFileUpload(true)}
                  title="Attach file"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <div className="relative">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    title="Add emoji"
                  >
                    <Smile className="w-4 h-4" />
                  </Button>
                  {showEmojiPicker && (
                    <EmojiPicker 
                      onEmojiSelect={handleEmojiSelect}
                      onClose={() => setShowEmojiPicker(false)}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
          <Button 
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || !unifiedWS.connectionState.isConnected}
            size="sm"
            className="h-10 px-4"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="text-xs text-slate-400 mt-2">
          Press Enter to send, Shift+Enter for new line • Type @ to mention someone
        </div>
      </div>

      {/* File Upload Modal */}
      <FileUploadModal
        isOpen={showFileUpload}
        onClose={() => setShowFileUpload(false)}
        onUpload={handleFileUpload}
        channelId={selectedChatId || undefined}
      />

      {/* Channel Members Modal */}
      {selectedChatId && (
        <ChannelMembersModal
          isOpen={showMembersModal}
          onClose={() => setShowMembersModal(false)}
          channelId={selectedChatId}
          channelName={channelInfo?.name || 'channel'}
          isChannelOwner={channelInfo?.type !== 'dm'}
        />
      )}

      {/* Channel Settings Modal */}
      {selectedChatId && (
        <ChannelSettingsModal
          isOpen={showChannelSettings}
          onClose={() => setShowChannelSettings(false)}
          channelId={selectedChatId}
          channelName={channelInfo?.name || 'channel'}
          isOwner={channelInfo?.type !== 'dm'} // TODO: Replace with actual ownership check
        />
      )}
    </div>
  )
}