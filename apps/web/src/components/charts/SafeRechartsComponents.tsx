/**
 * Safe Recharts Components - Handles React 18.3+ compatibility
 * This approach avoids global React modifications and provides compatibility wrappers
 */

import React from 'react';
import {
  LineChart as OriginalLineChart,
  Line as OriginalLine,
  XAxis as OriginalXAxis,
  YAxis as OriginalYAxis,
  CartesianGrid as OriginalCartesianGrid,
  Tooltip as OriginalTooltip,
  Legend as OriginalLegend,
  ResponsiveContainer as OriginalResponsiveContainer,
  AreaChart as OriginalAreaChart,
  Area as OriginalArea,
  BarChart as OriginalBarChart,
  Bar as OriginalBar,
  PieChart as OriginalPieChart,
  Pie as OriginalPie,
  Cell as OriginalCell,
} from 'recharts';

// Error boundary for chart components
interface ChartErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ChartErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ChartErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ChartErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Chart rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-center">
            <div className="text-gray-400 mb-2 text-2xl">📊</div>
            <div className="text-sm text-gray-500 mb-1">Chart temporarily unavailable</div>
            <div className="text-xs text-gray-400">
              {this.state.error?.message || 'Compatibility issue detected'}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC to wrap Recharts components with error boundary
function withChartErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  displayName: string
) {
  const WrappedComponent = React.forwardRef<any, T>((props, ref) => {
    return (
      <ChartErrorBoundary>
        <Component {...props} ref={ref} />
      </ChartErrorBoundary>
    );
  });

  WrappedComponent.displayName = `Safe${displayName}`;
  return WrappedComponent;
}

// Safe wrapper components
export const LineChart = withChartErrorBoundary(OriginalLineChart, 'LineChart');
export const Line = withChartErrorBoundary(OriginalLine, 'Line');
export const XAxis = withChartErrorBoundary(OriginalXAxis, 'XAxis');
export const YAxis = withChartErrorBoundary(OriginalYAxis, 'YAxis');
export const CartesianGrid = withChartErrorBoundary(OriginalCartesianGrid, 'CartesianGrid');
export const Tooltip = withChartErrorBoundary(OriginalTooltip, 'Tooltip');
export const Legend = withChartErrorBoundary(OriginalLegend, 'Legend');
export const ResponsiveContainer = withChartErrorBoundary(OriginalResponsiveContainer, 'ResponsiveContainer');
export const AreaChart = withChartErrorBoundary(OriginalAreaChart, 'AreaChart');
export const Area = withChartErrorBoundary(OriginalArea, 'Area');
export const BarChart = withChartErrorBoundary(OriginalBarChart, 'BarChart');
export const Bar = withChartErrorBoundary(OriginalBar, 'Bar');
export const PieChart = withChartErrorBoundary(OriginalPieChart, 'PieChart');
export const Pie = withChartErrorBoundary(OriginalPie, 'Pie');
export const Cell = withChartErrorBoundary(OriginalCell, 'Cell');

// Export the error boundary for custom use cases
export { ChartErrorBoundary };

// Convenience wrapper for charts
export interface SafeChartProps {
  children: React.ReactNode;
  width?: number | string;
  height?: number | string;
  fallback?: React.ReactNode;
}

export const SafeChart: React.FC<SafeChartProps> = ({
  children,
  width = '100%',
  height = 400,
  fallback
}) => {
  return (
    <ChartErrorBoundary fallback={fallback}>
      <ResponsiveContainer width={width} height={height}>
        {children}
      </ResponsiveContainer>
    </ChartErrorBoundary>
  );
};