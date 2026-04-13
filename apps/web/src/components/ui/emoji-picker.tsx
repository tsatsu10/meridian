import React, { useState, useCallback } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Smile } from "lucide-react";
import { cn } from "@/lib/utils";

// Common reaction emojis for quick access
const COMMON_REACTIONS = ['👍', '😊', '❤️', '😮', '😢', '😡'];

// Categorized emojis
const EMOJI_CATEGORIES = {
  smileys: {
    name: 'Smileys & People',
    emojis: [
      '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', 
      '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒',
      '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡',
      '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶'
    ]
  },
  gestures: {
    name: 'Gestures',
    emojis: [
      '👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️',
      '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✊', '👊', '🤛', '🤜', '💪', '🦾', '🖐️', '✋', '🤚', '👋'
    ]
  },
  hearts: {
    name: 'Hearts & Symbols',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
      '💘', '💝', '💟', '♥️', '💌', '💋', '💍', '💎', '🔥', '💯', '💫', '⭐', '🌟', '💥', '💢', '💨'
    ]
  },
  nature: {
    name: 'Nature',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
      '🌸', '🌺', '🌻', '🌷', '🌹', '🌵', '🌲', '🌳', '🌿', '☘️', '🍀', '🎋', '🎍', '🌾', '🌱', '🌴'
    ]
  },
  food: {
    name: 'Food & Drink',
    emojis: [
      '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆',
      '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕', '🥔', '🍠', '🥐', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳'
    ]
  },
  objects: {
    name: 'Objects',
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍',
      '🎯', '🎮', '🕹️', '🎰', '🎲', '🧩', '🎨', '🎭', '🎪', '🎫', '🎟️', '🎬', '🎤', '🎧', '🎼', '🎵'
    ]
  }
};

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  trigger?: React.ReactNode;
  className?: string;
  showCommonReactions?: boolean;
}

export default function EmojiPicker({ 
  onEmojiSelect, 
  trigger, 
  className,
  showCommonReactions = true 
}: EmojiPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const defaultTrigger = (
    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
      <Smile className="h-4 w-4" />
    </Button>
  );

  const handleEmojiClick = useCallback((emoji: string) => {
    onEmojiSelect(emoji);
    setIsOpen(false);
  }, [onEmojiSelect]);

  const filterEmojis = useCallback((emojis: string[]) => {
    if (!searchQuery) return emojis;
    // Simple filter - in a real app you might want more sophisticated search
    return emojis.filter(emoji => 
      emoji.includes(searchQuery) || 
      // Add emoji names/descriptions here if available
      false
    );
  }, [searchQuery]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger || defaultTrigger}
      </PopoverTrigger>
      <PopoverContent className={cn("w-80 p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700", className)} align="start">
        <div className="flex flex-col h-96 bg-white dark:bg-gray-900">
          {/* Search bar */}
          <div className="p-3 border-b bg-white dark:bg-gray-900">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search emojis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex-1 overflow-hidden bg-white dark:bg-gray-900">
            <Tabs defaultValue={showCommonReactions ? "common" : "smileys"} className="h-full">
              <TabsList className="grid w-full grid-cols-7 rounded-none border-b bg-white dark:bg-gray-900">
                {showCommonReactions && (
                  <TabsTrigger value="common" className="text-xs">Quick</TabsTrigger>
                )}
                <TabsTrigger value="smileys" className="text-xs">😊</TabsTrigger>
                <TabsTrigger value="gestures" className="text-xs">👍</TabsTrigger>
                <TabsTrigger value="hearts" className="text-xs">❤️</TabsTrigger>
                <TabsTrigger value="nature" className="text-xs">🌿</TabsTrigger>
                <TabsTrigger value="food" className="text-xs">🍎</TabsTrigger>
                <TabsTrigger value="objects" className="text-xs">⚽</TabsTrigger>
              </TabsList>

              <div className="overflow-y-auto h-full bg-white dark:bg-gray-900">
                {showCommonReactions && (
                  <TabsContent value="common" className="p-3 mt-0">
                    <div className="grid grid-cols-8 gap-2">
                      {filterEmojis(COMMON_REACTIONS).map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleEmojiClick(emoji)}
                          className="aspect-square flex items-center justify-center text-lg hover:bg-muted rounded-md transition-colors"
                          title={emoji}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </TabsContent>
                )}

                {Object.entries(EMOJI_CATEGORIES).map(([key, category]) => (
                  <TabsContent key={key} value={key} className="p-3 mt-0">
                    <div className="grid grid-cols-8 gap-2">
                      {filterEmojis(category.emojis).map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleEmojiClick(emoji)}
                          className="aspect-square flex items-center justify-center text-lg hover:bg-muted rounded-md transition-colors"
                          title={emoji}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}