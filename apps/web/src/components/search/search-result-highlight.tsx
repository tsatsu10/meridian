// @epic-3.1-messaging: Search result highlighting component
// @persona-sarah: PM needs to quickly identify relevant search matches
// @persona-david: Team lead needs efficient search result scanning

import React from 'react';
import { cn } from '@/lib/utils';

interface SearchResultHighlightProps {
  text: string;
  searchTerms?: string[];
  maxLength?: number;
  className?: string;
  highlightClassName?: string;
}

export function SearchResultHighlight({
  text,
  searchTerms = [],
  maxLength = 200,
  className = "",
  highlightClassName = "bg-yellow-200 dark:bg-yellow-800 font-medium"
}: SearchResultHighlightProps) {
  if (!text) {
    return <span className={className}>No content</span>;
  }

  // If no search terms, just return truncated text
  if (searchTerms.length === 0) {
    const truncated = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    return <span className={className}>{truncated}</span>;
  }

  // Create regex pattern for all search terms (case insensitive)
  const escapedTerms = searchTerms
    .filter(term => term && term.length > 0)
    .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  if (escapedTerms.length === 0) {
    const truncated = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    return <span className={className}>{truncated}</span>;
  }

  const pattern = new RegExp(`(${escapedTerms.join('|')})`, 'gi');

  // Find the best excerpt that contains the most matches
  const excerpt = findBestExcerpt(text, searchTerms, maxLength);
  
  // Split the excerpt by the pattern and highlight matches
  const parts = excerpt.split(pattern);
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
        const isMatch = pattern.test(part);
        return isMatch ? (
          <span key={index} className={highlightClassName}>
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        );
      })}
    </span>
  );
}

/**
 * Find the best excerpt from text that contains the most search term matches
 */
function findBestExcerpt(text: string, searchTerms: string[], maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  // Find all match positions
  const matches: { position: number; term: string }[] = [];
  
  searchTerms.forEach(term => {
    if (!term) return;
    
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        position: match.index,
        term: match[0]
      });
      
      // Prevent infinite loop for zero-length matches
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
    }
  });

  if (matches.length === 0) {
    // No matches found, return beginning of text
    return text.substring(0, maxLength) + '...';
  }

  // Sort matches by position
  matches.sort((a, b) => a.position - b.position);

  // Find the window that contains the most matches
  let bestStart = 0;
  let bestScore = 0;

  for (let i = 0; i < matches.length; i++) {
    const windowStart = Math.max(0, matches[i].position - maxLength / 2);
    const windowEnd = windowStart + maxLength;
    
    // Count matches in this window
    const matchesInWindow = matches.filter(
      match => match.position >= windowStart && match.position < windowEnd
    );
    
    if (matchesInWindow.length > bestScore) {
      bestScore = matchesInWindow.length;
      bestStart = windowStart;
    }
  }

  // Extract the best excerpt
  let excerpt = text.substring(bestStart, bestStart + maxLength);
  
  // Add ellipsis if we're not at the beginning or end
  if (bestStart > 0) {
    excerpt = '...' + excerpt;
  }
  if (bestStart + maxLength < text.length) {
    excerpt = excerpt + '...';
  }

  return excerpt;
}

// Component for highlighting search terms in message content
export function MessageSearchHighlight({
  content,
  searchTerms,
  className
}: {
  content: string;
  searchTerms?: string[];
  className?: string;
}) {
  return (
    <SearchResultHighlight
      text={content}
      searchTerms={searchTerms}
      maxLength={300}
      className={cn("text-sm", className)}
      highlightClassName="bg-yellow-200 dark:bg-yellow-800 px-1 rounded font-medium"
    />
  );
}

export default SearchResultHighlight;