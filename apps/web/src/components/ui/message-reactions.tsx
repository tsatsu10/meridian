import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Smile, 
  Plus,
  X
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { toast } from '@/lib/toast';

interface MessageReaction {
  emoji: string;
  count: number;
  users: {
    id: string;
    name: string;
    hasReacted: boolean;
  }[];
}

interface MessageReactionsProps {
  messageId: string;
  reactions?: MessageReaction[];
  onReactionAdd: (messageId: string, emoji: string) => void;
  onReactionRemove: (messageId: string, emoji: string) => void;
  currentUserId: string;
  disabled?: boolean;
  className?: string;
  maxDisplayedReactions?: number;
}

// Quick reaction emojis (most commonly used)
const QUICK_REACTIONS = [
  '👍', '👎', '❤️', '😂', '😮', '😢', '😡', '🎉', '🔥', '💯', '👌', '✅'
];

// Extended emoji categories
const EMOJI_CATEGORIES = {
  'Smileys': [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊',
    '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '😛',
    '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑',
    '😶', '😏', '😒', '🙄', '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒',
    '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸'
  ],
  'Gestures': [
    '👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
    '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌', '🤲',
    '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠'
  ],
  'Objects': [
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕',
    '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️',
    '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌'
  ],
  'Activities': [
    '🎉', '🎊', '🎈', '🎁', '🎀', '🎗️', '🎟️', '🎫', '🎖️', '🏆', '🏅', '🥇',
    '🥈', '🥉', '⚽', '⚾', '🥎', '🏀', '🏐', '🏈', '🏉', '🎾', '🥏', '🎳',
    '🏏', '🏑', '🏒', '🥍', '🏓', '🏸', '🥊', '🥋', '🎯', '⛳', '🪀', '🪁'
  ]
};

