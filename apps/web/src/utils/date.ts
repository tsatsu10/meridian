/**
 * 📅 Date Utility Functions
 * 
 * @epic-3.4-teams - Last active tracking and date formatting
 */

/**
 * Convert a timestamp to relative time format ("2 minutes ago", "3 days ago", etc.)
 * 
 * @param timestamp - Date string or Date object
 * @returns Formatted relative time string
 * 
 * @example
 * getRelativeTime(new Date()) // "Just now"
 * getRelativeTime("2024-10-25T10:00:00Z") // "2 hours ago"
 */
export function getRelativeTime(timestamp: string | Date | null | undefined): string {
  if (!timestamp) return 'Never';
  
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  // Handle future dates
  if (diffMs < 0) {
    return 'Just now';
  }
  
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  
  if (diffSecs < 10) return 'Just now';
  if (diffSecs < 60) return `${diffSecs} seconds ago`;
  if (diffMins === 1) return '1 minute ago';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffWeeks === 1) return '1 week ago';
  if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
  if (diffMonths === 1) return '1 month ago';
  if (diffMonths < 12) return `${diffMonths} months ago`;
  if (diffYears === 1) return '1 year ago';
  return `${diffYears} years ago`;
}

/**
 * Format date in a readable format
 * 
 * @param dateString - Date string
 * @param includeTime - Whether to include time
 * @returns Formatted date string
 */
export function formatDate(dateString: string | Date, includeTime: boolean = false): string {
  if (!dateString) return 'N/A';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const now = new Date();
  
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  };
  
  if (includeTime) {
    options.hour = 'numeric';
    options.minute = '2-digit';
  }
  
  return date.toLocaleDateString('en-US', options);
}

/**
 * Check if timestamp is within the last X minutes
 * Useful for determining "online" status
 */
export function isRecent(timestamp: string | Date | null | undefined, minutes: number = 5): boolean {
  if (!timestamp) return false;
  
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = diffMs / 60000;
  
  return diffMins <= minutes;
}

