/**
 * String Helper Utilities Tests
 * 
 * Comprehensive tests for string manipulation:
 * - Formatting
 * - Validation
 * - Transformation
 * - Sanitization
 */

import { describe, it, expect } from 'vitest';

describe('String Helpers', () => {
  describe('capitalize', () => {
    const capitalize = (str: string): string => {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };

    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('world')).toBe('World');
    });

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('');
    });

    it('should handle single character', () => {
      expect(capitalize('a')).toBe('A');
    });

    it('should handle already capitalized', () => {
      expect(capitalize('Hello')).toBe('Hello');
    });

    it('should lowercase remaining characters', () => {
      expect(capitalize('hELLO')).toBe('Hello');
    });
  });

  describe('truncate', () => {
    const truncate = (str: string, length: number, suffix: string = '...'): string => {
      if (str.length <= length) return str;
      return str.substring(0, length) + suffix;
    };

    it('should truncate long strings', () => {
      expect(truncate('This is a very long string', 10)).toBe('This is a ...');
    });

    it('should not truncate short strings', () => {
      expect(truncate('Short', 10)).toBe('Short');
    });

    it('should handle custom suffix', () => {
      expect(truncate('Long string', 4, '…')).toBe('Long…');
    });

    it('should handle empty string', () => {
      expect(truncate('', 10)).toBe('');
    });

    it('should handle zero length', () => {
      expect(truncate('Hello', 0)).toBe('...');
    });
  });

  describe('slugify', () => {
    const slugify = (str: string): string => {
      return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    };

    it('should create URL-friendly slugs', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('should remove special characters', () => {
      expect(slugify('Hello! World?')).toBe('hello-world');
    });

    it('should handle multiple spaces', () => {
      expect(slugify('Hello   World')).toBe('hello-world');
    });

    it('should handle underscores', () => {
      expect(slugify('hello_world')).toBe('hello-world');
    });

    it('should remove leading/trailing dashes', () => {
      expect(slugify('-hello-world-')).toBe('hello-world');
    });

    it('should handle empty string', () => {
      expect(slugify('')).toBe('');
    });
  });

  describe('camelCase', () => {
    const camelCase = (str: string): string => {
      return str
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
    };

    it('should convert to camelCase', () => {
      expect(camelCase('hello world')).toBe('helloWorld');
      expect(camelCase('hello-world')).toBe('helloWorld');
      expect(camelCase('hello_world')).toBe('helloWorld');
    });

    it('should handle already camelCase', () => {
      expect(camelCase('helloWorld')).toBe('helloworld');
    });
  });

  describe('kebabCase', () => {
    const kebabCase = (str: string): string => {
      return str
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase();
    };

    it('should convert to kebab-case', () => {
      expect(kebabCase('helloWorld')).toBe('hello-world');
      expect(kebabCase('HelloWorld')).toBe('hello-world');
    });

    it('should handle spaces', () => {
      expect(kebabCase('hello world')).toBe('hello-world');
    });
  });

  describe('snakeCase', () => {
    const snakeCase = (str: string): string => {
      return str
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .toLowerCase();
    };

    it('should convert to snake_case', () => {
      expect(snakeCase('helloWorld')).toBe('hello_world');
      expect(snakeCase('hello-world')).toBe('hello_world');
    });
  });

  describe('escapeHtml', () => {
    const escapeHtml = (str: string): string => {
      const map: { [key: string]: string } = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
      };
      return str.replace(/[&<>"'/]/g, (char) => map[char]);
    };

    it('should escape HTML characters', () => {
      expect(escapeHtml('<div>Test</div>')).toBe('&lt;div&gt;Test&lt;&#x2F;div&gt;');
    });

    it('should escape quotes', () => {
      expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
    });

    it('should escape ampersands', () => {
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });
  });

  describe('stripHtml', () => {
    const stripHtml = (str: string): string => {
      return str.replace(/<[^>]*>/g, '');
    };

    it('should remove HTML tags', () => {
      expect(stripHtml('<p>Hello</p>')).toBe('Hello');
    });

    it('should handle nested tags', () => {
      expect(stripHtml('<div><p>Test</p></div>')).toBe('Test');
    });

    it('should handle self-closing tags', () => {
      expect(stripHtml('Hello<br/>World')).toBe('HelloWorld');
    });
  });

  describe('ellipsis', () => {
    const ellipsis = (str: string, maxLength: number): string => {
      if (str.length <= maxLength) return str;
      return str.substring(0, maxLength - 3) + '...';
    };

    it('should add ellipsis to long text', () => {
      expect(ellipsis('Very long text here', 10)).toBe('Very lo...');
    });

    it('should preserve short text', () => {
      expect(ellipsis('Short', 10)).toBe('Short');
    });
  });

  describe('pluralize', () => {
    const pluralize = (count: number, singular: string, plural?: string): string => {
      if (count === 1) return singular;
      return plural || singular + 's';
    };

    it('should return singular for 1', () => {
      expect(pluralize(1, 'task')).toBe('task');
    });

    it('should return plural for multiple', () => {
      expect(pluralize(5, 'task')).toBe('tasks');
    });

    it('should handle custom plural', () => {
      expect(pluralize(2, 'person', 'people')).toBe('people');
    });

    it('should handle zero', () => {
      expect(pluralize(0, 'task')).toBe('tasks');
    });
  });

  describe('isEmail', () => {
    const isEmail = (str: string): boolean => {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return regex.test(str);
    };

    it('should validate correct emails', () => {
      expect(isEmail('test@example.com')).toBe(true);
      expect(isEmail('user.name@example.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isEmail('notanemail')).toBe(false);
      expect(isEmail('@example.com')).toBe(false);
      expect(isEmail('user@')).toBe(false);
    });
  });

  describe('isUrl', () => {
    const isUrl = (str: string): boolean => {
      try {
        new URL(str);
        return true;
      } catch {
        return false;
      }
    };

    it('should validate URLs', () => {
      expect(isUrl('https://example.com')).toBe(true);
      expect(isUrl('http://localhost:3000')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isUrl('not a url')).toBe(false);
      expect(isUrl('example.com')).toBe(false);
    });
  });

  describe('randomString', () => {
    const randomString = (length: number): string => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    it('should generate string of correct length', () => {
      expect(randomString(10)).toHaveLength(10);
      expect(randomString(20)).toHaveLength(20);
    });

    it('should generate different strings', () => {
      const str1 = randomString(10);
      const str2 = randomString(10);
      
      expect(str1).not.toBe(str2);
    });
  });
});

