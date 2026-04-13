/**
 * Utility Formatters Tests
 * 
 * Tests formatting utility functions:
 * - Date formatting
 * - Number formatting
 * - Duration formatting
 * - Currency formatting
 * - String utilities
 */

import { describe, it, expect } from 'vitest';

describe('Formatting Utilities', () => {
  describe('Date Formatting', () => {
    const formatDate = (date: Date, format: string = 'short'): string => {
      const options: Intl.DateTimeFormatOptions = 
        format === 'short' 
          ? { year: 'numeric', month: 'short', day: 'numeric' }
          : { year: 'numeric', month: 'long', day: 'numeric' };

      return date.toLocaleDateString('en-US', options);
    };

    it('should format date in short format', () => {
      const date = new Date('2025-01-15');
      const formatted = formatDate(date, 'short');

      expect(formatted).toMatch(/Jan/);
      expect(formatted).toMatch(/15/);
      expect(formatted).toMatch(/2025/);
    });

    it('should format date in long format', () => {
      const date = new Date('2025-01-15');
      const formatted = formatDate(date, 'long');

      expect(formatted).toMatch(/January/);
      expect(formatted).toMatch(/15/);
      expect(formatted).toMatch(/2025/);
    });

    const formatRelativeTime = (date: Date): string => {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
      return `${Math.floor(diffDays / 365)} years ago`;
    };

    it('should format relative time', () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000);

      expect(formatRelativeTime(today)).toBe('Today');
      expect(formatRelativeTime(yesterday)).toBe('Yesterday');
      expect(formatRelativeTime(lastWeek)).toBe('5 days ago');
    });
  });

  describe('Number Formatting', () => {
    const formatNumber = (num: number): string => {
      return num.toLocaleString('en-US');
    };

    it('should format numbers with commas', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1000000)).toBe('1,000,000');
      expect(formatNumber(12345)).toBe('12,345');
    });

    it('should handle small numbers', () => {
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(10)).toBe('10');
      expect(formatNumber(999)).toBe('999');
    });

    const formatCompactNumber = (num: number): string => {
      if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
      if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
      return num.toString();
    };

    it('should format compact numbers', () => {
      expect(formatCompactNumber(500)).toBe('500');
      expect(formatCompactNumber(1500)).toBe('1.5K');
      expect(formatCompactNumber(1500000)).toBe('1.5M');
    });
  });

  describe('Duration Formatting', () => {
    const formatDuration = (seconds: number): string => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;

      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      if (minutes > 0) {
        return `${minutes}m ${secs}s`;
      }
      return `${secs}s`;
    };

    it('should format duration in hours and minutes', () => {
      expect(formatDuration(3661)).toBe('1h 1m');
      expect(formatDuration(7200)).toBe('2h 0m');
    });

    it('should format duration in minutes and seconds', () => {
      expect(formatDuration(125)).toBe('2m 5s');
      expect(formatDuration(60)).toBe('1m 0s');
    });

    it('should format duration in seconds only', () => {
      expect(formatDuration(45)).toBe('45s');
      expect(formatDuration(10)).toBe('10s');
    });
  });

  describe('Currency Formatting', () => {
    const formatCurrency = (amount: number, currency: string = 'USD'): string => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(amount);
    };

    it('should format USD currency', () => {
      expect(formatCurrency(1000)).toBe('$1,000.00');
      expect(formatCurrency(99.99)).toBe('$99.99');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should handle negative amounts', () => {
      expect(formatCurrency(-50.50)).toBe('-$50.50');
    });
  });

  describe('String Utilities', () => {
    const truncate = (str: string, length: number): string => {
      if (str.length <= length) return str;
      return str.substring(0, length) + '...';
    };

    it('should truncate long strings', () => {
      const long = 'This is a very long string that needs truncation';
      expect(truncate(long, 20)).toBe('This is a very long ...');
    });

    it('should not truncate short strings', () => {
      const short = 'Short';
      expect(truncate(short, 20)).toBe('Short');
    });

    const capitalize = (str: string): string => {
      return str.charAt(0).toUpperCase() + str.slice(1);
    };

    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('world')).toBe('World');
    });

    const slugify = (str: string): string => {
      return str
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
    };

    it('should create URL-friendly slugs', () => {
      expect(slugify('Hello World')).toBe('hello-world');
      expect(slugify('Test & Demo')).toBe('test--demo');
      expect(slugify('Multiple   Spaces')).toBe('multiple-spaces');
    });
  });

  describe('Percentage Calculations', () => {
    const calculatePercentage = (value: number, total: number): number => {
      if (total === 0) return 0;
      return Math.round((value / total) * 100);
    };

    it('should calculate percentage', () => {
      expect(calculatePercentage(50, 100)).toBe(50);
      expect(calculatePercentage(75, 100)).toBe(75);
      expect(calculatePercentage(33, 100)).toBe(33);
    });

    it('should handle zero total', () => {
      expect(calculatePercentage(10, 0)).toBe(0);
    });

    it('should round percentages', () => {
      expect(calculatePercentage(1, 3)).toBe(33);
      expect(calculatePercentage(2, 3)).toBe(67);
    });
  });
});

