// @epic-3.4-teams: Workload heatmap visualization
// @persona-david: Team Lead workload distribution view
import React, { useMemo } from 'react';
import { format, addDays, startOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { cn } from '@/lib/cn';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { HeatmapData, MemberSchedule } from '@/types/schedule';
import { Activity, TrendingUp, AlertTriangle } from 'lucide-react';

interface WorkloadHeatmapProps {
  memberSchedules: MemberSchedule[];
  startDate?: Date;
  weeks?: number;
  onCellClick?: (date: Date, member: MemberSchedule) => void;
  className?: string;
}

export function WorkloadHeatmap({
  memberSchedules,
  startDate = new Date(),
  weeks = 4,
  onCellClick,
  className
}: WorkloadHeatmapProps) {
  
  const { dateRange, heatmapData } = useMemo(() => {
    const start = startOfWeek(startDate);
    const end = addDays(start, weeks * 7 - 1);
    const dates = eachDayOfInterval({ start, end });
    
    const data: Map<string, Map<string, HeatmapData>> = new Map();
    
    memberSchedules.forEach(member => {
      const memberData: Map<string, HeatmapData> = new Map();
      
      dates.forEach(date => {
        const dateKey = format(date, 'yyyy-MM-dd');
        
        // Get events for this date
        const dayEvents = member.events.filter(event => 
          isSameDay(event.startDate, date) || 
          (event.startDate <= date && event.endDate >= date)
        );
        
        // Calculate workload for this day
        const totalHours = dayEvents.reduce((sum, event) => {
          return sum + (event.estimatedHours || 2);
        }, 0);
        
        const workloadPercentage = Math.min((totalHours / 8) * 100, 150);
        
        let level: HeatmapData['level'] = 'none';
        if (workloadPercentage > 0 && workloadPercentage <= 50) level = 'low';
        else if (workloadPercentage > 50 && workloadPercentage <= 80) level = 'medium';
        else if (workloadPercentage > 80 && workloadPercentage <= 100) level = 'high';
        else if (workloadPercentage > 100) level = 'critical';
        
        memberData.set(dateKey, {
          date,
          value: workloadPercentage,
          level,
          events: dayEvents,
          tooltip: generateTooltip(member.memberName, date, dayEvents, totalHours, workloadPercentage)
        });
      });
      
      data.set(member.memberId, memberData);
    });
    
    return {
      dateRange: dates,
      heatmapData: data
    };
  }, [memberSchedules, startDate, weeks]);
  
  const levelColors = {
    none: 'bg-muted/30',
    low: 'bg-green-500/30',
    medium: 'bg-yellow-500/50',
    high: 'bg-orange-500/70',
    critical: 'bg-red-500/90'
  };
  
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Team Workload Heatmap
          </CardTitle>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Legend:</span>
            <div className="flex gap-1">
              <div className="flex items-center gap-1">
                <div className={cn("w-3 h-3 rounded-sm", levelColors.low)} />
                <span className="text-xs">Light</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={cn("w-3 h-3 rounded-sm", levelColors.medium)} />
                <span className="text-xs">Optimal</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={cn("w-3 h-3 rounded-sm", levelColors.high)} />
                <span className="text-xs">Heavy</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={cn("w-3 h-3 rounded-sm", levelColors.critical)} />
                <span className="text-xs">Critical</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* Header with dates */}
            <div className="flex mb-2">
              <div className="w-32 flex-shrink-0" /> {/* Member name column */}
              {dateRange.map((date, index) => (
                <div
                  key={index}
                  className="w-10 text-center flex-shrink-0"
                >
                  <div className="text-xs font-medium">
                    {weekDays[date.getDay()]}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(date, 'd')}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Member rows */}
            {memberSchedules.map(member => {
              const memberData = heatmapData.get(member.memberId);
              if (!memberData) return null;
              
              const memberStats = calculateMemberStats(Array.from(memberData.values()));
              
              return (
                <div key={member.memberId} className="flex items-center mb-2">
                  <div className="w-32 flex-shrink-0 pr-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {member.memberName}
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs",
                              memberStats.avgWorkload > 100 && "bg-red-100 text-red-800",
                              memberStats.avgWorkload > 80 && memberStats.avgWorkload <= 100 && "bg-orange-100 text-orange-800",
                              memberStats.avgWorkload > 50 && memberStats.avgWorkload <= 80 && "bg-yellow-100 text-yellow-800"
                            )}
                          >
                            {Math.round(memberStats.avgWorkload)}%
                          </Badge>
                          {memberStats.peakDays > 0 && (
                            <AlertTriangle className="h-3 w-3 text-red-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-1">
                    {dateRange.map((date, index) => {
                      const dateKey = format(date, 'yyyy-MM-dd');
                      const cellData = memberData.get(dateKey);
                      
                      if (!cellData) return <div key={index} className="w-10 h-10" />;
                      
                      return (
                        <TooltipProvider key={index}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => onCellClick?.(date, member)}
                                className={cn(
                                  "w-10 h-10 rounded-sm border border-border/50 transition-all hover:scale-110 hover:z-10 hover:shadow-lg",
                                  levelColors[cellData.level],
                                  onCellClick && "cursor-pointer"
                                )}
                              >
                                {cellData.events.length > 0 && (
                                  <div className="text-xs font-medium text-foreground">
                                    {cellData.events.length}
                                  </div>
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1">
                                {cellData.tooltip.split('\n').map((line, i) => (
                                  <div key={i} className="text-xs">{line}</div>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {calculateTeamAverage(heatmapData)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Avg Workload</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {calculatePeakDays(heatmapData)}
                  </div>
                  <div className="text-xs text-muted-foreground">Peak Days</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {calculateBalanceScore(heatmapData)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Balance Score</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}

function generateTooltip(
  memberName: string,
  date: Date,
  events: any[],
  totalHours: number,
  workloadPercentage: number
): string {
  const lines = [
    `${memberName}`,
    format(date, 'EEEE, MMMM d'),
    `${totalHours.toFixed(1)} hours (${Math.round(workloadPercentage)}%)`,
    '',
    events.length > 0 ? 'Events:' : 'No events'
  ];
  
  events.slice(0, 3).forEach(event => {
    lines.push(`• ${event.title}`);
  });
  
  if (events.length > 3) {
    lines.push(`... and ${events.length - 3} more`);
  }
  
  return lines.join('\n');
}

function calculateMemberStats(data: HeatmapData[]) {
  const avgWorkload = data.reduce((sum, d) => sum + d.value, 0) / data.length;
  const peakDays = data.filter(d => d.level === 'critical').length;
  
  return { avgWorkload, peakDays };
}

function calculateTeamAverage(heatmapData: Map<string, Map<string, HeatmapData>>): number {
  let totalWorkload = 0;
  let count = 0;
  
  heatmapData.forEach(memberData => {
    memberData.forEach(cellData => {
      totalWorkload += cellData.value;
      count++;
    });
  });
  
  return count > 0 ? Math.round(totalWorkload / count) : 0;
}

function calculatePeakDays(heatmapData: Map<string, Map<string, HeatmapData>>): number {
  let peakDays = 0;
  
  heatmapData.forEach(memberData => {
    memberData.forEach(cellData => {
      if (cellData.level === 'critical') peakDays++;
    });
  });
  
  return peakDays;
}

function calculateBalanceScore(heatmapData: Map<string, Map<string, HeatmapData>>): number {
  const memberWorkloads: number[] = [];
  
  heatmapData.forEach(memberData => {
    const workloads = Array.from(memberData.values()).map(d => d.value);
    const avgWorkload = workloads.reduce((sum, w) => sum + w, 0) / workloads.length;
    memberWorkloads.push(avgWorkload);
  });
  
  if (memberWorkloads.length === 0) return 100;
  
  const avgTeamWorkload = memberWorkloads.reduce((sum, w) => sum + w, 0) / memberWorkloads.length;
  const variance = memberWorkloads.reduce((sum, w) => sum + Math.pow(w - avgTeamWorkload, 2), 0) / memberWorkloads.length;
  const stdDev = Math.sqrt(variance);
  
  // Lower standard deviation = better balance
  // Convert to 0-100 score where 100 is perfect balance
  const balanceScore = Math.max(0, 100 - stdDev);
  
  return Math.round(balanceScore);
}


