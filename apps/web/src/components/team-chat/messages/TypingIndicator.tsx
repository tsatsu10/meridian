// Typing Indicator - Shows who is typing

import React from 'react';
import type { TypingUser } from '../types';

interface TypingIndicatorProps {
  users: TypingUser[];
}

/**
 * TypingIndicator - Animated typing indicator
 * 
 * Shows names of users currently typing.
 */
export function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  const displayText =
    users.length === 1
      ? `${users[0].userName || users[0].userEmail} is typing...`
      : users.length === 2
      ? `${users[0].userName || users[0].userEmail} and ${users[1].userName || users[1].userEmail} are typing...`
      : `${users.length} people are typing...`;

  return (
    <div 
      className="flex items-center gap-2 text-sm text-muted-foreground animate-in fade-in"
      role="status"
      aria-live="polite"
      aria-label={displayText}
    >
      <div className="flex space-x-1">
        <Dot delay={0} />
        <Dot delay={0.1} />
        <Dot delay={0.2} />
      </div>
      <span>{displayText}</span>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <div
      className="w-2 h-2 bg-primary rounded-full animate-bounce"
      style={{ animationDelay: `${delay}s` }}
    />
  );
}

