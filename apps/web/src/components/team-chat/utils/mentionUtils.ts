// Mention Utilities - Helper functions for @mentions

/**
 * Detect if user is typing a mention
 * 
 * @param content - Current input content
 * @param cursorPosition - Current cursor position
 * @returns Mention info or null
 */
export function detectMention(content: string, cursorPosition: number) {
  // Find the last @ before cursor
  const beforeCursor = content.substring(0, cursorPosition);
  const lastAtIndex = beforeCursor.lastIndexOf('@');

  if (lastAtIndex === -1) {
    return null;
  }

  // Check if there's a space between @ and cursor (mention ended)
  const afterAt = beforeCursor.substring(lastAtIndex + 1);
  if (afterAt.includes(' ')) {
    return null;
  }

  return {
    searchTerm: afterAt,
    startIndex: lastAtIndex,
  };
}

/**
 * Insert mention into content at cursor position
 * 
 * @param content - Current content
 * @param mention - Email to insert
 * @param startIndex - Index where @ starts
 * @param cursorPosition - Current cursor position
 * @returns Updated content and new cursor position
 */
export function insertMention(
  content: string,
  mention: string,
  startIndex: number,
  cursorPosition: number
) {
  const before = content.substring(0, startIndex);
  const after = content.substring(cursorPosition);
  
  const newContent = `${before}@${mention} ${after}`;
  const newCursorPosition = before.length + mention.length + 2; // +2 for @ and space

  return {
    content: newContent,
    cursorPosition: newCursorPosition,
  };
}

/**
 * Extract all mentions from content
 */
export function extractMentions(content: string): string[] {
  const mentionRegex = /@([\w.-]+@[\w.-]+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    if (!mentions.includes(match[1])) {
      mentions.push(match[1]);
    }
  }

  return mentions;
}

/**
 * Get cursor position in textarea
 */
export function getCursorPosition(element: HTMLTextAreaElement): number {
  return element.selectionStart;
}

/**
 * Set cursor position in textarea
 */
export function setCursorPosition(element: HTMLTextAreaElement, position: number) {
  element.setSelectionRange(position, position);
  element.focus();
}

