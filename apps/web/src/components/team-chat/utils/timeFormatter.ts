// Time Formatter - Format message timestamps

import { formatDistanceToNow } from 'date-fns';

/**
 * Format message timestamp to human-readable string
 * 
 * - "just now" for < 1 minute
 * - "5m ago" for < 1 hour
 * - "14:30" for today
 * - "2 days ago" for older
 */
export function formatMessageTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'just now';
    }

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    }

    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.error('Error formatting time:', error);
    return 'Invalid date';
  }
}

/**
 * Format full date and time
 */
export function formatFullDateTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch (error) {
    return 'Invalid date';
  }
}

