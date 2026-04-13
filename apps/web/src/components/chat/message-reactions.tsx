import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import EmojiPicker from "@/components/ui/emoji-picker";
import { useMessageReaction, useRemoveReaction } from "@/hooks/use-messages";
import { useAuth } from '@/components/providers/unified-context-provider';

interface MessageReaction {
  emoji: string;
  userEmail: string;
}

interface MessageReactionsProps {
  messageId: string;
  reactions?: string; // JSON string of reactions
  onReactionUpdate?: (reactions: MessageReaction[]) => void;
  className?: string;
  showAddButton?: boolean;
  size?: 'sm' | 'md';
}

export default function MessageReactions({
  messageId,
  reactions,
  onReactionUpdate,
  className,
  showAddButton = true,
  size = 'sm'
}: MessageReactionsProps) {
  const { user } = useAuth();
  const addReactionMutation = useMessageReaction();
  const removeReactionMutation = useRemoveReaction();
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  // Parse reactions from JSON string
  const parsedReactions: MessageReaction[] = React.useMemo(() => {
    try {
      return reactions ? JSON.parse(reactions) : [];
    } catch {
      return [];
    }
  }, [reactions]);

  // Group reactions by emoji and count users
  const groupedReactions = React.useMemo(() => {
    const groups: Record<string, { emoji: string; users: string[]; count: number }> = {};
    
    parsedReactions.forEach(reaction => {
      if (!groups[reaction.emoji]) {
        groups[reaction.emoji] = {
          emoji: reaction.emoji,
          users: [],
          count: 0
        };
      }
      if (!groups[reaction.emoji].users.includes(reaction.userEmail)) {
        groups[reaction.emoji].users.push(reaction.userEmail);
        groups[reaction.emoji].count++;
      }
    });

    return Object.values(groups);
  }, [parsedReactions]);

  const handleAddReaction = useCallback(async (emoji: string) => {
    try {
      await addReactionMutation.mutateAsync({ messageId, emoji });
      setIsEmojiPickerOpen(false);
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  }, [addReactionMutation, messageId]);

  const handleReactionClick = async (emoji: string) => {
    const currentUserEmail = user?.email;
    if (!currentUserEmail) return;

    const reactionGroup = groupedReactions.find(group => group.emoji === emoji);
    const userHasReacted = reactionGroup?.users.includes(currentUserEmail);

    try {
      if (userHasReacted) {
        // Remove reaction
        await removeReactionMutation.mutateAsync({ messageId, emoji });
      } else {
        // Add reaction
        await addReactionMutation.mutateAsync({ messageId, emoji });
      }
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
    }
  };

  if (groupedReactions.length === 0 && !showAddButton) {
    return null;
  }

  const buttonSize = size === 'sm' ? 'h-6 px-2 text-xs' : 'h-8 px-3 text-sm';
  const emojiSize = size === 'sm' ? 'text-sm' : 'text-base';

  return (
    <div className={cn("flex items-center space-x-1 flex-wrap", className)}>
      {/* Existing reactions */}
      {groupedReactions.map((reactionGroup) => {
        const userHasReacted = user?.email && reactionGroup.users.includes(user.email);
        
        return (
          <Button
            key={reactionGroup.emoji}
            variant="ghost"
            size="sm"
            onClick={() => handleReactionClick(reactionGroup.emoji)}
            disabled={addReactionMutation.isPending || removeReactionMutation.isPending}
            className={cn(
              "flex items-center space-x-1 rounded-full transition-colors",
              buttonSize,
              userHasReacted
                ? "bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200"
                : "bg-muted hover:bg-muted/80 border border-transparent"
            )}
            title={`${reactionGroup.users.join(', ')} reacted with ${reactionGroup.emoji}`}
          >
            <span className={emojiSize}>{reactionGroup.emoji}</span>
            <span className="font-medium">{reactionGroup.count}</span>
          </Button>
        );
      })}

      {/* Add reaction button */}
      {showAddButton && (
        <EmojiPicker
          onEmojiSelect={handleAddReaction}
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "rounded-full opacity-70 hover:opacity-100 border border-dashed border-muted-foreground/30",
                buttonSize
              )}
              disabled={addReactionMutation.isPending}
            >
              <Plus className="h-3 w-3" />
            </Button>
          }
        />
      )}
    </div>
  );
}