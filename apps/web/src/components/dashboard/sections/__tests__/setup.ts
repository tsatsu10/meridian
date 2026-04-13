// Test setup for dashboard components
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Mock the cn utility function
vi.mock('@/lib/cn', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}));

// Mock framer-motion globally
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>
  },
  AnimatePresence: ({ children }: any) => children
}));

// Mock React Router for dashboard tests
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>{children}</a>
  ),
  useRouter: () => ({
    navigate: vi.fn()
  })
}));

// Mock Zustand stores
vi.mock('@/store/workspace', () => ({
  default: () => ({
    workspace: {
      id: 'test-workspace-id',
      name: 'Test Workspace'
    }
  })
}));

// Mock permission hooks
vi.mock('@/lib/permissions', () => ({
  useRBACAuth: () => ({
    user: { id: 'test-user', name: 'Test User', email: 'test@example.com' },
    role: 'admin',
    hasPermission: vi.fn(() => true),
    isLoading: false
  })
}));

// Mock UI components that might not be necessary for unit tests
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className, ...props }: any) => (
    <div className={className} {...props}>{children}</div>
  ),
  CardHeader: ({ children, className, ...props }: any) => (
    <div className={className} {...props}>{children}</div>
  ),
  CardTitle: ({ children, className, ...props }: any) => (
    <h3 className={className} {...props}>{children}</h3>
  ),
  CardContent: ({ children, className, ...props }: any) => (
    <div className={className} {...props}>{children}</div>
  )
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className, ...props }: any) => (
    <span className={`badge ${variant} ${className}`} {...props}>{children}</span>
  )
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, variant, size, disabled, onClick, className, ...props }: any) => (
    <button
      className={`button ${variant} ${size} ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  )
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className, ...props }: any) => (
    <div className={`skeleton ${className}`} {...props} />
  )
}));

// Clean up after each test
afterEach(() => {
  cleanup();
});