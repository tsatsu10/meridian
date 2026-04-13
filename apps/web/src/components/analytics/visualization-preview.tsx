import { useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import { Card } from "@/components/ui/card";
import { type Metric } from "./metric-selector";
import { type VisualizationType } from "./visualization-selector";

interface VisualizationPreviewProps {
  metrics: Metric[];
  visualization: VisualizationType;
  data?: any[]; // Replace with proper type when backend API is ready
  className?: string;
}

const COLORS = [
  "#2563eb", // blue-600
  "#16a34a", // green-600
  "#dc2626", // red-600
  "#ca8a04", // yellow-600
  "#9333ea", // purple-600
  "#0891b2", // cyan-600
  "#c2410c", // orange-600
  "#be185d", // pink-600
];

export function VisualizationPreview({
  metrics,
  visualization,
  data = [],
  className
}: VisualizationPreviewProps) {
  // For demo purposes, generate sample data if not provided
  const sampleData = useMemo(() => {
    if (data.length > 0) return data;

    // Generate sample data based on metric types
    switch (visualization.id) {
      case "bar":
      case "line":
        return Array.from({ length: 7 }, (_, i) => {
          const day = new Date();
          day.setDate(day.getDate() - (6 - i));
          return {
            date: day.toLocaleDateString("en-US", { weekday: "short" }),
            ...metrics.reduce((acc, metric) => ({
              ...acc,
              [metric.name]: Math.floor(Math.random() * 100)
            }), {})
          };
        });

      case "pie":
        return metrics.map(metric => ({
          name: metric.name,
          value: Math.floor(Math.random() * 100)
        }));

      case "gauge":
        return [{
          name: metrics[0].name,
          value: Math.floor(Math.random() * 100)
        }];

      default:
        return [];
    }
  }, [metrics, visualization.id, data]);

  const renderChart = () => {
    switch (visualization.id) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sampleData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              {metrics.map((metric, index) => (
                <Bar
                  key={metric.id}
                  dataKey={metric.name}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={sampleData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              {metrics.map((metric, index) => (
                <Line
                  key={metric.id}
                  type="monotone"
                  dataKey={metric.name}
                  stroke={COLORS[index % COLORS.length]}
                  activeDot={{ r: 8 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case "pie":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={sampleData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {sampleData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case "gauge":
        const value = sampleData[0]?.value || 0;
        const percentage = value / 100;
        const startAngle = 180;
        const endAngle = -180;
        const gaugeData = [
          { name: "value", value: value },
          { name: "empty", value: 100 - value }
        ];

        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={gaugeData}
                cx="50%"
                cy="50%"
                startAngle={startAngle}
                endAngle={endAngle}
                innerRadius={60}
                outerRadius={80}
                cornerRadius={5}
                paddingAngle={5}
                dataKey="value"
              >
                <Cell fill={COLORS[0]} />
                <Cell fill="#e5e7eb" /> {/* gray-200 */}
              </Pie>
              <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-2xl font-bold"
              >
                {`${value}%`}
              </text>
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <Card className={className}>
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">{visualization.name}</h3>
        {renderChart()}
      </div>
    </Card>
  );
} 