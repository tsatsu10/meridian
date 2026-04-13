// @epic-1.2-gantt: Timeline/Gantt view for schedule visualization
// @persona-sarah: PM sprint planning with dependency view
import React, { useRef, useEffect, useState } from 'react';
import { format, differenceInDays, addDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { cn } from '@/lib/cn';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { TimelineEntry, CalendarEvent } from '@/types/schedule';
import { ChevronRight, AlertCircle } from 'lucide-react';

interface TimelineViewProps {
  entries: TimelineEntry[];
  startDate?: Date;
  endDate?: Date;
  onEntryClick?: (entry: TimelineEntry) => void;
  onDragEnd?: (entryId: string, newStartDate: Date, newEndDate: Date) => void;
  className?: string;
}

export function TimelineView({
  entries,
  startDate,
  endDate,
  onEntryClick,
  onDragEnd,
  className
}: TimelineViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredEntry, setHoveredEntry] = useState<string | null>(null);
  const [draggedEntry, setDraggedEntry] = useState<string | null>(null);
  
  // Calculate date range
  const dateRange = React.useMemo(() => {
    if (startDate && endDate) {
      return { start: startDate, end: endDate };
    }
    
    if (entries.length === 0) {
      const now = new Date();
      return {
        start: startOfWeek(now),
        end: endOfWeek(addDays(now, 28))
      };
    }
    
    const dates = entries.flatMap(e => [e.startDate, e.endDate]);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    return {
      start: startOfWeek(minDate),
      end: endOfWeek(addDays(maxDate, 7))
    };
  }, [entries, startDate, endDate]);
  
  const days = eachDayOfInterval(dateRange);
  const totalDays = days.length;
  const dayWidth = 40; // pixels
  const rowHeight = 60; // pixels
  
  const getEntryPosition = (entry: TimelineEntry) => {
    const startOffset = differenceInDays(entry.startDate, dateRange.start);
    const duration = differenceInDays(entry.endDate, entry.startDate) + 1;
    
    return {
      left: startOffset * dayWidth,
      width: duration * dayWidth,
    };
  };
  
  const handleDragStart = (entryId: string) => {
    const entry = entries.find(e => e.id === entryId);
    if (entry?.canDrag) {
      setDraggedEntry(entryId);
    }
  };
  
  const handleDragEnd = () => {
    setDraggedEntry(null);
  };
  
  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  const getTypeIcon = (type: TimelineEntry['type']) => {
    switch (type) {
      case 'milestone':
        return '◆';
      case 'phase':
        return '▭';
      default:
        return '●';
    }
  };
  
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="overflow-x-auto" ref={containerRef}>
          <div className="min-w-max">
            {/* Timeline header with dates */}
            <div className="flex mb-4 sticky top-0 bg-background z-10 pb-2 border-b">
              <div className="w-48 flex-shrink-0 font-medium text-sm">Tasks</div>
              <div className="flex">
                {days.map((day, index) => (
                  <div
                    key={index}
                    className={cn(
                      "text-center flex-shrink-0 border-l border-border/30",
                      day.getDay() === 0 || day.getDay() === 6 ? "bg-muted/30" : ""
                    )}
                    style={{ width: `${dayWidth}px` }}
                  >
                    <div className="text-xs font-medium">{format(day, 'EEE')}</div>
                    <div className="text-xs text-muted-foreground">{format(day, 'd')}</div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Timeline rows */}
            <div className="space-y-1">
              {entries.map((entry, index) => {
                const position = getEntryPosition(entry);
                const isDragged = draggedEntry === entry.id;
                const isHovered = hoveredEntry === entry.id;
                
                return (
                  <div
                    key={entry.id}
                    className="flex items-center relative"
                    style={{ height: `${rowHeight}px` }}
                    onMouseEnter={() => setHoveredEntry(entry.id)}
                    onMouseLeave={() => setHoveredEntry(null)}
                  >
                    {/* Task name */}
                    <div className="w-48 flex-shrink-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{getTypeIcon(entry.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{entry.title}</div>
                          <div className="flex items-center gap-1 mt-1">
                            <div className="flex -space-x-1">
                              {entry.assignees.slice(0, 3).map((assignee, i) => (
                                <div
                                  key={i}
                                  className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 border-2 border-background flex items-center justify-center text-white text-xs"
                                  title={assignee}
                                >
                                  {assignee.charAt(0)}
                                </div>
                              ))}
                              {entry.assignees.length > 3 && (
                                <div className="w-5 h-5 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                                  +{entry.assignees.length - 3}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Timeline bar */}
                    <div className="flex-1 relative">
                      {/* Grid lines */}
                      <div className="absolute inset-0 flex">
                        {days.map((day, i) => (
                          <div
                            key={i}
                            className={cn(
                              "border-l border-border/20",
                              day.getDay() === 0 || day.getDay() === 6 ? "bg-muted/20" : ""
                            )}
                            style={{ width: `${dayWidth}px` }}
                          />
                        ))}
                      </div>
                      
                      {/* Dependency lines */}
                      {entry.dependencies.map(depId => {
                        const depEntry = entries.find(e => e.id === depId);
                        if (!depEntry) return null;
                        
                        const depIndex = entries.findIndex(e => e.id === depId);
                        if (depIndex >= index) return null; // Only draw forward dependencies
                        
                        return (
                          <div
                            key={depId}
                            className="absolute border-l-2 border-blue-400 opacity-50"
                            style={{
                              left: `${position.left}px`,
                              top: `-${(index - depIndex) * rowHeight}px`,
                              height: `${(index - depIndex) * rowHeight}px`
                            }}
                          />
                        );
                      })}
                      
                      {/* Task bar */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className={cn(
                                "absolute top-1/2 -translate-y-1/2 rounded-lg border-2 transition-all",
                                "flex items-center justify-between px-3 py-2",
                                isDragged && "opacity-50 cursor-grabbing",
                                isHovered && "scale-105 shadow-lg z-10",
                                entry.canDrag && "cursor-grab hover:shadow-md",
                                !entry.canDrag && "cursor-default"
                              )}
                              style={{
                                left: `${position.left}px`,
                                width: `${position.width}px`,
                                backgroundColor: entry.color,
                                borderColor: entry.color
                              }}
                              onClick={() => onEntryClick?.(entry)}
                              draggable={entry.canDrag}
                              onDragStart={() => handleDragStart(entry.id)}
                              onDragEnd={handleDragEnd}
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-xs font-medium text-white truncate">
                                  {entry.title}
                                </span>
                                {entry.dependencies.length > 0 && (
                                  <ChevronRight className="h-3 w-3 text-white/70" />
                                )}
                              </div>
                              
                              {/* Progress indicator */}
                              <div className="ml-2 flex items-center gap-1">
                                <div className="w-12 h-1.5 bg-white/30 rounded-full overflow-hidden">
                                  <div
                                    className={cn("h-full transition-all", getProgressColor(entry.progress))}
                                    style={{ width: `${entry.progress}%` }}
                                  />
                                </div>
                                <span className="text-xs text-white/90 font-medium">
                                  {entry.progress}%
                                </span>
                              </div>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              <div className="font-medium">{entry.title}</div>
                              <div className="text-xs text-muted-foreground">
                                {format(entry.startDate, 'MMM d')} - {format(entry.endDate, 'MMM d')}
                              </div>
                              <div className="text-xs">Progress: {entry.progress}%</div>
                              {entry.assignees.length > 0 && (
                                <div className="text-xs">
                                  Assignees: {entry.assignees.join(', ')}
                                </div>
                              )}
                              {entry.dependencies.length > 0 && (
                                <div className="text-xs text-yellow-600 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  {entry.dependencies.length} dependencies
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {entries.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No timeline entries to display
              </div>
            )}
          </div>
        </div>
        
        {/* Legend */}
        <div className="mt-6 pt-4 border-t flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span>● Task</span>
              <span>◆ Milestone</span>
              <span>▭ Phase</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span>80%+</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded" />
              <span>50-79%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-500 rounded" />
              <span>25-49%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded" />
              <span>&lt;25%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


