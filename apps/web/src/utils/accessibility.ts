/**
 * Accessibility utilities and helpers
 * WCAG 2.1 Level AA compliance utilities
 */

/**
 * Generates a unique ID for accessibility attributes
 * @param prefix - Prefix for the ID
 * @returns Unique ID string
 */
export function generateA11yId(prefix: string = 'a11y'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Keyboard event handler for Enter and Space keys
 * Makes non-interactive elements keyboard accessible
 * @param callback - Function to call when Enter or Space is pressed
 */
export function handleKeyboardActivation(
  callback: (event: React.KeyboardEvent) => void
) {
  return (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      callback(event);
    }
  };
}

/**
 * Creates ARIA attributes for a form field
 * @param fieldName - Name of the form field
 * @param options - Configuration options
 */
export function getFormFieldAria(
  fieldName: string,
  options: {
    error?: string;
    description?: string;
    required?: boolean;
  } = {}
) {
  const { error, description, required } = options;
  const errorId = error ? `${fieldName}-error` : undefined;
  const descriptionId = description ? `${fieldName}-description` : undefined;
  
  const describedBy = [errorId, descriptionId].filter(Boolean).join(' ');

  return {
    'aria-invalid': error ? 'true' : 'false',
    'aria-required': required ? 'true' : 'false',
    'aria-describedby': describedBy || undefined,
  };
}

/**
 * Screen reader only text component
 * Visually hidden but accessible to screen readers
 */
export function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return (
    <span className="sr-only absolute w-[1px] h-[1px] p-0 -m-[1px] overflow-hidden whitespace-nowrap border-0">
      {children}
    </span>
  );
}

/**
 * Announces content to screen readers
 * @param message - Message to announce
 * @param priority - 'polite' or 'assertive'
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
) {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Focus trap for modals and dialogs
 * @param containerRef - Ref to the container element
 */
export function useFocusTrap(containerRef: React.RefObject<HTMLElement>) {
  React.useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, [containerRef]);
}

/**
 * Skip navigation link component
 * Allows keyboard users to skip to main content
 */
export function SkipNavLink({ href = '#main-content' }: { href?: string }) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md"
    >
      Skip to main content
    </a>
  );
}

/**
 * Manages focus restoration after modal close
 */
export function useFocusReturn() {
  const previousFocus = React.useRef<HTMLElement | null>(null);

  const saveFocus = React.useCallback(() => {
    previousFocus.current = document.activeElement as HTMLElement;
  }, []);

  const restoreFocus = React.useCallback(() => {
    previousFocus.current?.focus();
  }, []);

  return { saveFocus, restoreFocus };
}

/**
 * ARIA label utilities
 */
export const ariaLabels = {
  // Navigation
  mainNavigation: 'Main navigation',
  userMenu: 'User menu',
  breadcrumb: 'Breadcrumb navigation',
  
  // Forms
  requiredField: 'Required field',
  optionalField: 'Optional field',
  searchForm: 'Search form',
  
  // Actions
  edit: 'Edit',
  delete: 'Delete',
  save: 'Save changes',
  cancel: 'Cancel',
  close: 'Close',
  
  // Status
  loading: 'Loading',
  success: 'Success',
  error: 'Error',
  warning: 'Warning',
  
  // Pagination
  pagination: 'Pagination navigation',
  nextPage: 'Go to next page',
  previousPage: 'Go to previous page',
  firstPage: 'Go to first page',
  lastPage: 'Go to last page',
  
  // Profile specific
  profilePicture: 'Profile picture',
  editProfile: 'Edit profile',
  addExperience: 'Add work experience',
  addEducation: 'Add education',
  addSkill: 'Add skill',
  connectionsList: 'List of connections',
};

import React from 'react';

export default {
  generateA11yId,
  handleKeyboardActivation,
  getFormFieldAria,
  VisuallyHidden,
  announceToScreenReader,
  useFocusTrap,
  useFocusReturn,
  SkipNavLink,
  ariaLabels,
};

