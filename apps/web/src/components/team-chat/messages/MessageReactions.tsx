// Message Reactions - Display and interact with message reactions

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { useChatActions } from '../context/ChatContext';
import { useAuth } from '@/components/providers/unified-context-provider';
import type { MessageReaction } from '../types';

interface MessageReactionsProps {
  messageId: string;
  reactions: MessageReaction[];
}

/**
 * MessageReactions - Displays emoji reactions on a message
 * 
 * Groups reactions by emoji and allows clicking to add/remove.
 */
export function MessageReactions({ messageId, reactions }: MessageReactionsProps) {
  const { user } = useAuth();
  const { addReaction, removeReaction } = useChatActions();

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = {
        emoji: reaction.emoji,
        count: 0,
        users: [],
        hasReacted: false,
      };
    }
    
    acc[reaction.emoji].count++;
    acc[reaction.emoji].users.push(reaction.userName || reaction.userEmail);
    
    if (reaction.userEmail === user?.userEmail) {
      acc[reaction.emoji].hasReacted = true;
    }
    
    return acc;
  }, {} as Record<string, { emoji: string; count: number; users: string[]; hasReacted: boolean }>);

  const reactionGroups = Object.values(groupedReactions);

  if (reactionGroups.length === 0) {
    return null;
  }

  const handleReactionClick = async (emoji: string, hasReacted: boolean) => {
    try {
      if (hasReacted) {
        await removeReaction(messageId, emoji);
      } else {
        await addReaction(messageId, emoji);
      }
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
    }
  };

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {reactionGroups.map((group) => (
        <Button
          key={group.emoji}
          variant="ghost"
          size="sm"
          onClick={() => handleReactionClick(group.emoji, group.hasReacted)}
          className={cn(
            'h-6 px-2 text-xs rounded-full border',
            'hover:bg-accent transition-colors',
            group.hasReacted
              ? 'bg-primary/10 border-primary/50'
              : 'bg-background border-border'
          )}
          title={group.users.join(', ')}
          aria-label={`${group.emoji} reaction by ${group.count} ${group.count === 1 ? 'person' : 'people'}`}
        >
          <span className="mr-1">{group.emoji}</span>
          <span className="font-medium">{group.count}</span>
        </Button>
      ))}
    </div>
  );
}

