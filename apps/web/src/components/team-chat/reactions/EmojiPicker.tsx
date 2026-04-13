// Emoji Picker - Select emojis for reactions

import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Smile } from 'lucide-react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const EMOJI_CATEGORIES = {
  frequent: ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👏'],
  smileys: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉'],
  gestures: ['👍', '👎', '👏', '🙌', '👌', '✌️', '🤝', '💪', '🙏', '✋'],
  hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥'],
  objects: ['🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '⭐', '✨', '💫', '🔥'],
};

/**
 * EmojiPicker - Dropdown emoji selector for message reactions
 */
export function EmojiPicker({ onEmojiSelect, trigger, open, onOpenChange }: EmojiPickerProps) {
  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    onOpenChange?.(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Smile className="h-4 w-4" />
          </Button>
        )}
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-64 p-2" align="end">
        <div className="space-y-3">
          {/* Frequent Emojis */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
              Frequently Used
            </p>
            <div className="grid grid-cols-8 gap-1">
              {EMOJI_CATEGORIES.frequent.map((emoji) => (
                <Button
                  key={emoji}
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-accent text-lg"
                  onClick={() => handleEmojiClick(emoji)}
                  aria-label={`React with ${emoji}`}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </div>

          {/* Smileys */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
              Smileys
            </p>
            <div className="grid grid-cols-8 gap-1">
              {EMOJI_CATEGORIES.smileys.map((emoji) => (
                <Button
                  key={emoji}
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-accent text-lg"
                  onClick={() => handleEmojiClick(emoji)}
                  aria-label={`React with ${emoji}`}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </div>

          {/* Gestures */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
              Gestures
            </p>
            <div className="grid grid-cols-8 gap-1">
              {EMOJI_CATEGORIES.gestures.map((emoji) => (
                <Button
                  key={emoji}
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-accent text-lg"
                  onClick={() => handleEmojiClick(emoji)}
                  aria-label={`React with ${emoji}`}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </div>

          {/* Hearts */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
              Hearts
            </p>
            <div className="grid grid-cols-8 gap-1">
              {EMOJI_CATEGORIES.hearts.map((emoji) => (
                <Button
                  key={emoji}
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-accent text-lg"
                  onClick={() => handleEmojiClick(emoji)}
                  aria-label={`React with ${emoji}`}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </div>

          {/* Objects */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
              Celebrations
            </p>
            <div className="grid grid-cols-8 gap-1">
              {EMOJI_CATEGORIES.objects.map((emoji) => (
                <Button
                  key={emoji}
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-accent text-lg"
                  onClick={() => handleEmojiClick(emoji)}
                  aria-label={`React with ${emoji}`}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