export default function MessageReactions({
  messageId,
  reactions = [],
  onReactionAdd,
  onReactionRemove,
  currentUserId,
  disabled = false,
  className,
  maxDisplayedReactions = 5
}: MessageReactionsProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof EMOJI_CATEGORIES>('Smileys');
  const [searchQuery, setSearchQuery] = useState('');

  // Get filtered emojis based on search
  const getFilteredEmojis = () => {
    if (!searchQuery) {
      return EMOJI_CATEGORIES[selectedCategory];
    }
    
    return Object.values(EMOJI_CATEGORIES)
      .flat()
      .filter(emoji => {
        // Simple emoji search by common names/descriptions
        const emojiNames: { [key: string]: string } = {
          '😀': 'happy smile grin',
          '😂': 'laugh tears joy',
          '❤️': 'heart love red',
          '👍': 'thumbs up good like',
          '👎': 'thumbs down bad dislike',
          '🔥': 'fire hot flame',
          '💯': 'hundred perfect',
          '🎉': 'party celebration',
          // Add more mappings as needed
        };
        
        const description = emojiNames[emoji] || '';
        return description.toLowerCase().includes(searchQuery.toLowerCase());
      });
  };

  // Handle reaction click
  const handleReactionClick = (emoji: string) => {
    const existingReaction = reactions.find(r => r.emoji === emoji);
    const userHasReacted = existingReaction?.users.some(u => u.id === currentUserId && u.hasReacted);

    if (userHasReacted) {
      onReactionRemove(messageId, emoji);
      toast.success(`Removed ${emoji} reaction`);
    } else {
      onReactionAdd(messageId, emoji);
      toast.success(`Added ${emoji} reaction`);
    }
  };

  // Handle quick reaction from picker
  const handleEmojiSelect = (emoji: string) => {
    handleReactionClick(emoji);
    setIsPickerOpen(false);
  };

  // Sort reactions by count (descending)
  const sortedReactions = [...reactions].sort((a, b) => b.count - a.count);
  const displayedReactions = sortedReactions.slice(0, maxDisplayedReactions);
  const hiddenReactionsCount = Math.max(0, sortedReactions.length - maxDisplayedReactions);

  return (
    <div className={cn("flex items-center gap-1 flex-wrap", className)}>
      {/* Existing Reactions */}
      {displayedReactions.map((reaction) => {
        const userHasReacted = reaction.users.some(u => u.id === currentUserId && u.hasReacted);
        const reactorNames = reaction.users
          .filter(u => u.hasReacted)
          .map(u => u.name)
          .slice(0, 3);
        const extraCount = Math.max(0, reaction.count - 3);
        
        const tooltip = reactorNames.length > 0 
          ? `${reactorNames.join(', ')}${extraCount > 0 ? ` and ${extraCount} others` : ''} reacted with ${reaction.emoji}`
          : `${reaction.count} reactions`;

        return (
          <Button
            key={reaction.emoji}
            variant={userHasReacted ? "default" : "outline"}
            size="sm"
            onClick={() => handleReactionClick(reaction.emoji)}
            disabled={disabled}
            className={cn(
              "h-7 px-2 text-xs gap-1 transition-all hover:scale-105",
              userHasReacted && "bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300 dark:bg-blue-900 dark:hover:bg-blue-800 dark:text-blue-100"
            )}
            title={tooltip}
          >
            <span className="text-sm">{reaction.emoji}</span>
            <span className="text-xs font-medium">{reaction.count}</span>
          </Button>
        );
      })}

      {/* Show hidden reactions count */}
      {hiddenReactionsCount > 0 && (
        <span className="text-xs text-muted-foreground px-2">
          +{hiddenReactionsCount} more
        </span>
      )}

      {/* Add Reaction Button */}
      <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            className="h-7 w-7 p-0 hover:bg-muted"
            title="Add reaction"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-80 p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700" 
          align="start"
        >
          <div className="p-3 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Add Reaction</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPickerOpen(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            {/* Quick Reactions */}
            <div>
              <div className="text-xs text-muted-foreground mb-2">Quick reactions</div>
              <div className="grid grid-cols-6 gap-1">
                {QUICK_REACTIONS.map((emoji) => (
                  <Button
                    key={emoji}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEmojiSelect(emoji)}
                    className="h-8 w-8 p-0 text-lg hover:bg-muted hover:scale-110 transition-all"
                    title={emoji}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div>
              <input
                type="text"
                placeholder="Search emojis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Categories */}
            {!searchQuery && (
              <div className="flex gap-1 overflow-x-auto pb-1">
                {Object.keys(EMOJI_CATEGORIES).map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedCategory(category as keyof typeof EMOJI_CATEGORIES)}
                    className="text-xs whitespace-nowrap"
                  >
                    {category}
                  </Button>
                ))}
              </div>
            )}

            {/* Emoji Grid */}
            <div className="max-h-40 overflow-y-auto">
              <div className="grid grid-cols-8 gap-1">
                {getFilteredEmojis().map((emoji) => (
                  <Button
                    key={emoji}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEmojiSelect(emoji)}
                    className="h-8 w-8 p-0 text-lg hover:bg-muted hover:scale-110 transition-all"
                    title={emoji}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
              
              {getFilteredEmojis().length === 0 && searchQuery && (
                <div className="text-center text-sm text-muted-foreground py-4">
                  No emojis found for "{searchQuery}"
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-md">
              💡 Click any emoji to add it as a reaction. Click again to remove your reaction.
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Hook for managing message reactions
export function useMessageReactions() {
  const [reactions, setReactions] = useState<{ [messageId: string]: MessageReaction[] }>({});

  const addReaction = (messageId: string, emoji: string, userId: string, userName: string) => {
    setReactions(prev => {
      const messageReactions = prev[messageId] || [];
      const existingReaction = messageReactions.find(r => r.emoji === emoji);

      if (existingReaction) {
        // Add user to existing reaction
        const userAlreadyReacted = existingReaction.users.some(u => u.id === userId);
        if (!userAlreadyReacted) {
          return {
            ...prev,
            [messageId]: messageReactions.map(r => 
              r.emoji === emoji 
                ? {
                    ...r,
                    count: r.count + 1,
                    users: [...r.users, { id: userId, name: userName, hasReacted: true }]
                  }
                : r
            )
          };
        }
      } else {
        // Create new reaction
        return {
          ...prev,
          [messageId]: [
            ...messageReactions,
            {
              emoji,
              count: 1,
              users: [{ id: userId, name: userName, hasReacted: true }]
            }
          ]
        };
      }

      return prev;
    });
  };

  const removeReaction = (messageId: string, emoji: string, userId: string) => {
    setReactions(prev => {
      const messageReactions = prev[messageId] || [];
      
      return {
        ...prev,
        [messageId]: messageReactions
          .map(r => {
            if (r.emoji === emoji) {
              const updatedUsers = r.users.filter(u => u.id !== userId);
              return {
                ...r,
                count: updatedUsers.length,
                users: updatedUsers
              };
            }
            return r;
          })
          .filter(r => r.count > 0) // Remove reactions with 0 count
      };
    });
  };

  const getReactions = (messageId: string): MessageReaction[] => {
    return reactions[messageId] || [];
  };

  const getTotalReactions = (messageId: string): number => {
    const messageReactions = reactions[messageId] || [];
    return messageReactions.reduce((total, reaction) => total + reaction.count, 0);
  };

  return {
    reactions,
    addReaction,
    removeReaction,
    getReactions,
    getTotalReactions,
  };
}