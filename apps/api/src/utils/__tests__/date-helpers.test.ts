/**
 * Date Helper Utilities Tests
 * 
 * Comprehensive tests for date manipulation:
 * - Formatting
 * - Parsing
 * - Calculations
 * - Comparisons
 */

import { describe, it, expect } from 'vitest';

describe('Date Helpers', () => {
  describe('formatDate', () => {
    const formatDate = (date: Date, format: string = 'short'): string => {
      const options: Intl.DateTimeFormatOptions = 
        format === 'short'
          ? { year: 'numeric', month: '2-digit', day: '2-digit' }
          : { year: 'numeric', month: 'long', day: 'numeric' };

      return date.toLocaleDateString('en-US', options);
    };

    it('should format date in short format', () => {
      const date = new Date('2025-01-15');
      const formatted = formatDate(date, 'short');

      expect(formatted).toMatch(/01\/15\/2025/);
    });

    it('should format date in long format', () => {
      const date = new Date('2025-01-15');
      const formatted = formatDate(date, 'long');

      expect(formatted).toContain('January');
      expect(formatted).toContain('15');
    });
  });

  describe('formatDateTime', () => {
    const formatDateTime = (date: Date): string => {
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    it('should format date and time', () => {
      const date = new Date('2025-01-15T14:30:00');
      const formatted = formatDateTime(date);

      expect(formatted).toContain('Jan');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2:30');
    });
  });

  describe('formatRelativeTime', () => {
    const formatRelativeTime = (date: Date): string => {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSeconds < 60) return 'just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
      return `${Math.floor(diffDays / 30)}mo ago`;
    };

    it('should show "just now" for recent times', () => {
      const recent = new Date(Date.now() - 30 * 1000); // 30 seconds ago
      expect(formatRelativeTime(recent)).toBe('just now');
    });

    it('should show minutes ago', () => {
      const date = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      expect(formatRelativeTime(date)).toBe('5m ago');
    });

    it('should show hours ago', () => {
      const date = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3 hours ago
      expect(formatRelativeTime(date)).toBe('3h ago');
    });

    it('should show days ago', () => {
      const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      expect(formatRelativeTime(date)).toBe('2d ago');
    });
  });

  describe('addDays', () => {
    const addDays = (date: Date, days: number): Date => {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
    };

    it('should add days to date', () => {
      const date = new Date('2025-01-15');
      const result = addDays(date, 5);

      expect(result.getDate()).toBe(20);
    });

    it('should subtract days with negative number', () => {
      const date = new Date('2025-01-15');
      const result = addDays(date, -5);

      expect(result.getDate()).toBe(10);
    });

    it('should handle month boundary', () => {
      const date = new Date('2025-01-30');
      const result = addDays(date, 5);

      expect(result.getMonth()).toBe(1); // February
    });
  });

  describe('diffInDays', () => {
    const diffInDays = (date1: Date, date2: Date): number => {
      const diffTime = Math.abs(date2.getTime() - date1.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    it('should calculate difference in days', () => {
      const date1 = new Date('2025-01-01');
      const date2 = new Date('2025-01-10');

      expect(diffInDays(date1, date2)).toBe(9);
    });

    it('should handle same date', () => {
      const date = new Date('2025-01-01');

      expect(diffInDays(date, date)).toBe(0);
    });

    it('should handle reverse order', () => {
      const date1 = new Date('2025-01-10');
      const date2 = new Date('2025-01-01');

      expect(diffInDays(date1, date2)).toBe(9);
    });
  });

  describe('isToday', () => {
    const isToday = (date: Date): boolean => {
      const today = new Date();
      return date.toDateString() === today.toDateString();
    };

    it('should return true for today', () => {
      expect(isToday(new Date())).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      expect(isToday(yesterday)).toBe(false);
    });
  });

  describe('isWeekend', () => {
    const isWeekend = (date: Date): boolean => {
      const day = date.getDay();
      return day === 0 || day === 6; // Sunday or Saturday
    };

    it('should identify weekend days', () => {
      const saturday = new Date('2025-01-04'); // Saturday
      const sunday = new Date('2025-01-05'); // Sunday

      expect(isWeekend(saturday)).toBe(true);
      expect(isWeekend(sunday)).toBe(true);
    });

    it('should identify weekdays', () => {
      const monday = new Date('2025-01-06');
      expect(isWeekend(monday)).toBe(false);
    });
  });

  describe('getWeekNumber', () => {
    const getWeekNumber = (date: Date): number => {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    };

    it('should calculate week number', () => {
      const date = new Date('2025-01-15');
      const week = getWeekNumber(date);

      expect(week).toBeGreaterThan(0);
      expect(week).toBeLessThanOrEqual(53);
    });
  });

  describe('parseDate', () => {
    const parseDate = (str: string): Date | null => {
      const date = new Date(str);
      return isNaN(date.getTime()) ? null : date;
    };

    it('should parse valid date strings', () => {
      expect(parseDate('2025-01-15')).toBeInstanceOf(Date);
    });

    it('should return null for invalid dates', () => {
      expect(parseDate('invalid')).toBeNull();
    });
  });
});

