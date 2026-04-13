import { useEffect, useCallback, useRef, useState } from 'react';

/**
 * Keyboard Shortcut Configuration
 */
export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean; // Cmd on Mac, Win on Windows
  action: () => void;
  description: string;
  preventDefault?: boolean;
}

/**
 * Custom hook for keyboard shortcuts
 * 
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   {
 *     key: 'n',
 *     action: () => setIsModalOpen(true),
 *     description: 'Create new task'
 *   },
 *   {
 *     key: 'k',
 *     meta: true, // Cmd+K
 *     action: () => focusSearch(),
 *     description: 'Focus search'
 *   }
 * ]);
 * ```
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled = true) {
  const shortcutsRef = useRef(shortcuts);

  // Update ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Ignore shortcuts when typing in input fields
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
      // Allow Cmd+K even in input fields
      if (!(event.key === 'k' && (event.metaKey || event.ctrlKey))) {
        return;
      }
    }

    for (const shortcut of shortcutsRef.current) {
      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatches = !!shortcut.ctrl === event.ctrlKey;
      const shiftMatches = !!shortcut.shift === event.shiftKey;
      const altMatches = !!shortcut.alt === event.altKey;
      const metaMatches = !!shortcut.meta === (event.metaKey || event.ctrlKey);

      if (keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches) {
        if (shortcut.preventDefault !== false) {
          event.preventDefault();
        }
        shortcut.action();
        break;
      }
    }
  }, [enabled]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Hook for displaying keyboard shortcuts help
 */
export function useKeyboardShortcutsHelp(shortcuts: KeyboardShortcut[]) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Add '?' shortcut to open help
  useKeyboardShortcuts([
    {
      key: '?',
      shift: true,
      action: () => setIsHelpOpen(true),
      description: 'Show keyboard shortcuts',
    },
  ]);

  return {
    isHelpOpen,
    openHelp: () => setIsHelpOpen(true),
    closeHelp: () => setIsHelpOpen(false),
    shortcuts,
  };
}

/**
 * Format keyboard shortcut for display
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  
  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');
  if (shortcut.meta) {
    // Show Cmd on Mac, Ctrl on Windows/Linux
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    parts.push(isMac ? 'Cmd' : 'Ctrl');
  }
  
  parts.push(shortcut.key.toUpperCase());
  
  return parts.join(' + ');
}

/**
 * Hook for handling Escape key press
 * Useful for closing modals and dialogs
 * 
 * @param onEscape - Callback to execute when Escape is pressed
 * @param enabled - Whether the hook is enabled (default: true)
 * 
 * @example
 * ```tsx
 * useEscapeKey(() => {
 *   if (isModalOpen) setIsModalOpen(false);
 * });
 * ```
 */
export function useEscapeKey(onEscape: () => void, enabled = true) {
  useKeyboardShortcuts([
    {
      key: 'Escape',
      action: onEscape,
      description: 'Close modal or dialog',
      preventDefault: false,
    },
  ], enabled);
}

export default useKeyboardShortcuts;
