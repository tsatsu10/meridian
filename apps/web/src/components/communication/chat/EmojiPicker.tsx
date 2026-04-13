import React from 'react';
import { motion } from 'framer-motion';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

const commonEmojis = [
  '👍', '👎', '❤️', '😀', '😂', '🎉',
  '👀', '🔥', '✨', '🚀', '💯', '👏',
  '🤔', '😍', '🙌', '💪', '🎨', '💡',
];

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect }) => {
  return (
    <motion.div
      className="bg-background border rounded-lg shadow-lg p-2 grid grid-cols-6 gap-1"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      {commonEmojis.map((emoji) => (
        <motion.button
          key={emoji}
          className="p-1.5 hover:bg-muted rounded-md transition-colors"
          onClick={() => onSelect(emoji)}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
        >
          <span className="text-lg">{emoji}</span>
        </motion.button>
      ))}
    </motion.div>
  );
}; 