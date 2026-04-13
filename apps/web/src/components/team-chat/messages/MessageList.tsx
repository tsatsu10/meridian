// Message List - Displays messages with auto-scroll

import React, { useEffect, useRef } from 'react';
import { MessageItem } from './MessageItem';
import type { TeamMessage } from '../types';

interface MessageListProps {
  messages: TeamMessage[];
}

/**
 * MessageList - Renders list of messages with auto-scroll
 * 
 * TODO: Add virtual scrolling with @tanstack/react-virtual for better performance
 */
export function MessageList({ messages }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(messages.length);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    // Only auto-scroll if new messages were added (not on initial load)
    if (messages.length > prevMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
      
      {/* Auto-scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
}

