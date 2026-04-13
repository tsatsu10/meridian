import React, { memo, useCallback, useMemo } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Reply, ThumbsUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SwipeToReply } from './mobile/swipe-to-reply'
import { MessageStatus } from './message-status'
import { trackEvent } from '@/lib/analytics'

interface SimpleMessage {
  id: string
  content: string
  userEmail: string
  userName: string
  createdAt: string
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
  attachments?: any[]
  user?: { email: string; name: string }
}

interface OptimizedMessageItemProps {
  message: SimpleMessage
  isOwnMessage: boolean
  selectedChatId: string
  onReply: (message: SimpleMessage) => void
  onLike: (messageId: string) => void
}

const OptimizedMessageItemComponent = ({
  message,
  isOwnMessage,
  selectedChatId,
  onReply,
  onLike
}: OptimizedMessageItemProps) => {
  // Performance: Memoize expensive computations
  const formattedTime = useMemo(() => 
    formatDistanceToNow(new Date(message.createdAt), { addSuffix: true }),
    [message.createdAt]
  )

  const avatarFallback = useMemo(() => 
    message.userName.split(' ').map(n => n[0]).join('').toUpperCase(),
    [message.userName]
  )

  // Performance: Memoize event handlers
  const handleReply = useCallback(() => {
    onReply(message)
    trackEvent('message_replied', { channelId: selectedChatId, messageId: message.id })
  }, [message, onReply, selectedChatId])

  const handleLike = useCallback(() => {
    onLike(message.id)
    trackEvent('message_liked', { channelId: selectedChatId, messageId: message.id })
  }, [message.id, onLike, selectedChatId])

  return (
    <SwipeToReply key={message.id} onReply={handleReply}>
      <div
        className={cn(
          "flex gap-3 p-4 hover:bg-gray-50 transition-colors",
          isOwnMessage && "bg-blue-50/30"
        )}
        role="article"
        aria-label={`Message from ${message.userName}`}
      >
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={`https://avatar.vercel.sh/${message.userEmail}`} />
          <AvatarFallback className="text-xs">
            {avatarFallback}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-semibold text-sm text-gray-900">
              {message.userName}
            </span>
            <span className="text-xs text-gray-500">
              {formattedTime}
            </span>
            <MessageStatus status={message.status} />
          </div>
          
          <div className="text-sm text-gray-700 whitespace-pre-wrap">
            {message.content}
          </div>
          
          <div className="flex items-center gap-2 mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs hover:bg-gray-100"
              onClick={handleReply}
              aria-label={`Reply to message from ${message.userName}`}
            >
              <Reply className="w-3 h-3 mr-1" />
              Reply
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs hover:bg-gray-100"
              onClick={handleLike}
              aria-label={`Like message from ${message.userName}`}
            >
              <ThumbsUp className="w-3 h-3 mr-1" />
              Like
            </Button>
          </div>
        </div>
      </div>
    </SwipeToReply>
  )
}

// React.memo with custom comparison for optimal performance
export const OptimizedMessageItem = memo(OptimizedMessageItemComponent, (prevProps, nextProps) => {
  // Only re-render if message content, status, or interaction handlers change
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.status === nextProps.message.status &&
    prevProps.isOwnMessage === nextProps.isOwnMessage &&
    prevProps.selectedChatId === nextProps.selectedChatId &&
    prevProps.onReply === nextProps.onReply &&
    prevProps.onLike === nextProps.onLike
  )
})

OptimizedMessageItem.displayName = 'OptimizedMessageItem'