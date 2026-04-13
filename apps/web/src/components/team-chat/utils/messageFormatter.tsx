// Message Formatter - Format message content with mentions

import React from 'react';

interface TextPart {
  type: 'text' | 'mention';
  content: string;
  key: string;
  className?: string;
}

/**
 * Format message content with highlighted @mentions
 * 
 * @param content - Message content
 * @param currentUserEmail - Current user's email for highlight
 * @returns Array of text and mention components
 */
export function formatTextWithMentions(
  content: string,
  currentUserEmail?: string
): React.ReactNode {
  const parts: TextPart[] = [];
  const mentionRegex = /@[\w.-]+@[\w.-]+/g;
  
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: content.substring(lastIndex, match.index),
        key: `text-${lastIndex}`,
      });
    }

    // Add mention
    const mentionEmail = match[0].substring(1); // Remove @ prefix
    const isSelf = mentionEmail === currentUserEmail;
    
    parts.push({
      type: 'mention',
      content: match[0],
      key: `mention-${match.index}`,
      className: isSelf
        ? 'bg-primary text-primary-foreground font-semibold'
        : 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 font-medium',
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.substring(lastIndex),
      key: `text-${lastIndex}`,
    });
  }

  // If no mentions found, return plain text
  if (parts.length === 0) {
    return content;
  }

  return parts.map((part) => {
    if (part.type === 'mention') {
      return (
        <span
          key={part.key}
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-sm ${part.className}`}
        >
          {part.content}
        </span>
      );
    }
    return <span key={part.key}>{part.content}</span>;
  });
}

/**
 * Extract @mentions from message content
 */
export function extractMentions(content: string): string[] {
  const mentionRegex = /@([\w.-]+@[\w.-]+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }

  return mentions;
}

/**
 * Sanitize message content (basic XSS protection)
 */
export function sanitizeContent(content: string): string {
  return content
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

