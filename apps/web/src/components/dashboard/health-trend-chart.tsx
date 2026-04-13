import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface HealthDataPoint {
  date: string;
  score: number;
  timestamp: number;
}

interface HealthTrendChartProps {
  data: HealthDataPoint[];
  height?: number;
  showGrid?: boolean;
  animated?: boolean;
  className?: string;
}

export function HealthTrendChart({
  data,
  height = 300,
  showGrid = true,
  animated = true,
  className,
}: HealthTrendChartProps) {
  // Sort data by timestamp
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => a.timestamp - b.timestamp);
  }, [data]);

  const getTrendColor = (currentScore: number) => {
    if (currentScore >= 80) return "#22c55e";
    if (currentScore >= 60) return "#3b82f6";
    if (currentScore >= 40) return "#f59e0b";
    return "#ef4444";
  };

  const currentScore = sortedData.length > 0 ? sortedData[sortedData.length - 1].score : 0;
  const trendColor = getTrendColor(currentScore);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{data.date}</p>
          <p className="text-sm font-semibold" style={{ color: trendColor }}>
            Score: {Math.round(data.score)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={sortedData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            stroke="#9ca3af"
            style={{ color: "#9ca3af" }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 12 }}
            stroke="#9ca3af"
            style={{ color: "#9ca3af" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="score"
            stroke={trendColor}
            strokeWidth={3}
            dot={false}
            isAnimationActive={animated}
            animationDuration={800}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Compact trend chart without extra UI
 */
export function HealthTrendChartCompact({
  data,
  height = 200,
  className,
}: Omit<HealthTrendChartProps, "showGrid">) {
  return (
    <HealthTrendChart
      data={data}
      height={height}
      showGrid={false}
      className={cn("rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900", className)}
    />
  );
}
