/**
 * Error Boundary Tests
 * 
 * Tests error boundary functionality:
 * - Error catching
 * - Error display
 * - Error recovery
 * - Fallback UI
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TestWrapper } from '../../test-utils/test-wrapper';
import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div role="alert">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
}

describe('Error Boundary', () => {
  it('should render children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('should catch errors and show fallback', () => {
    // Suppress console.error for this test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
      { wrapper: TestWrapper }
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    spy.mockRestore();
  });

  it('should display error message', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText('Test error')).toBeInTheDocument();

    spy.mockRestore();
  });

  it('should render custom fallback', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const CustomFallback = <div>Custom error UI</div>;

    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText('Custom error UI')).toBeInTheDocument();

    spy.mockRestore();
  });
});

