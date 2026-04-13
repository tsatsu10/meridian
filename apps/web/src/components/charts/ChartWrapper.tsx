import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  SafeChart,
} from './SafeRechartsComponents';
import {
  ScatterChart,
  Scatter,
  ReferenceLine,
  ReferenceArea,
  LabelList,
  ComposedChart
} from 'recharts';

// Re-export recharts components with proper types
export {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ReferenceLine,
  ReferenceArea,
  LabelList,
  ComposedChart
};

// Wrapper components with proper types
export interface ChartWrapperProps {
  children: React.ReactNode;
  width?: number | string;
  height?: number | string;
}

export const ChartWrapper: React.FC<ChartWrapperProps> = ({
  children,
  width = '100%',
  height = 400
}) => {
  return (
    <SafeChart width={width} height={height}>
      {children}
    </SafeChart>
  );
};