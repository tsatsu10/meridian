/**
 * Progress Indicator Component
 * Visual progress bars with real-time updates
 * Phase 2.3 - Live Metrics & Real-Time Analytics
 */

import React from 'react';

interface ProgressIndicatorProps {
  label: string;
  value: number; // 0-100
  total?: number;
  completed?: number;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  animated?: boolean;
  className?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  label,
  value,
  total,
  completed,
  color = 'blue',
  size = 'md',
  showPercentage = true,
  animated = true,
  className = '',
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));

  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    yellow: 'bg-yellow-500',
    red: 'bg-red-600',
    purple: 'bg-purple-600',
  };

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div className="flex items-center space-x-2">
          {total !== undefined && completed !== undefined && (
            <span className="text-xs text-gray-500">
              {completed}/{total}
            </span>
          )}
          {showPercentage && (
            <span className="text-sm font-semibold text-gray-900">{clampedValue}%</span>
          )}
        </div>
      </div>
      <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]}`}>
        <div
          className={`${colorClasses[color]} ${sizeClasses[size]} rounded-full ${
            animated ? 'transition-all duration-500' : ''
          }`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
};

/**
 * Multi-Progress Indicator
 * Shows multiple stacked progress segments
 */

interface ProgressSegment {
  label: string;
  value: number;
  color: string;
}

interface MultiProgressIndicatorProps {
  segments: ProgressSegment[];
  total: number;
  height?: string;
  showLegend?: boolean;
  className?: string;
}

export const MultiProgressIndicator: React.FC<MultiProgressIndicatorProps> = ({
  segments,
  total,
  height = 'h-4',
  showLegend = true,
  className = '',
}) => {
  return (
    <div className={className}>
      {/* Progress Bar */}
      <div className={`w-full bg-gray-200 rounded-full ${height} flex overflow-hidden`}>
        {segments.map((segment, index) => {
          const percentage = (segment.value / total) * 100;
          return (
            percentage > 0 && (
              <div
                key={index}
                className={`${segment.color} transition-all duration-500`}
                style={{ width: `${percentage}%` }}
                title={`${segment.label}: ${segment.value} (${percentage.toFixed(1)}%)`}
              />
            )
          );
        })}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="mt-2 flex flex-wrap gap-3">
          {segments.map((segment, index) => (
            <div key={index} className="flex items-center space-x-1">
              <div className={`w-3 h-3 rounded-full ${segment.color}`} />
              <span className="text-xs text-gray-600">
                {segment.label}: {segment.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Circular Progress Indicator
 * Circular/radial progress visualization
 */

interface CircularProgressProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showValue?: boolean;
  className?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  size = 120,
  strokeWidth = 8,
  color = '#3B82F6',
  backgroundColor = '#E5E7EB',
  showValue = true,
  className = '',
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedValue / 100) * circumference;

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      {showValue && (
        <div className="absolute text-center">
          <span className="text-2xl font-bold text-gray-900">{clampedValue}%</span>
        </div>
      )}
    </div>
  );
};

export default ProgressIndicator;

