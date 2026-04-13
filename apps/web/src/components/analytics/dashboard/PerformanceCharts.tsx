import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PerformanceChartsProps {
  data?: any;
  className?: string;
}

export const PerformanceCharts: React.FC<PerformanceChartsProps> = ({ data, className }) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Performance Charts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-gray-500">
          <p>Performance charts component coming soon</p>
        </div>
      </CardContent>
    </Card>
  );
};
