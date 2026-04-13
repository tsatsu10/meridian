import { describe, it, expect } from 'vitest';
import { cn } from '../cn';

describe('cn utility', () => {
  it('should merge single class name', () => {
    const result = cn('text-red-500');
    expect(result).toBe('text-red-500');
  });

  it('should merge multiple class names', () => {
    const result = cn('text-red-500', 'bg-blue-500');
    expect(result).toBe('text-red-500 bg-blue-500');
  });

  it('should handle conditional class names', () => {
    const isActive = true;
    const result = cn('base-class', isActive && 'active-class');
    expect(result).toBe('base-class active-class');
  });

  it('should filter out falsy values', () => {
    const result = cn('base', false, null, undefined, 0, '', 'other');
    expect(result).toBe('base other');
  });

  it('should merge conflicting Tailwind classes (last one wins)', () => {
    const result = cn('text-red-500', 'text-blue-500');
    // twMerge should keep only the last conflicting class
    expect(result).toBe('text-blue-500');
  });

  it('should handle arrays of class names', () => {
    const result = cn(['text-red-500', 'bg-blue-500']);
    expect(result).toBe('text-red-500 bg-blue-500');
  });

  it('should handle objects with boolean values', () => {
    const result = cn({
      'text-red-500': true,
      'bg-blue-500': false,
      'font-bold': true,
    });
    expect(result).toBe('text-red-500 font-bold');
  });

  it('should handle mixed input types', () => {
    const result = cn(
      'base',
      ['array-class'],
      { 'object-class': true },
      false && 'hidden',
      'final'
    );
    expect(result).toBe('base array-class object-class final');
  });

  it('should handle empty input', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('should merge responsive Tailwind classes', () => {
    const result = cn('md:text-red-500', 'md:text-blue-500');
    // Should keep only the last responsive class
    expect(result).toBe('md:text-blue-500');
  });

  it('should merge hover/focus states correctly', () => {
    const result = cn('hover:bg-red-500', 'hover:bg-blue-500');
    expect(result).toBe('hover:bg-blue-500');
  });

  it('should handle complex component styling patterns', () => {
    const variant = 'primary';
    const size = 'lg';
    const result = cn(
      'button',
      {
        'bg-blue-500': variant === 'primary',
        'bg-gray-500': variant === 'secondary',
      },
      {
        'px-4 py-2': size === 'sm',
        'px-6 py-3': size === 'lg',
      }
    );
    expect(result).toContain('button');
    expect(result).toContain('bg-blue-500');
    expect(result).toContain('px-6');
    expect(result).toContain('py-3');
  });

  it('should handle undefined and null safely', () => {
    const result = cn('base', undefined, null);
    expect(result).toBe('base');
  });

  it('should deduplicate identical classes', () => {
    const result = cn('text-red-500', 'text-red-500');
    expect(result).toBe('text-red-500');
  });

  it('should handle spacing utilities correctly', () => {
    const result = cn('p-4', 'p-6');
    // Last padding should win
    expect(result).toBe('p-6');
  });

  it('should preserve non-conflicting classes when merging', () => {
    const result = cn('text-red-500 font-bold', 'text-blue-500 underline');
    // Should have blue text, bold, and underline
    expect(result).toContain('text-blue-500');
    expect(result).toContain('font-bold');
    expect(result).toContain('underline');
    expect(result).not.toContain('text-red-500');
  });
});
