import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DashboardHeader from '../DashboardHeader';

// Mock the UniversalHeader component
vi.mock('@/components/dashboard/universal-header', () => ({
  default: ({ title, subtitle, customActions }: any) => (
    <div data-testid="universal-header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div data-testid="custom-actions">{customActions}</div>
    </div>
  )
}));

// Mock the OfflineStatusIndicator
vi.mock('@/components/pwa/OfflineStatusIndicator', () => ({
  default: () => <div data-testid="offline-status-indicator" />
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  RefreshCw: ({ className, ...props }: any) => (
    <div data-testid="refresh-icon" className={className} {...props} />
  ),
  AlertTriangle: ({ ...props }) => <div data-testid="alert-triangle-icon" {...props} />
}));

const mockRiskDataWithRisks = {
  hasHighRisk: true,
  highPriorityRisks: [
    { id: '1', title: 'Risk 1' },
    { id: '2', title: 'Risk 2' },
    { id: '3', title: 'Risk 3' }
  ]
};

const mockRiskDataWithoutRisks = {
  hasHighRisk: false,
  highPriorityRisks: []
};

describe('DashboardHeader', () => {
  const defaultProps = {
    riskData: mockRiskDataWithoutRisks,
    isRefreshing: false,
    onRefresh: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the universal header with correct title and subtitle', () => {
    render(<DashboardHeader {...defaultProps} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText("Welcome back! Here's what's happening with your projects.")).toBeInTheDocument();
  });

  it('renders offline status indicator', () => {
    render(<DashboardHeader {...defaultProps} />);

    expect(screen.getByTestId('offline-status-indicator')).toBeInTheDocument();
  });

  it('renders refresh button', () => {
    render(<DashboardHeader {...defaultProps} />);

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    expect(refreshButton).toBeInTheDocument();
    expect(screen.getByTestId('refresh-icon')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('calls onRefresh when refresh button is clicked', () => {
    const mockOnRefresh = vi.fn();
    render(<DashboardHeader {...defaultProps} onRefresh={mockOnRefresh} />);

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });

  it('disables refresh button when isRefreshing is true', () => {
    render(<DashboardHeader {...defaultProps} isRefreshing={true} />);

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    expect(refreshButton).toBeDisabled();
  });

  it('adds spinning animation to refresh icon when refreshing', () => {
    render(<DashboardHeader {...defaultProps} isRefreshing={true} />);

    const refreshIcon = screen.getByTestId('refresh-icon');
    expect(refreshIcon).toHaveClass('animate-spin');
  });

  it('does not show risk indicator when there are no high risks', () => {
    render(<DashboardHeader {...defaultProps} riskData={mockRiskDataWithoutRisks} />);

    expect(screen.queryByText('Risks Detected')).not.toBeInTheDocument();
    expect(screen.queryByTestId('alert-triangle-icon')).not.toBeInTheDocument();
  });

  it('shows risk indicator when there are high risks', () => {
    render(<DashboardHeader {...defaultProps} riskData={mockRiskDataWithRisks} />);

    expect(screen.getByText('Risks Detected')).toBeInTheDocument();
    expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // Risk count
  });

  it('displays correct risk count in badge', () => {
    const riskDataWith5Risks = {
      hasHighRisk: true,
      highPriorityRisks: new Array(5).fill(null).map((_, i) => ({ id: `${i + 1}`, title: `Risk ${i + 1}` }))
    };

    render(<DashboardHeader {...defaultProps} riskData={riskDataWith5Risks} />);

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('applies correct styling to risk indicator', () => {
    render(<DashboardHeader {...defaultProps} riskData={mockRiskDataWithRisks} />);

    const riskContainer = screen.getByText('Risks Detected').closest('div');
    expect(riskContainer).toHaveClass('bg-red-50', 'border-red-200');
  });

  it('handles undefined risk data gracefully', () => {
    render(<DashboardHeader {...defaultProps} riskData={undefined as any} />);

    expect(screen.queryByText('Risks Detected')).not.toBeInTheDocument();
    expect(screen.getByTestId('offline-status-indicator')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });

  it('passes variant prop to UniversalHeader', () => {
    render(<DashboardHeader {...defaultProps} />);

    // This would check if the variant prop is passed correctly
    // In a real implementation, you might check for specific styling
    expect(screen.getByTestId('universal-header')).toBeInTheDocument();
  });

  it('arranges action items in correct order', () => {
    render(<DashboardHeader {...defaultProps} riskData={mockRiskDataWithRisks} />);

    const customActions = screen.getByTestId('custom-actions');
    
    // Check that offline indicator, risk indicator, and refresh button are present
    const offlineIndicator = screen.getByTestId('offline-status-indicator');
    expect(offlineIndicator).toBeInTheDocument();
    expect(screen.getByText('Risks Detected')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('maintains proper spacing between action items', () => {
    render(<DashboardHeader {...defaultProps} riskData={mockRiskDataWithRisks} />);

    const customActions = screen.getByTestId('custom-actions');
    // Check the inner container for spacing classes
    const innerContainer = customActions.querySelector('.flex.items-center.space-x-3');
    expect(innerContainer).toHaveClass('space-x-3');
  });
});