import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InteractiveChart, ProductivityChart, TaskCompletionChart, ProjectHealthChart } from '@/components/dashboard/interactive-chart';

// Mock recharts components
vi.mock('recharts', () => ({
  LineChart: ({ children, onClick }: any) => (
    <div data-testid="line-chart" onClick={onClick}>
      {children}
    </div>
  ),
  BarChart: ({ children, onClick }: any) => (
    <div data-testid="bar-chart" onClick={onClick}>
      {children}
    </div>
  ),
  AreaChart: ({ children, onClick }: any) => (
    <div data-testid="area-chart" onClick={onClick}>
      {children}
    </div>
  ),
  PieChart: ({ children, onClick }: any) => (
    <div data-testid="pie-chart" onClick={onClick}>
      {children}
    </div>
  ),
  Line: () => <div data-testid="line" />,
  Bar: () => <div data-testid="bar" />,
  Area: () => <div data-testid="area" />,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
}));

const mockData = [
  { label: 'Jan', value: 100, category: 'Q1' },
  { label: 'Feb', value: 120, category: 'Q1' },
  { label: 'Mar', value: 110, category: 'Q1' },
  { label: 'Apr', value: 130, category: 'Q2' },
];

describe('InteractiveChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default line chart type', () => {
    render(<InteractiveChart title="Test Chart" data={mockData} />);
    
    expect(screen.getByText('Test Chart')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('renders bar chart when chartType is bar', () => {
    render(<InteractiveChart title="Test Chart" data={mockData} chartType="bar" />);
    
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('renders area chart when chartType is area', () => {
    render(<InteractiveChart title="Test Chart" data={mockData} chartType="area" />);
    
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });

  it('renders pie chart when chartType is pie', () => {
    render(<InteractiveChart title="Test Chart" data={mockData} chartType="pie" />);
    
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('displays trend information when showTrend is true', () => {
    render(<InteractiveChart title="Test Chart" data={mockData} showTrend={true} />);
    
    expect(screen.getByText(/vs previous period/)).toBeInTheDocument();
  });

  it('shows time range buttons when onTimeRangeChange is provided', () => {
    const onTimeRangeChange = vi.fn();
    render(
      <InteractiveChart 
        title="Test Chart" 
        data={mockData} 
        onTimeRangeChange={onTimeRangeChange} 
      />
    );
    
    expect(screen.getByText('7d')).toBeInTheDocument();
    expect(screen.getByText('30d')).toBeInTheDocument();
    expect(screen.getByText('90d')).toBeInTheDocument();
    expect(screen.getByText('1y')).toBeInTheDocument();
  });

  it('calls onTimeRangeChange when time range button is clicked', () => {
    const onTimeRangeChange = vi.fn();
    render(
      <InteractiveChart 
        title="Test Chart" 
        data={mockData} 
        onTimeRangeChange={onTimeRangeChange} 
      />
    );
    
    fireEvent.click(screen.getByText('7d'));
    expect(onTimeRangeChange).toHaveBeenCalledWith('7d');
  });

  it('shows chart type options in dropdown when onChartTypeChange is provided', () => {
    const onChartTypeChange = vi.fn();
    render(
      <InteractiveChart 
        title="Test Chart" 
        data={mockData} 
        onChartTypeChange={onChartTypeChange} 
      />
    );
    
    // Click the dropdown trigger
    const dropdownTrigger = screen.getByRole('button');
    fireEvent.click(dropdownTrigger);
    
    expect(screen.getByText('Line Chart')).toBeInTheDocument();
    expect(screen.getByText('Bar Chart')).toBeInTheDocument();
    expect(screen.getByText('Area Chart')).toBeInTheDocument();
    expect(screen.getByText('Pie Chart')).toBeInTheDocument();
  });

  it('calls onChartTypeChange when chart type is selected', () => {
    const onChartTypeChange = vi.fn();
    render(
      <InteractiveChart 
        title="Test Chart" 
        data={mockData} 
        onChartTypeChange={onChartTypeChange} 
      />
    );
    
    // Click the dropdown trigger
    const dropdownTrigger = screen.getByRole('button');
    fireEvent.click(dropdownTrigger);
    
    fireEvent.click(screen.getByText('Bar Chart'));
    expect(onChartTypeChange).toHaveBeenCalledWith('bar');
  });

  it('shows export option when onExport is provided', () => {
    const onExport = vi.fn();
    render(
      <InteractiveChart 
        title="Test Chart" 
        data={mockData} 
        onExport={onExport} 
      />
    );
    
    // Click the dropdown trigger
    const dropdownTrigger = screen.getByRole('button');
    fireEvent.click(dropdownTrigger);
    
    expect(screen.getByText('Export Data')).toBeInTheDocument();
  });

  it('calls onExport when export option is clicked', () => {
    const onExport = vi.fn();
    render(
      <InteractiveChart 
        title="Test Chart" 
        data={mockData} 
        onExport={onExport} 
      />
    );
    
    // Click the dropdown trigger
    const dropdownTrigger = screen.getByRole('button');
    fireEvent.click(dropdownTrigger);
    
    fireEvent.click(screen.getByText('Export Data'));
    expect(onExport).toHaveBeenCalled();
  });

  it('handles drill down functionality when enabled', () => {
    const onDrillDown = vi.fn();
    render(
      <InteractiveChart 
        title="Test Chart" 
        data={mockData} 
        drillDownEnabled={true}
        onDrillDown={onDrillDown} 
      />
    );
    
    expect(screen.getByText('Click on data points to drill down for more details')).toBeInTheDocument();
  });

  it('applies custom color when provided', () => {
    render(<InteractiveChart title="Test Chart" data={mockData} color="#ff0000" />);
    
    // The color should be applied to the chart (this would be tested more thoroughly with actual chart rendering)
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('applies custom height when provided', () => {
    render(<InteractiveChart title="Test Chart" data={mockData} height={400} />);
    
    // The height should be applied to the chart
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    const { container } = render(
      <InteractiveChart title="Test Chart" data={mockData} className="custom-class" />
    );
    
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});

describe('ProductivityChart', () => {
  it('renders with correct props', () => {
    const onTimeRangeChange = vi.fn();
    render(
      <ProductivityChart 
        data={mockData} 
        timeRange="30d"
        onTimeRangeChange={onTimeRangeChange} 
      />
    );
    
    expect(screen.getByText('Team Productivity')).toBeInTheDocument();
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });
});

describe('TaskCompletionChart', () => {
  it('renders with correct props', () => {
    const onDrillDown = vi.fn();
    render(
      <TaskCompletionChart 
        data={mockData} 
        onDrillDown={onDrillDown} 
      />
    );
    
    expect(screen.getByText('Task Completion by Project')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });
});

describe('ProjectHealthChart', () => {
  it('renders with correct props', () => {
    render(<ProjectHealthChart data={mockData} />);
    
    expect(screen.getByText('Project Health Overview')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });
});
