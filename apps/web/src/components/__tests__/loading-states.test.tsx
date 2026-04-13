/**
 * Loading States Tests
 * 
 * Comprehensive tests for loading UX:
 * - Skeleton loaders
 * - Spinners
 * - Progress indicators
 * - Loading transitions
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TestWrapper } from '../../test-utils/test-wrapper';
import React from 'react';

interface LoadingSkeletonProps {
  count?: number;
  type?: 'text' | 'card' | 'list';
}

function LoadingSkeleton({ count = 1, type = 'text' }: LoadingSkeletonProps) {
  return (
    <div className="skeleton-loader" data-testid="skeleton-loader">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={`skeleton-${type}`} data-testid={`skeleton-item-${index}`}>
          Loading...
        </div>
      ))}
    </div>
  );
}

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
}

function LoadingSpinner({ size = 'medium', message }: LoadingSpinnerProps) {
  return (
    <div className={`spinner spinner-${size}`} role="status" aria-live="polite">
      <div className="spinner-icon" />
      {message && <p>{message}</p>}
    </div>
  );
}

interface ProgressBarProps {
  progress: number;
  total: number;
}

function ProgressBar({ progress, total }: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (progress / total) * 100));

  return (
    <div role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress-bar-fill" style={{ width: `${percentage}%` }} />
      <span>{Math.round(percentage)}%</span>
    </div>
  );
}

describe('Loading States', () => {
  describe('LoadingSkeleton', () => {
    it('should render skeleton loader', () => {
      render(<LoadingSkeleton />, { wrapper: TestWrapper });

      expect(screen.getByTestId('skeleton-loader')).toBeInTheDocument();
    });

    it('should render multiple skeleton items', () => {
      render(<LoadingSkeleton count={3} />, { wrapper: TestWrapper });

      expect(screen.getByTestId('skeleton-item-0')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-item-2')).toBeInTheDocument();
    });

    it('should render text skeleton', () => {
      render(<LoadingSkeleton type="text" />, { wrapper: TestWrapper });

      expect(screen.getByTestId('skeleton-item-0')).toHaveClass('skeleton-text');
    });

    it('should render card skeleton', () => {
      render(<LoadingSkeleton type="card" />, { wrapper: TestWrapper });

      expect(screen.getByTestId('skeleton-item-0')).toHaveClass('skeleton-card');
    });

    it('should render list skeleton', () => {
      render(<LoadingSkeleton type="list" />, { wrapper: TestWrapper });

      expect(screen.getByTestId('skeleton-item-0')).toHaveClass('skeleton-list');
    });
  });

  describe('LoadingSpinner', () => {
    it('should render spinner', () => {
      render(<LoadingSpinner />, { wrapper: TestWrapper });

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should render small spinner', () => {
      render(<LoadingSpinner size="small" />, { wrapper: TestWrapper });

      expect(screen.getByRole('status')).toHaveClass('spinner-small');
    });

    it('should render large spinner', () => {
      render(<LoadingSpinner size="large" />, { wrapper: TestWrapper });

      expect(screen.getByRole('status')).toHaveClass('spinner-large');
    });

    it('should display loading message', () => {
      render(<LoadingSpinner message="Loading data..." />, { wrapper: TestWrapper });

      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });

    it('should be accessible', () => {
      render(<LoadingSpinner />, { wrapper: TestWrapper });

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('ProgressBar', () => {
    it('should render progress bar', () => {
      render(<ProgressBar progress={50} total={100} />, { wrapper: TestWrapper });

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should show correct percentage', () => {
      render(<ProgressBar progress={75} total={100} />, { wrapper: TestWrapper });

      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should calculate percentage correctly', () => {
      render(<ProgressBar progress={25} total={100} />, { wrapper: TestWrapper });

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '25');
    });

    it('should cap at 100%', () => {
      render(<ProgressBar progress={150} total={100} />, { wrapper: TestWrapper });

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '100');
    });

    it('should handle zero progress', () => {
      render(<ProgressBar progress={0} total={100} />, { wrapper: TestWrapper });

      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should be accessible', () => {
      render(<ProgressBar progress={60} total={100} />, { wrapper: TestWrapper });

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    });
  });
});

