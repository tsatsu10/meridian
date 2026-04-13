import { useEffect, useCallback, useState } from 'react';

export interface ChartDataPoint {
  label: string;
  value: number | string;
  percentage?: number;
  category?: string;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
}

export interface ChartAccessibilityOptions {
  title: string;
  description?: string;
  chartType: 'bar' | 'line' | 'pie' | 'area' | 'scatter';
  dataPoints: ChartDataPoint[];
  enableSonification?: boolean;
  enableTableView?: boolean;
  enableDataExport?: boolean;
}

/**
 * Hook for enhancing data visualizations with screen reader support
 * Provides text descriptions, data tables, and sonification for charts
 */
export function useScreenReaderSupport(options: ChartAccessibilityOptions) {
  const {
    title,
    description,
    chartType,
    dataPoints,
    enableSonification = false,
    enableTableView = true,
    enableDataExport = true
  } = options;

  const [isTableViewActive, setIsTableViewActive] = useState(false);
  const [currentDataIndex, setCurrentDataIndex] = useState(0);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  // Initialize audio context for sonification
  useEffect(() => {
    if (enableSonification && typeof window !== 'undefined' && window.AudioContext) {
      const ctx = new AudioContext();
      setAudioContext(ctx);

      return () => {
        ctx.close();
      };
    }
  }, [enableSonification]);

  // Generate comprehensive chart description
  const generateChartDescription = useCallback(() => {
    if (dataPoints.length === 0) {
      return `${title} chart is empty.`;
    }

    const totalValue = dataPoints.reduce((sum, point) => {
      const val = typeof point.value === 'number' ? point.value : parseFloat(point.value.toString()) || 0;
      return sum + val;
    }, 0);

    const highestPoint = dataPoints.reduce((max, point) => {
      const val = typeof point.value === 'number' ? point.value : parseFloat(point.value.toString()) || 0;
      const maxVal = typeof max.value === 'number' ? max.value : parseFloat(max.value.toString()) || 0;
      return val > maxVal ? point : max;
    });

    const lowestPoint = dataPoints.reduce((min, point) => {
      const val = typeof point.value === 'number' ? point.value : parseFloat(point.value.toString()) || 0;
      const minVal = typeof min.value === 'number' ? min.value : parseFloat(min.value.toString()) || 0;
      return val < minVal ? point : min;
    });

    let chartDescription = `${title}. `;

    if (description) {
      chartDescription += `${description}. `;
    }

    chartDescription += `This is a ${chartType} chart with ${dataPoints.length} data points. `;

    if (chartType === 'pie') {
      chartDescription += `Total value: ${totalValue}. `;
      chartDescription += `Largest segment: ${highestPoint.label} with ${highestPoint.value}`;
      if (highestPoint.percentage) {
        chartDescription += ` (${highestPoint.percentage}%)`;
      }
      chartDescription += `. `;
    } else {
      chartDescription += `Values range from ${lowestPoint.value} (${lowestPoint.label}) to ${highestPoint.value} (${highestPoint.label}). `;
    }

    // Add trend information
    const trendingUp = dataPoints.filter(p => p.trend === 'up').length;
    const trendingDown = dataPoints.filter(p => p.trend === 'down').length;

    if (trendingUp > 0 || trendingDown > 0) {
      chartDescription += `Trends: ${trendingUp} increasing, ${trendingDown} decreasing. `;
    }

    return chartDescription;
  }, [title, description, chartType, dataPoints]);

  // Generate data table for screen readers
  const generateDataTable = useCallback(() => {
    if (dataPoints.length === 0) return null;

    const headers = ['Label', 'Value'];
    if (dataPoints.some(p => p.percentage !== undefined)) {
      headers.push('Percentage');
    }
    if (dataPoints.some(p => p.trend !== undefined)) {
      headers.push('Trend');
    }

    return {
      headers,
      rows: dataPoints.map(point => {
        const row = [point.label, point.value.toString()];
        if (headers.includes('Percentage')) {
          row.push(point.percentage ? `${point.percentage}%` : 'N/A');
        }
        if (headers.includes('Trend')) {
          const trendText = point.trend
            ? `${point.trend}${point.trendValue ? ` ${point.trendValue}%` : ''}`
            : 'N/A';
          row.push(trendText);
        }
        return row;
      })
    };
  }, [dataPoints]);

  // Sonify data point (play audio representation)
  const sonifyDataPoint = useCallback((dataPoint: ChartDataPoint, duration: number = 0.2) => {
    if (!audioContext || !enableSonification) return;

    const value = typeof dataPoint.value === 'number' ? dataPoint.value : parseFloat(dataPoint.value.toString()) || 0;
    const maxValue = Math.max(...dataPoints.map(p =>
      typeof p.value === 'number' ? p.value : parseFloat(p.value.toString()) || 0
    ));

    // Map value to frequency (200-800 Hz range)
    const frequency = 200 + (value / maxValue) * 600;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  }, [audioContext, enableSonification, dataPoints]);

  // Navigate through data points
  const navigateDataPoints = useCallback((direction: 'next' | 'previous' | 'first' | 'last') => {
    let newIndex = currentDataIndex;

    switch (direction) {
      case 'next':
        newIndex = Math.min(currentDataIndex + 1, dataPoints.length - 1);
        break;
      case 'previous':
        newIndex = Math.max(currentDataIndex - 1, 0);
        break;
      case 'first':
        newIndex = 0;
        break;
      case 'last':
        newIndex = dataPoints.length - 1;
        break;
    }

    setCurrentDataIndex(newIndex);

    if (dataPoints[newIndex]) {
      const point = dataPoints[newIndex];
      announceDataPoint(point);

      if (enableSonification) {
        sonifyDataPoint(point);
      }
    }
  }, [currentDataIndex, dataPoints, sonifyDataPoint, enableSonification]);

  // Announce data point details
  const announceDataPoint = useCallback((dataPoint: ChartDataPoint) => {
    let announcement = `${dataPoint.label}: ${dataPoint.value}`;

    if (dataPoint.percentage) {
      announcement += `, ${dataPoint.percentage} percent`;
    }

    if (dataPoint.trend) {
      announcement += `, trending ${dataPoint.trend}`;
      if (dataPoint.trendValue) {
        announcement += ` by ${dataPoint.trendValue} percent`;
      }
    }

    if (dataPoint.description) {
      announcement += `. ${dataPoint.description}`;
    }

    announceToScreenReader(announcement);
  }, []);

  // Announce message to screen readers
  const announceToScreenReader = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';
    announcement.textContent = message;

    document.body.appendChild(announcement);
    setTimeout(() => {
      if (document.body.contains(announcement)) {
        document.body.removeChild(announcement);
      }
    }, 1000);
  }, []);

  // Export data as CSV
  const exportDataAsCSV = useCallback(() => {
    if (!enableDataExport || dataPoints.length === 0) return;

    const table = generateDataTable();
    if (!table) return;

    const csvContent = [
      table.headers.join(','),
      ...table.rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_')}_data.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    announceToScreenReader(`Chart data exported as CSV file: ${title} data.csv`);
  }, [enableDataExport, dataPoints, generateDataTable, title, announceToScreenReader]);

  // Keyboard handler for chart navigation
  const handleChartKeyDown = useCallback((event: React.KeyboardEvent) => {
    const { key, ctrlKey, metaKey, altKey } = event;

    if (ctrlKey || metaKey) {
      // Ctrl+E or Cmd+E to export data
      if (key === 'e' || key === 'E') {
        event.preventDefault();
        exportDataAsCSV();
        return;
      }
    }

    // Alt key combinations
    if (altKey) {
      switch (key) {
        case 't':
        case 'T':
          event.preventDefault();
          setIsTableViewActive(!isTableViewActive);
          announceToScreenReader(
            isTableViewActive ? 'Table view disabled' : 'Table view enabled'
          );
          break;
        case 's':
        case 'S':
          if (enableSonification) {
            event.preventDefault();
            sonifyDataPoint(dataPoints[currentDataIndex]);
          }
          break;
      }
      return;
    }

    // Navigation keys
    switch (key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        navigateDataPoints('next');
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        navigateDataPoints('previous');
        break;
      case 'Home':
        event.preventDefault();
        navigateDataPoints('first');
        break;
      case 'End':
        event.preventDefault();
        navigateDataPoints('last');
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (dataPoints[currentDataIndex]) {
          announceDataPoint(dataPoints[currentDataIndex]);
          if (enableSonification) {
            sonifyDataPoint(dataPoints[currentDataIndex]);
          }
        }
        break;
    }
  }, [
    currentDataIndex,
    dataPoints,
    isTableViewActive,
    enableSonification,
    navigateDataPoints,
    announceDataPoint,
    sonifyDataPoint,
    exportDataAsCSV,
    announceToScreenReader
  ]);

  return {
    // Main accessibility properties
    chartDescription: generateChartDescription(),
    dataTable: generateDataTable(),
    currentDataPoint: dataPoints[currentDataIndex],
    currentDataIndex,

    // State
    isTableViewActive,
    setIsTableViewActive,

    // Navigation functions
    navigateDataPoints,
    announceDataPoint,
    announceToScreenReader,

    // Audio functions
    sonifyDataPoint,

    // Export functions
    exportDataAsCSV,

    // Event handlers
    handleChartKeyDown,

    // Utility properties
    hasAudioSupport: !!audioContext,
    totalDataPoints: dataPoints.length
  };
}