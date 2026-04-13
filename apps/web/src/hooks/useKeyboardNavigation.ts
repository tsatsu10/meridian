import { useCallback, useEffect, useState, useRef } from 'react';

export interface KeyboardNavigationItem {
  id: string;
  element: HTMLElement | null;
  priority: number; // Lower numbers = higher priority
  group?: string;
  ariaLabel?: string;
  onActivate?: () => void;
}

export interface KeyboardNavigationOptions {
  enableArrowKeys?: boolean;
  enableTabTrapping?: boolean;
  enableEscape?: boolean;
  circularNavigation?: boolean;
  initialFocusId?: string;
}

/**
 * Enhanced keyboard navigation hook for dashboard widgets
 * Provides arrow key navigation, tab trapping, and accessibility features
 */
export function useKeyboardNavigation(
  containerId: string,
  options: KeyboardNavigationOptions = {}
) {
  const {
    enableArrowKeys = true,
    enableTabTrapping = true,
    enableEscape = true,
    circularNavigation = true,
    initialFocusId
  } = options;

  const [items, setItems] = useState<Map<string, KeyboardNavigationItem>>(new Map());
  const [activeItemId, setActiveItemId] = useState<string | null>(initialFocusId || null);
  const [currentGroup, setCurrentGroup] = useState<string | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  // Register a navigable item
  const registerItem = useCallback((item: KeyboardNavigationItem) => {
    setItems(prev => {
      const newItems = new Map(prev);
      newItems.set(item.id, item);
      return newItems;
    });
  }, []);

  // Unregister an item
  const unregisterItem = useCallback((id: string) => {
    setItems(prev => {
      const newItems = new Map(prev);
      newItems.delete(id);
      return newItems;
    });
  }, []);

  // Get sorted items by priority
  const getSortedItems = useCallback((group?: string) => {
    const filteredItems = Array.from(items.values())
      .filter(item => item.element && (!group || item.group === group))
      .sort((a, b) => a.priority - b.priority);
    return filteredItems;
  }, [items]);

  // Move focus to specific item
  const focusItem = useCallback((id: string) => {
    const item = items.get(id);
    if (item?.element) {
      item.element.focus();
      setActiveItemId(id);

      // Announce focus change to screen readers
      if (item.ariaLabel) {
        announceToScreenReader(`Focused on ${item.ariaLabel}`);
      }
    }
  }, [items]);

  // Navigate to next/previous item
  const navigateToItem = useCallback((direction: 'next' | 'previous' | 'first' | 'last') => {
    const currentItems = getSortedItems(currentGroup || undefined);
    if (currentItems.length === 0) return;

    const currentIndex = activeItemId
      ? currentItems.findIndex(item => item.id === activeItemId)
      : -1;

    let newIndex: number;

    switch (direction) {
      case 'next':
        newIndex = currentIndex + 1;
        if (newIndex >= currentItems.length) {
          newIndex = circularNavigation ? 0 : currentItems.length - 1;
        }
        break;
      case 'previous':
        newIndex = currentIndex - 1;
        if (newIndex < 0) {
          newIndex = circularNavigation ? currentItems.length - 1 : 0;
        }
        break;
      case 'first':
        newIndex = 0;
        break;
      case 'last':
        newIndex = currentItems.length - 1;
        break;
      default:
        return;
    }

    const targetItem = currentItems[newIndex];
    if (targetItem) {
      focusItem(targetItem.id);
    }
  }, [activeItemId, currentGroup, getSortedItems, circularNavigation, focusItem]);

  // Switch between groups
  const switchGroup = useCallback((groupName: string) => {
    setCurrentGroup(groupName);
    const groupItems = getSortedItems(groupName);
    if (groupItems.length > 0) {
      focusItem(groupItems[0].id);
    }
  }, [getSortedItems, focusItem]);

  // Activate current item
  const activateCurrentItem = useCallback(() => {
    if (activeItemId) {
      const item = items.get(activeItemId);
      if (item?.onActivate) {
        item.onActivate();
        announceToScreenReader(`Activated ${item.ariaLabel || item.id}`);
      }
    }
  }, [activeItemId, items]);

  // Announce to screen readers
  const announceToScreenReader = useCallback((message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';
    announcement.textContent = message;

    document.body.appendChild(announcement);
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  // Keyboard event handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enableArrowKeys && !enableTabTrapping && !enableEscape) return;

    const { key, ctrlKey, metaKey, altKey, shiftKey } = event;

    // Arrow key navigation
    if (enableArrowKeys && !ctrlKey && !metaKey && !altKey) {
      switch (key) {
        case 'ArrowDown':
        case 'ArrowRight':
          event.preventDefault();
          navigateToItem('next');
          break;
        case 'ArrowUp':
        case 'ArrowLeft':
          event.preventDefault();
          navigateToItem('previous');
          break;
        case 'Home':
          if (ctrlKey) {
            event.preventDefault();
            navigateToItem('first');
          }
          break;
        case 'End':
          if (ctrlKey) {
            event.preventDefault();
            navigateToItem('last');
          }
          break;
      }
    }

    // Tab navigation with group switching
    if (key === 'Tab' && !ctrlKey && !metaKey) {
      if (enableTabTrapping) {
        const groups = [...new Set(Array.from(items.values()).map(item => item.group).filter(Boolean))];
        if (groups.length > 1) {
          event.preventDefault();
          const currentGroupIndex = currentGroup ? groups.indexOf(currentGroup) : -1;
          const nextGroupIndex = shiftKey
            ? (currentGroupIndex - 1 + groups.length) % groups.length
            : (currentGroupIndex + 1) % groups.length;

          if (groups[nextGroupIndex]) {
            switchGroup(groups[nextGroupIndex]);
          }
        }
      }
    }

    // Enter/Space activation
    if ((key === 'Enter' || key === ' ') && !ctrlKey && !metaKey && !altKey) {
      event.preventDefault();
      activateCurrentItem();
    }

    // Escape to exit navigation
    if (enableEscape && key === 'Escape') {
      setActiveItemId(null);
      setCurrentGroup(null);
      announceToScreenReader('Exited keyboard navigation');
    }

    // Quick group switching with number keys
    if (!isNaN(Number(key)) && altKey) {
      const groupIndex = Number(key) - 1;
      const groups = [...new Set(Array.from(items.values()).map(item => item.group).filter(Boolean))];
      if (groups[groupIndex]) {
        event.preventDefault();
        switchGroup(groups[groupIndex]);
      }
    }
  }, [
    enableArrowKeys,
    enableTabTrapping,
    enableEscape,
    navigateToItem,
    activateCurrentItem,
    switchGroup,
    items,
    currentGroup
  ]);

  // Initialize container and event listeners
  useEffect(() => {
    const container = document.getElementById(containerId);
    if (container) {
      containerRef.current = container;
      container.setAttribute('role', 'application');
      container.setAttribute('aria-label', 'Dashboard with keyboard navigation');
      container.setAttribute('tabindex', '0');
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerId, handleKeyDown]);

  // Auto-focus first item on mount if specified
  useEffect(() => {
    if (initialFocusId && items.has(initialFocusId)) {
      setTimeout(() => focusItem(initialFocusId), 100);
    }
  }, [initialFocusId, items, focusItem]);

  return {
    registerItem,
    unregisterItem,
    focusItem,
    navigateToItem,
    switchGroup,
    activateCurrentItem,
    activeItemId,
    currentGroup,
    items: Array.from(items.values()),
    announceToScreenReader
  };
}

/**
 * Hook for registering individual keyboard navigation items
 */
export function useKeyboardNavigationItem(
  id: string,
  navigation: ReturnType<typeof useKeyboardNavigation>,
  options: Partial<KeyboardNavigationItem> = {}
) {
  const elementRef = useRef<HTMLElement | null>(null);

  const {
    priority = 0,
    group,
    ariaLabel,
    onActivate
  } = options;

  useEffect(() => {
    if (elementRef.current) {
      navigation.registerItem({
        id,
        element: elementRef.current,
        priority,
        group,
        ariaLabel,
        onActivate
      });

      // Set ARIA attributes
      elementRef.current.setAttribute('tabindex', '0');
      elementRef.current.setAttribute('role', 'button');
      if (ariaLabel) {
        elementRef.current.setAttribute('aria-label', ariaLabel);
      }
    }

    return () => {
      navigation.unregisterItem(id);
    };
  }, [id, navigation, priority, group, ariaLabel, onActivate]);

  return {
    ref: elementRef,
    isActive: navigation.activeItemId === id,
    focus: () => navigation.focusItem(id),
    activate: () => navigation.activateCurrentItem()
  };
}