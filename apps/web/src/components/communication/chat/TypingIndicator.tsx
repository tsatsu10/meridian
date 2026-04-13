import React from 'react';
import { motion } from 'framer-motion';
import { MessageUser } from '../../../types/chat';

interface TypingIndicatorProps {
  users: MessageUser[];
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ users }) => {
  if (users.length === 0) return null;

  const getTypingText = () => {
    if (users.length === 1) {
      return `${users[0].name} is typing`;
    } else if (users.length === 2) {
      return `${users[0].name} and ${users[1].name} are typing`;
    } else {
      return `${users[0].name} and ${users.length - 1} others are typing`;
    }
  };

  return (
    <motion.div
      className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <div className="flex gap-1">
        <motion.div
          className="w-1.5 h-1.5 bg-primary/50 rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [1, 0.5, 1],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: 0,
          }}
        />
        <motion.div
          className="w-1.5 h-1.5 bg-primary/50 rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [1, 0.5, 1],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: 0.2,
          }}
        />
        <motion.div
          className="w-1.5 h-1.5 bg-primary/50 rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [1, 0.5, 1],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: 0.4,
          }}
        />
      </div>
      <span>{getTypingText()}</span>
    </motion.div>
  );
}; 