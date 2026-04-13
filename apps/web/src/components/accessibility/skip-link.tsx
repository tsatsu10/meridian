/**
 * Skip Link Component - Phase 4.5: Accessibility
 * Provides keyboard users a way to skip navigation and jump to main content
 * Only visible when focused via keyboard
 */

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="skip-link sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-1/2 focus:-translate-x-1/2 focus:z-[9999] focus:bg-primary focus:text-primary-foreground focus:px-6 focus:py-3 focus:rounded-lg focus:font-semibold focus:shadow-lg focus:outline-none focus:ring-4 focus:ring-primary/30"
    >
      Skip to main content
    </a>
  );
}

