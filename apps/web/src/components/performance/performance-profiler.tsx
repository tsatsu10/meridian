import React, { Profiler, ProfilerOnRenderCallback } from 'react';
import { usePerformanceMonitor } from '@/services/performance-monitor';

interface PerformanceProfilerProps {
  children: React.ReactNode;
  id: string;
  onRenderThreshold?: number; // Only log renders above this threshold (ms)
}

export const PerformanceProfiler: React.FC<PerformanceProfilerProps> = ({
  children,
  id,
  onRenderThreshold = 16, // Default: 16ms (60fps)
}) => {
  const { recordMetric } = usePerformanceMonitor();

  const onRenderCallback: ProfilerOnRenderCallback = (
    profilerId,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime
  ) => {
    // Only record significant renders
    if (actualDuration >= onRenderThreshold) {
      recordMetric({
        name: 'react_profiler_render',
        value: actualDuration,
        metadata: {
          id: profilerId,
          phase,
          baseDuration,
          startTime,
          commitTime,
          isSlowRender: actualDuration > 16,
        },
      });

      // Development warnings for slow renders
      if (import.meta.env.MODE === 'development' && actualDuration > 50) {
        console.warn(
          `🐌 Slow render detected in ${profilerId}: ${actualDuration.toFixed(2)}ms`,
          { phase, baseDuration, actualDuration }
        );
      }
    }
  };

  return (
    <Profiler id={id} onRender={onRenderCallback}>
      {children}
    </Profiler>
  );
};