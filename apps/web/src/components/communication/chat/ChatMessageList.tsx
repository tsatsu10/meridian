import React, { useRef, useEffect } from 'react';
import { Message } from '../../../types/chat';
import { ChatMessage } from './ChatMessage';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatMessageListProps {
  messages: Message[];
  onReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
  isLoading?: boolean;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  onReaction,
  onRemoveReaction,
  isLoading = false,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const scrollToBottomRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Estimated height of each message
    overscan: 5, // Number of items to render outside the visible area
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollToBottomRef.current) {
      scrollToBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  return (
    <div
      ref={parentRef}
      className="flex-1 overflow-y-auto"
      style={{
        height: '100%',
        width: '100%',
        contain: 'strict',
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        <AnimatePresence>
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const message = messages[virtualItem.index];
            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                className="p-2"
              >
                <ChatMessage
                  message={message}
                  onReaction={onReaction}
                  onRemoveReaction={onRemoveReaction}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <div ref={scrollToBottomRef} />
      {isLoading && (
        <motion.div
          className="flex justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="flex gap-2">
            <motion.div
              className="w-2 h-2 bg-primary rounded-full"
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
              className="w-2 h-2 bg-primary rounded-full"
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
              className="w-2 h-2 bg-primary rounded-full"
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
        </motion.div>
      )}
    </div>
  );
}; 