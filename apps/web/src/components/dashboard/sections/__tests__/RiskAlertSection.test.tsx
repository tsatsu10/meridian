import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RiskAlertSection from '../RiskAlertSection';

// Mock framer-motion
vi.mock('@/components/magicui/blur-fade', () => ({
  BlurFade: ({ children }: any) => <div data-testid="blur-fade">{children}</div>
}));

// Create test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

const mockRiskDataWithAlerts = {
  data: {
    alerts: [
      {
        id: '1',
        title: 'High CPU Usage',
        description: 'CPU usage is above 90% threshold',
        severity: 'high',
        affectedTasks: ['task1', 'task2', 'task3']
      },
      {
        id: '2',
        title: 'Memory Leak Detected',
        description: 'Potential memory leak in user service',
        severity: 'critical',
        affectedTasks: ['task4', 'task5']
      },
      {
        id: '3',
        title: 'Database Connection Issues',
        description: 'Intermittent database connection failures',
        severity: 'medium',
        affectedTasks: ['task6']
      },
      {
        id: '4',
        title: 'API Rate Limiting',
        description: 'API calls approaching rate limit',
        severity: 'low',
        affectedTasks: ['task7', 'task8']
      }
    ],
    summary: {
      totalRisks: 4
    }
  }
};

const mockRiskDataWithoutAlerts = {
  data: {
    alerts: [],
    summary: {
      totalRisks: 0
    }
  }
};

const mockRiskDataNull = {
  data: null
};

describe('RiskAlertSection', () => {
  it('renders nothing when there are no alerts', () => {
    const Wrapper = createWrapper();
    const { container } = render(<RiskAlertSection riskData={mockRiskDataWithoutAlerts} />, { wrapper: Wrapper });
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when risk data is null', () => {
    const Wrapper = createWrapper();
    const { container } = render(<RiskAlertSection riskData={mockRiskDataNull} />, { wrapper: Wrapper });
    expect(container.firstChild).toBeNull();
  });

  it('renders the section when alerts are present', () => {
    const Wrapper = createWrapper();
    render(<RiskAlertSection riskData={mockRiskDataWithAlerts} />, { wrapper: Wrapper });

    expect(screen.getByText('Risk Detection System')).toBeInTheDocument();
    expect(screen.getAllByTestId('mock-icon').length).toBeGreaterThan(0);
    expect(screen.getByText('4 risks')).toBeInTheDocument();
  });

  it('displays only the first 3 alerts when more than 3 exist', () => {
    const Wrapper = createWrapper();
    render(<RiskAlertSection riskData={mockRiskDataWithAlerts} />, { wrapper: Wrapper });

    // Should show first 3 alerts
    expect(screen.getByText('High CPU Usage')).toBeInTheDocument();
    expect(screen.getByText('Memory Leak Detected')).toBeInTheDocument();
    expect(screen.getByText('Database Connection Issues')).toBeInTheDocument();

    // Should not show the 4th alert
    expect(screen.queryByText('API Rate Limiting')).not.toBeInTheDocument();
  });

  it('displays correct alert information', () => {
    const Wrapper = createWrapper();
    render(<RiskAlertSection riskData={mockRiskDataWithAlerts} />, { wrapper: Wrapper });

    // Check first alert details
    expect(screen.getByText('High CPU Usage')).toBeInTheDocument();
    expect(screen.getByText('CPU usage is above 90% threshold')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('3 tasks affected')).toBeInTheDocument();

    // Check shield icons are present
    const shieldIcons = screen.getAllByTestId('mock-icon');
    expect(shieldIcons.length).toBeGreaterThan(0); // At least one icon should be present
  });

  it('displays severity badges correctly', () => {
    const Wrapper = createWrapper();
    render(<RiskAlertSection riskData={mockRiskDataWithAlerts} />, { wrapper: Wrapper });

    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('critical')).toBeInTheDocument();
    expect(screen.getByText('medium')).toBeInTheDocument();
  });

  it('displays affected tasks count correctly', () => {
    const Wrapper = createWrapper();
    render(<RiskAlertSection riskData={mockRiskDataWithAlerts} />, { wrapper: Wrapper });

    expect(screen.getByText('3 tasks affected')).toBeInTheDocument();
    expect(screen.getByText('2 tasks affected')).toBeInTheDocument();
    expect(screen.getByText('1 tasks affected')).toBeInTheDocument();
  });

  it('applies correct styling and classes', () => {
    const Wrapper = createWrapper();
    render(<RiskAlertSection riskData={mockRiskDataWithAlerts} />, { wrapper: Wrapper });

    // Check for blur fade wrapper
    expect(screen.getByTestId('blur-fade')).toBeInTheDocument();

    // Check for card structure
    const cardElement = screen.getByText('Risk Detection System').closest('[class*="border-red-200"]');
    expect(cardElement).toBeInTheDocument();
  });

  it('handles edge case with single alert', () => {
    const singleAlertData = {
      data: {
        alerts: [mockRiskDataWithAlerts.data.alerts[0]],
        summary: { totalRisks: 1 }
      }
    };

    const Wrapper = createWrapper();
    render(<RiskAlertSection riskData={singleAlertData} />, { wrapper: Wrapper });

    expect(screen.getByText('1 risks')).toBeInTheDocument();
    expect(screen.getByText('High CPU Usage')).toBeInTheDocument();
    expect(screen.getAllByTestId('mock-icon').length).toBeGreaterThan(0);
  });

  it('handles alerts with empty affected tasks array', () => {
    const alertWithNoTasks = {
      data: {
        alerts: [{
          id: '1',
          title: 'Test Alert',
          description: 'Test description',
          severity: 'low',
          affectedTasks: []
        }],
        summary: { totalRisks: 1 }
      }
    };

    const Wrapper = createWrapper();
    render(<RiskAlertSection riskData={alertWithNoTasks} />, { wrapper: Wrapper });

    expect(screen.getByText('0 tasks affected')).toBeInTheDocument();
  });

  it('generates unique keys for alerts correctly', () => {
    const Wrapper = createWrapper();
    render(<RiskAlertSection riskData={mockRiskDataWithAlerts} />, { wrapper: Wrapper });

    // This ensures no React key warnings by checking that all alerts render
    const alertContainers = screen.getAllByText(/tasks affected/).map(el =>
      el.closest('[class*="flex items-start gap-3 p-3"]')
    );

    expect(alertContainers).toHaveLength(3);
    alertContainers.forEach(container => {
      expect(container).toBeInTheDocument();
    });
  });
});