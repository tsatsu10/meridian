import { useState } from "react";
import { Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export interface Metric {
  id: string;
  name: string;
  description: string;
  category: string;
  dataType: "number" | "percentage" | "currency" | "time" | "count";
}

export interface MetricCategory {
  name: string;
  description: string;
  metrics: Metric[];
}

interface MetricSelectorProps {
  categories: MetricCategory[];
  selectedMetrics: string[];
  onMetricSelect: (metricId: string) => void;
  className?: string;
}

export function MetricSelector({
  categories,
  selectedMetrics,
  onMetricSelect,
  className
}: MetricSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = categories.map(category => ({
    ...category,
    metrics: category.metrics.filter(metric =>
      metric.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      metric.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.metrics.length > 0);

  return (
    <div className={className}>
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search metrics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>

        <ScrollArea className="h-[500px] pr-4">
          {filteredCategories.map((category) => (
            <div key={category.name} className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{category.name}</h3>
                <Badge variant="secondary">
                  {category.metrics.length} metric{category.metrics.length !== 1 ? "s" : ""}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {category.description}
              </p>
              <div className="space-y-2">
                {category.metrics.map((metric) => (
                  <Button
                    key={metric.id}
                    variant={selectedMetrics.includes(metric.id) ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => onMetricSelect(metric.id)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="text-left">
                        <div className="font-medium">{metric.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {metric.description}
                        </div>
                      </div>
                      <Badge variant="outline" className="ml-2">
                        {metric.dataType}
                      </Badge>
                    </div>
                  </Button>
                ))}
              </div>
              <Separator className="my-4" />
            </div>
          ))}

          {filteredCategories.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No metrics found matching "{searchQuery}"
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
} 