// @epic-3.1-messaging: Emoji Picker Component
// @persona-sarah: PM needs expressive communication with emojis
// @persona-mike: Dev needs easy emoji insertion

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { Search, Smile, Clock, Heart, ThumbsUp, Leaf, Star } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose?: () => void;
  className?: string;
}

const EMOJI_CATEGORIES = {
  recent: {
    name: 'Recently Used',
    icon: Clock,
    emojis: ['👍', '❤️', '😊', '🎉', '👏', '🔥']
  },
  smileys: {
    name: 'Smileys & People',
    icon: Smile,
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
      '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
      '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜',
      '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐',
      '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬',
      '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒',
      '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵',
      '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕'
    ]
  },
  gestures: {
    name: 'Gestures',
    icon: ThumbsUp,
    emojis: [
      '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙',
      '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐',
      '🖖', '👋', '🤛', '🤜', '✊', '👊', '🤝', '🙏',
      '💪', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀'
    ]
  },
  heart: {
    name: 'Hearts',
    icon: Heart,
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
      '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
      '💘', '💝', '💟'
    ]
  },
  celebration: {
    name: 'Celebration',
    icon: Star,
    emojis: [
      '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉',
      '⭐', '🌟', '✨', '💫', '🔥', '💥', '💯', '✅'
    ]
  },
  nature: {
    name: 'Nature',
    icon: Leaf,
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
      '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
      '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺',
      '🌸', '🌺', '🌻', '🌷', '🌹', '🌼', '🌴', '🌳',
      '🌲', '🌵', '🌾', '🌿', '☘️', '🍀', '🍁', '🍂'
    ]
  },
  food: {
    name: 'Food & Drink',
    icon: Star,
    emojis: [
      '🍕', '🍔', '🍟', '🌭', '🍿', '🧈', '🥐', '🥖',
      '🥨', '🥯', '🥞', '🧇', '🧀', '🍖', '🍗', '🥩',
      '🥓', '🍔', '🍟', '🍕', '🌮', '🌯', '🥙', '🥪',
      '☕', '🍵', '🥤', '🍺', '🍻', '🍷', '🥂', '🍾'
    ]
  },
  objects: {
    name: 'Objects',
    icon: Star,
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉',
      '🎱', '🎮', '🎯', '🎲', '🎰', '🎺', '🎸', '🎻',
      '📱', '💻', '⌚', '📷', '📹', '🎥', '📞', '📠',
      '💡', '🔦', '🕯️', '🧯', '🛒', '🎁', '🎀', '🎊'
    ]
  },
  symbols: {
    name: 'Symbols',
    icon: Star,
    emojis: [
      '❤️', '💙', '💚', '💛', '🧡', '💜', '🖤', '🤍',
      '💯', '💢', '💬', '👁️‍🗨️', '💭', '💤', '💨', '✨',
      '⚡', '💥', '💫', '💦', '💧', '💢', '☀️', '🌙'
    ]
  }
};

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  onEmojiSelect,
  onClose,
  className
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('recent');

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    // Store in recent emojis (could be localStorage)
    if (onClose) {
      onClose();
    }
  };

  const filteredEmojis = searchQuery
    ? Object.values(EMOJI_CATEGORIES).flatMap(cat => 
        cat.emojis.filter(() => true) // Simple filter, could add emoji names
      )
    : EMOJI_CATEGORIES[selectedCategory as keyof typeof EMOJI_CATEGORIES]?.emojis || [];

  return (
    <div 
      className={cn(
        "absolute bottom-full left-0 mb-2",
        "w-[320px] h-[380px]",
        "bg-white dark:bg-slate-800",
        "border border-slate-200 dark:border-slate-700",
        "rounded-lg shadow-lg",
        "flex flex-col",
        "z-50",
        className
      )}
    >
      {/* Header */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search emojis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full pl-9 pr-3 py-2 rounded-md",
              "bg-slate-100 dark:bg-slate-900",
              "border border-slate-200 dark:border-slate-700",
              "text-sm text-slate-900 dark:text-white",
              "placeholder-slate-500 dark:placeholder-slate-400",
              "focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            )}
          />
        </div>
      </div>

      {/* Category Tabs */}
      {!searchQuery && (
        <div className="flex items-center gap-1 p-2 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
          {Object.entries(EMOJI_CATEGORIES).map(([key, category]) => {
            const Icon = category.icon;
            return (
              <Button
                key={key}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 w-8 p-0 flex-shrink-0",
                  selectedCategory === key && "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
                )}
                onClick={() => setSelectedCategory(key)}
              >
                <Icon className="w-4 h-4" />
              </Button>
            );
          })}
        </div>
      )}

      {/* Emoji Grid */}
      <ScrollArea className="flex-1 p-2">
        <div className="grid grid-cols-8 gap-1">
          {filteredEmojis.map((emoji, index) => (
            <button
              key={`${emoji}-${index}`}
              onClick={() => handleEmojiClick(emoji)}
              className={cn(
                "h-9 w-9 flex items-center justify-center",
                "text-2xl",
                "rounded hover:bg-slate-100 dark:hover:bg-slate-700",
                "transition-colors duration-150",
                "focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              )}
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-2 border-t border-slate-200 dark:border-slate-700 text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Click an emoji to insert
        </p>
      </div>
    </div>
  );
};

export default EmojiPicker;

