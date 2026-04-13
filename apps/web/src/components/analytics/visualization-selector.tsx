import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle } from "lucide-react";

export interface VisualizationType {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  supportedDataTypes: string[];
  minMetrics: number;
  maxMetrics: number;
}

interface VisualizationSelectorProps {
  visualizations: VisualizationType[];
  selectedVisualization?: string;
  onVisualizationSelect: (visualizationId: string) => void;
  selectedMetricCount: number;
  selectedMetricTypes: string[];
  className?: string;
}

export function VisualizationSelector({
  visualizations,
  selectedVisualization,
  onVisualizationSelect,
  selectedMetricCount,
  selectedMetricTypes,
  className
}: VisualizationSelectorProps) {
  const isVisualizationCompatible = (visualization: VisualizationType): boolean => {
    // Check metric count compatibility
    const hasValidMetricCount = selectedMetricCount >= visualization.minMetrics &&
      selectedMetricCount <= visualization.maxMetrics;

    // Check data type compatibility
    const hasCompatibleTypes = selectedMetricTypes.every(type =>
      visualization.supportedDataTypes.includes(type)
    );

    return hasValidMetricCount && hasCompatibleTypes;
  };

  const getIncompatibilityReason = (visualization: VisualizationType): string => {
    if (selectedMetricCount < visualization.minMetrics) {
      return `Requires at least ${visualization.minMetrics} metric${visualization.minMetrics !== 1 ? 's' : ''}`;
    }
    if (selectedMetricCount > visualization.maxMetrics) {
      return `Supports up to ${visualization.maxMetrics} metric${visualization.maxMetrics !== 1 ? 's' : ''}`;
    }
    if (!selectedMetricTypes.every(type => visualization.supportedDataTypes.includes(type))) {
      return `Incompatible metric types. Supports: ${visualization.supportedDataTypes.join(', ')}`;
    }
    return '';
  };

  return (
    <div className={className}>
      <ScrollArea className="h-[500px]">
        <div className="grid grid-cols-2 gap-4 p-1">
          {visualizations.map((visualization) => {
            const isCompatible = isVisualizationCompatible(visualization);
            const incompatibilityReason = !isCompatible ? getIncompatibilityReason(visualization) : '';

            return (
              <Tooltip key={visualization.id}>
                <TooltipTrigger asChild>
                  <div>
                    <Button
                      variant={selectedVisualization === visualization.id ? "default" : "outline"}
                      className="h-auto p-4 w-full"
                      disabled={!isCompatible}
                      onClick={() => onVisualizationSelect(visualization.id)}
                    >
                      <div className="flex flex-col items-center gap-2 w-full">
                        <visualization.icon className="w-8 h-8" />
                        <div className="text-center">
                          <div className="font-medium">{visualization.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {visualization.description}
                          </div>
                          <div className="flex items-center justify-center gap-2 mt-2">
                            <Badge variant="outline">
                              {visualization.minMetrics === visualization.maxMetrics
                                ? `${visualization.minMetrics} metric`
                                : `${visualization.minMetrics}-${visualization.maxMetrics} metrics`}
                            </Badge>
                            {!isCompatible && (
                              <AlertCircle className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </div>
                    </Button>
                  </div>
                </TooltipTrigger>
                {!isCompatible && (
                  <TooltipContent>
                    <p>{incompatibilityReason}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
} 