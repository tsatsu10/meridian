import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Grid, 
  Maximize2, 
  Minimize2, 
  Filter,
  RotateCcw,
  Info
} from 'lucide-react';
import { cn } from '@/lib/cn';
import type { TaskWithPriority } from '@/types/backlog';

interface PriorityMatrixProps {
  tasks: TaskWithPriority[];
  onTaskClick?: (task: TaskWithPriority) => void;
  onTaskMove?: (taskId: string, newQuadrant: MatrixQuadrant) => void;
  showLegend?: boolean;
  className?: string;
}

type MatrixQuadrant = 'high-value-low-effort' | 'high-value-high-effort' | 'low-value-low-effort' | 'low-value-high-effort';

interface QuadrantConfig {
  title: string;
  description: string;
  color: string;
  borderColor: string;
  textColor: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
}

// @epic-3.2-time @persona-david - Team Lead needs visual prioritization tools
export default function PriorityMatrix({ 
  tasks, 
  onTaskClick, 
  onTaskMove, 
  showLegend = true,
  className 
}: PriorityMatrixProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedQuadrant, setSelectedQuadrant] = useState<MatrixQuadrant | null>(null);

  const quadrantConfig: Record<MatrixQuadrant, QuadrantConfig> = {
    'high-value-low-effort': {
      title: 'Quick Wins',
      description: 'High Value, Low Effort',
      color: 'bg-green-50 border-green-200',
      borderColor: 'border-green-300',
      textColor: 'text-green-700',
      priority: 'critical',
      recommendation: 'Do First - Maximum ROI'
    },
    'high-value-high-effort': {
      title: 'Major Projects',
      description: 'High Value, High Effort',
      color: 'bg-blue-50 border-blue-200',
      borderColor: 'border-blue-300',
      textColor: 'text-blue-700',
      priority: 'high',
      recommendation: 'Plan Carefully - Strategic Investment'
    },
    'low-value-low-effort': {
      title: 'Fill-ins',
      description: 'Low Value, Low Effort',
      color: 'bg-yellow-50 border-yellow-200',
      borderColor: 'border-yellow-300',
      textColor: 'text-yellow-700',
      priority: 'medium',
      recommendation: 'Do When Available - Minor Improvements'
    },
    'low-value-high-effort': {
      title: 'Questionable',
      description: 'Low Value, High Effort',
      color: 'bg-red-50 border-red-200',
      borderColor: 'border-red-300',
      textColor: 'text-red-700',
      priority: 'low',
      recommendation: 'Avoid - Poor ROI'
    }
  };

  // Categorize tasks into quadrants based on business value and effort
  const categorizedTasks = useMemo(() => {
    const quadrants: Record<MatrixQuadrant, TaskWithPriority[]> = {
      'high-value-low-effort': [],
      'high-value-high-effort': [],
      'low-value-low-effort': [],
      'low-value-high-effort': []
    };

    tasks.forEach(task => {
      // Default values if not set
      const businessValue = task.businessValue || 5;
      const effort = task.effort || 5;
      
      // Determine quadrant (using 5 as the middle point for 1-10 scale)
      const isHighValue = businessValue > 5;
      const isHighEffort = effort > 5;

      if (isHighValue && !isHighEffort) {
        quadrants['high-value-low-effort'].push(task);
      } else if (isHighValue && isHighEffort) {
        quadrants['high-value-high-effort'].push(task);
      } else if (!isHighValue && !isHighEffort) {
        quadrants['low-value-low-effort'].push(task);
      } else {
        quadrants['low-value-high-effort'].push(task);
      }
    });

    return quadrants;
  }, [tasks]);

  const TaskCard = ({ task, quadrant }: { task: TaskWithPriority; quadrant: MatrixQuadrant }) => (
    <div
      className={cn(
        "p-2 mb-2 rounded border cursor-pointer transition-all duration-200 hover:shadow-md",
        "bg-white border-gray-200 hover:border-gray-300"
      )}
      onClick={() => onTaskClick?.(task)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium truncate">{task.title}</h4>
          <div className="flex items-center gap-2 mt-1">
            {task.businessValue && (
              <Badge variant="outline" className="text-xs">
                Value: {task.businessValue}
              </Badge>
            )}
            {task.effort && (
              <Badge variant="outline" className="text-xs">
                Effort: {task.effort}
              </Badge>
            )}
          </div>
        </div>
        {task.storyPoints && (
          <Badge variant="secondary" className="text-xs ml-2">
            {task.storyPoints}sp
          </Badge>
        )}
      </div>
    </div>
  );

  const QuadrantSection = ({ quadrant, config }: { quadrant: MatrixQuadrant; config: QuadrantConfig }) => {
    const quadrantTasks = categorizedTasks[quadrant];
    const isSelected = selectedQuadrant === quadrant;

    return (
      <div 
        className={cn(
          "relative h-full min-h-[300px] p-4 border-2 rounded-lg transition-all duration-200",
          config.color,
          config.borderColor,
          isSelected && "ring-2 ring-blue-500 ring-offset-2",
          "cursor-pointer hover:shadow-lg"
        )}
        onClick={() => setSelectedQuadrant(isSelected ? null : quadrant)}
      >
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className={cn("font-semibold", config.textColor)}>{config.title}</h3>
            <Badge variant="outline" className="text-xs">
              {quadrantTasks.length}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{config.description}</p>
          <p className="text-xs font-medium mt-1" style={{ color: config.textColor.replace('text-', '') }}>
            {config.recommendation}
          </p>
        </div>
        
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {quadrantTasks.map((task) => (
            <TaskCard key={task.id} task={task} quadrant={quadrant} />
          ))}
          {quadrantTasks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-sm">No tasks in this quadrant</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Calculate totals for each quadrant
  const quadrantTotals = Object.entries(categorizedTasks).map(([key, tasks]) => ({
    quadrant: key as MatrixQuadrant,
    count: tasks.length,
    storyPoints: tasks.reduce((sum, task) => sum + (task.storyPoints || 0), 0),
    config: quadrantConfig[key as MatrixQuadrant]
  }));

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Grid className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Priority Matrix</h2>
          <Badge variant="secondary" className="text-xs">
            {tasks.length} tasks
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedQuadrant(null)}
            disabled={!selectedQuadrant}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <Minimize2 className="h-4 w-4 mr-1" />
            ) : (
              <Maximize2 className="h-4 w-4 mr-1" />
            )}
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="h-4 w-4" />
              Quadrant Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {quadrantTotals.map(({ quadrant, count, storyPoints, config }) => (
                <div key={quadrant} className="text-center p-3 rounded border">
                  <div className={cn("font-medium text-sm", config.textColor)}>
                    {config.title}
                  </div>
                  <div className="text-lg font-bold">{count}</div>
                  <div className="text-xs text-muted-foreground">
                    {storyPoints > 0 && `${storyPoints} story points`}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Matrix Grid */}
      <div className="relative">
        {/* Axis Labels */}
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-sm font-medium text-gray-600">
          High Value
        </div>
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-sm font-medium text-gray-600">
          Low Value
        </div>
        <div className="absolute -left-16 top-1/2 transform -translate-y-1/2 -rotate-90 text-sm font-medium text-gray-600">
          Low Effort
        </div>
        <div className="absolute -right-16 top-1/2 transform -translate-y-1/2 -rotate-90 text-sm font-medium text-gray-600">
          High Effort
        </div>

        {/* Grid */}
        <div className={cn(
          "grid grid-cols-2 gap-4 p-8",
          isExpanded ? "min-h-[600px]" : "min-h-[400px]"
        )}>
          {/* Top Left: High Value, Low Effort */}
          <QuadrantSection 
            quadrant="high-value-low-effort" 
            config={quadrantConfig['high-value-low-effort']} 
          />
          
          {/* Top Right: High Value, High Effort */}
          <QuadrantSection 
            quadrant="high-value-high-effort" 
            config={quadrantConfig['high-value-high-effort']} 
          />
          
          {/* Bottom Left: Low Value, Low Effort */}
          <QuadrantSection 
            quadrant="low-value-low-effort" 
            config={quadrantConfig['low-value-low-effort']} 
          />
          
          {/* Bottom Right: Low Value, High Effort */}
          <QuadrantSection 
            quadrant="low-value-high-effort" 
            config={quadrantConfig['low-value-high-effort']} 
          />
        </div>
      </div>

      {/* Selected Quadrant Details */}
      {selectedQuadrant && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>{quadrantConfig[selectedQuadrant].title}</span>
              <Badge variant="outline">
                {categorizedTasks[selectedQuadrant].length} tasks
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {quadrantConfig[selectedQuadrant].recommendation}
              </p>
              <div className="grid gap-2">
                {categorizedTasks[selectedQuadrant].map((task) => (
                  <div 
                    key={task.id} 
                    className="flex items-center justify-between p-2 border rounded cursor-pointer hover:bg-muted/50"
                    onClick={() => onTaskClick?.(task)}
                  >
                    <span className="font-medium">{task.title}</span>
                    <div className="flex items-center gap-2">
                      {task.businessValue && (
                        <Badge variant="outline" className="text-xs">
                          V: {task.businessValue}
                        </Badge>
                      )}
                      {task.effort && (
                        <Badge variant="outline" className="text-xs">
                          E: {task.effort}
                        </Badge>
                      )}
                      {task.storyPoints && (
                        <Badge variant="secondary" className="text-xs">
                          {task.storyPoints}sp
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 