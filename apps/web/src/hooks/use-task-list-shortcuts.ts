import { useEffect, useCallback } from 'react';
import { toast } from '@/lib/enhanced-toast';

interface TaskListShortcutsProps {
  // Navigation
  onFocusSearch?: () => void;
  onToggleSelectAll?: () => void;
  onEscape?: () => void;

  // Task Operations
  onCreateTask?: () => void;
  onDeleteSelected?: () => void;
  onBulkEdit?: () => void;

  // View Controls
  onToggleView?: () => void;
  onRefresh?: () => void;

  // Filtering
  onFilterByStatus?: (status: string) => void;
  onFilterByPriority?: (priority: string) => void;
  onClearFilters?: () => void;

  // Selection Navigation
  onSelectNext?: () => void;
  onSelectPrevious?: () => void;

  // Disabled state
  enabled?: boolean;
}

export const useTaskListShortcuts = ({
  onFocusSearch,
  onToggleSelectAll,
  onEscape,
  onCreateTask,
  onDeleteSelected,
  onBulkEdit,
  onToggleView,
  onRefresh,
  onFilterByStatus,
  onFilterByPriority,
  onClearFilters,
  onSelectNext,
  onSelectPrevious,
  enabled = true,
}: TaskListShortcutsProps) => {

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in inputs or textareas
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    const { key, metaKey, ctrlKey, shiftKey, altKey } = event;
    const isModifierPressed = metaKey || ctrlKey;

    // Prevent default behavior for our shortcuts
    const preventDefault = () => {
      event.preventDefault();
      event.stopPropagation();
    };

    // Global shortcuts (work anywhere)
    switch (key) {
      case '/':
        if (!isModifierPressed) {
          preventDefault();
          onFocusSearch?.();
        }
        break;

      case 'Escape':
        preventDefault();
        onEscape?.();
        break;
    }

    // Shortcuts with modifiers
    if (isModifierPressed) {
      switch (key) {
        case 'k':
          preventDefault();
          onFocusSearch?.();
          break;

        case 'n':
          preventDefault();
          onCreateTask?.();
          break;

        case 'a':
          if (!shiftKey) {
            preventDefault();
            onToggleSelectAll?.();
          }
          break;

        case 'r':
          preventDefault();
          onRefresh?.();
          break;

        case 'v':
          preventDefault();
          onToggleView?.();
          break;

        case 'Backspace':
        case 'Delete':
          preventDefault();
          onDeleteSelected?.();
          break;

        case 'e':
          preventDefault();
          onBulkEdit?.();
          break;

        case '\\':
          preventDefault();
          onClearFilters?.();
          break;
      }
    }

    // Status filter shortcuts (Alt + number)
    if (altKey && !isModifierPressed) {
      switch (key) {
        case '1':
          preventDefault();
          onFilterByStatus?.('todo');
          break;
        case '2':
          preventDefault();
          onFilterByStatus?.('in_progress');
          break;
        case '3':
          preventDefault();
          onFilterByStatus?.('done');
          break;
        case '4':
          preventDefault();
          onFilterByStatus?.('done');
          break;
      }
    }

    // Priority filter shortcuts (Alt + Shift + letter)
    if (altKey && shiftKey && !isModifierPressed) {
      switch (key.toLowerCase()) {
        case 'l':
          preventDefault();
          onFilterByPriority?.('low');
          break;
        case 'm':
          preventDefault();
          onFilterByPriority?.('medium');
          break;
        case 'h':
          preventDefault();
          onFilterByPriority?.('high');
          break;
        case 'u':
          preventDefault();
          onFilterByPriority?.('urgent');
          break;
      }
    }

    // Navigation shortcuts (arrow keys)
    if (!isModifierPressed && !altKey && !shiftKey) {
      switch (key) {
        case 'j':
        case 'ArrowDown':
          preventDefault();
          onSelectNext?.();
          break;
        case 'k':
        case 'ArrowUp':
          preventDefault();
          onSelectPrevious?.();
          break;
      }
    }

  }, [
    enabled,
    onFocusSearch,
    onToggleSelectAll,
    onEscape,
    onCreateTask,
    onDeleteSelected,
    onBulkEdit,
    onToggleView,
    onRefresh,
    onFilterByStatus,
    onFilterByPriority,
    onClearFilters,
    onSelectNext,
    onSelectPrevious,
  ]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);

  // Return helper function to show shortcuts
  const showShortcuts = useCallback(() => {
    toast.info(`
      Keyboard Shortcuts:
      / or Cmd+K - Focus search
      Cmd+N - New task
      Cmd+A - Select all
      Cmd+R - Refresh
      Cmd+V - Toggle view mode
      Cmd+\\ - Clear filters
      Alt+1-4 - Filter by status
      Alt+Shift+L/M/H/U - Filter by priority
      J/K or ↑/↓ - Navigate selection
      Escape - Clear selection
    `, { duration: 5000 });
  }, []);

  return { showShortcuts };
};

export default useTaskListShortcuts;