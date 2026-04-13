import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorBoundary, withErrorBoundary } from '@/components/error-boundary/error-boundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Test component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Test component for HOC
const TestComponent = () => <div>Test Component</div>;

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error for tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when there is no error', () => {
    render(
      <TestWrapper>
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      </TestWrapper>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('renders error UI when there is an error', () => {
    render(
      <TestWrapper>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      </TestWrapper>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('We\'re sorry, but something unexpected happened. Our team has been notified.')).toBeInTheDocument();
  });

  it('shows error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <TestWrapper>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      </TestWrapper>
    );

    expect(screen.getByText('Error Details (Development)')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('hides error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <TestWrapper>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      </TestWrapper>
    );

    expect(screen.queryByText('Error Details (Development)')).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn();

    render(
      <TestWrapper>
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      </TestWrapper>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('renders custom fallback UI when provided', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <TestWrapper>
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      </TestWrapper>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('resets error boundary when resetOnPropsChange is true', () => {
    const { rerender } = render(
      <TestWrapper>
        <ErrorBoundary resetOnPropsChange={true} resetKeys={['key1']}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      </TestWrapper>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Change resetKeys to trigger reset
    rerender(
      <TestWrapper>
        <ErrorBoundary resetOnPropsChange={true} resetKeys={['key2']}>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      </TestWrapper>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });
});

describe('withErrorBoundary HOC', () => {
  it('wraps component with error boundary', () => {
    const WrappedComponent = withErrorBoundary(TestComponent);
    
    render(
      <TestWrapper>
        <WrappedComponent />
      </TestWrapper>
    );

    expect(screen.getByText('Test Component')).toBeInTheDocument();
  });

  it('applies custom error boundary props', () => {
    const customFallback = <div>Custom HOC fallback</div>;
    
    // Create a component that throws
    const ThrowingComponent = () => {
      throw new Error('HOC test error');
    };
    
    const WrappedComponent = withErrorBoundary(ThrowingComponent, {
      fallback: customFallback,
    });

    render(
      <TestWrapper>
        <WrappedComponent />
      </TestWrapper>
    );

    // The HOC should render the custom fallback when an error occurs
    expect(screen.getByText('Custom HOC fallback')).toBeInTheDocument();
  });
});

describe('Specialized Error Boundaries', () => {
  it('renders dashboard error boundary fallback', () => {
    const DashboardErrorBoundary = withErrorBoundary(
      ({ children }: { children: React.ReactNode }) => <>{children}</>,
      {
        fallback: (
          <div>
            <h3>Dashboard Error</h3>
            <p>There was an error loading the dashboard.</p>
          </div>
        ),
      }
    );

    render(
      <TestWrapper>
        <DashboardErrorBoundary>
          <ThrowError shouldThrow={true} />
        </DashboardErrorBoundary>
      </TestWrapper>
    );

    expect(screen.getByText('Dashboard Error')).toBeInTheDocument();
    expect(screen.getByText('There was an error loading the dashboard.')).toBeInTheDocument();
  });

  it('renders chart error boundary fallback', () => {
    const ChartErrorBoundary = withErrorBoundary(
      ({ children }: { children: React.ReactNode }) => <>{children}</>,
      {
        fallback: (
          <div>
            <p>Chart failed to load</p>
          </div>
        ),
      }
    );

    render(
      <TestWrapper>
        <ChartErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ChartErrorBoundary>
      </TestWrapper>
    );

    expect(screen.getByText('Chart failed to load')).toBeInTheDocument();
  });

  it('renders form error boundary fallback', () => {
    const FormErrorBoundary = withErrorBoundary(
      ({ children }: { children: React.ReactNode }) => <>{children}</>,
      {
        fallback: (
          <div>
            <span>Form Error</span>
            <p>There was an error with the form.</p>
          </div>
        ),
      }
    );

    render(
      <TestWrapper>
        <FormErrorBoundary>
          <ThrowError shouldThrow={true} />
        </FormErrorBoundary>
      </TestWrapper>
    );

    expect(screen.getByText('Form Error')).toBeInTheDocument();
    expect(screen.getByText('There was an error with the form.')).toBeInTheDocument();
  });
});
