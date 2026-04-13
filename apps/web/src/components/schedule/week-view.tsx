import { useMemo } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addHours, isSameDay, isAfter, isBefore, startOfDay, isWithinInterval } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { CalendarEvent } from "@/types/schedule";
import { Clock, Video, AlertCircle, CheckCircle2 } from "lucide-react";

interface WeekViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick?: (event: CalendarEvent) => void;
  className?: string;
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7 AM to 7 PM
const WORKING_HOURS_START = 8;
const WORKING_HOURS_END = 18;

const eventTypeStyles = {
  meeting: "bg-blue-500/10 border-l-blue-500 hover:bg-blue-500/20",
  deadline: "bg-red-500/10 border-l-red-500 hover:bg-red-500/20",
  milestone: "bg-purple-500/10 border-l-purple-500 hover:bg-purple-500/20",
  task: "bg-green-500/10 border-l-green-500 hover:bg-green-500/20",
};

const eventTypeIcons = {
  meeting: Video,
  deadline: AlertCircle,
  milestone: CheckCircle2,
  task: Clock,
};

export default function WeekView({ events, currentDate, onEventClick, className }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const eventsForWeek = useMemo(() => {
    return events.filter(event => {
      const eventStart = new Date(event.startTime);
      // Use inclusive comparison to include events on Sunday (weekStart) and Saturday (weekEnd)
      return isWithinInterval(eventStart, { start: weekStart, end: weekEnd });
    });
  }, [events, weekStart, weekEnd]);

  const getEventsForDayAndHour = (day: Date, hour: number) => {
    const hourStart = addHours(startOfDay(day), hour);
    const hourEnd = addHours(hourStart, 1);
    
    return eventsForWeek.filter(event => {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      
      return (
        isSameDay(eventStart, day) &&
        ((isAfter(eventStart, hourStart) && isBefore(eventStart, hourEnd)) ||
        (isAfter(eventEnd, hourStart) && isBefore(eventEnd, hourEnd)) ||
        (isBefore(eventStart, hourStart) && isAfter(eventEnd, hourEnd)))
      );
    });
  };

  const isToday = (day: Date) => {
    return isSameDay(day, new Date());
  };

  const getEventsCountForDay = (day: Date) => {
    return eventsForWeek.filter(event => {
      const eventStart = new Date(event.startTime);
      return isSameDay(eventStart, day);
    }).length;
  };

  return (
    <div className={cn("h-full overflow-auto", className)}>
      <div className="min-w-[1000px]">
        {/* Week Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
          <div className="flex">
            {/* Time column spacer */}
            <div className="w-16 flex-shrink-0 border-r" />
            
            {/* Day columns */}
            {daysInWeek.map((day) => {
              const eventsCount = getEventsCountForDay(day);
              const today = isToday(day);
              
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "flex-1 p-3 border-r",
                    today && "bg-blue-500/5"
                  )}
                >
                  <div className="text-center">
                    <div className={cn(
                      "text-xs font-medium uppercase mb-1",
                      today ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"
                    )}>
                      {format(day, 'EEE')}
                    </div>
                    <div className={cn(
                      "text-2xl font-bold mb-1",
                      today && "text-blue-600 dark:text-blue-400"
                    )}>
                      {format(day, 'd')}
                    </div>
                    {eventsCount > 0 && (
                      <Badge variant={today ? "default" : "secondary"} className="text-xs">
                        {eventsCount} event{eventsCount !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Time Grid */}
        <div className="divide-y divide-border">
          {HOURS.map((hour) => {
            const isWorkingHour = hour >= WORKING_HOURS_START && hour < WORKING_HOURS_END;
            
            return (
              <div key={hour} className="flex">
                {/* Time Label */}
                <div className={cn(
                  "w-16 flex-shrink-0 p-2 text-right border-r text-xs font-medium",
                  isWorkingHour ? "text-foreground" : "text-muted-foreground"
                )}>
                  {format(addHours(startOfDay(new Date()), hour), 'h a')}
                </div>

                {/* Day columns */}
                {daysInWeek.map((day) => {
                  const dayEvents = getEventsForDayAndHour(day, hour);
                  const today = isToday(day);
                  
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "flex-1 min-h-[60px] border-r p-1 transition-colors",
                        !isWorkingHour && "bg-muted/20",
                        today && "bg-blue-500/[0.02]"
                      )}
                    >
                      <div className="space-y-1">
                        {dayEvents.map((event) => {
                          const Icon = eventTypeIcons[event.type];
                          return (
                            <button
                              key={event.id}
                              onClick={() => onEventClick?.(event)}
                              className={cn(
                                "w-full text-left p-1.5 rounded border-l-2 text-xs transition-all",
                                eventTypeStyles[event.type],
                                "hover:shadow-sm group"
                              )}
                              title={`${event.title}\n${format(new Date(event.startTime), 'h:mm a')} - ${format(new Date(event.endTime), 'h:mm a')}`}
                            >
                              <div className="flex items-start gap-1">
                                <Icon className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate leading-tight">{event.title}</p>
                                  <p className="text-[10px] text-muted-foreground truncate">
                                    {format(new Date(event.startTime), 'h:mm a')}
                                  </p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* All-day events section */}
        {eventsForWeek.some(e => {
          const duration = new Date(e.endTime).getTime() - new Date(e.startTime).getTime();
          return duration >= 24 * 60 * 60 * 1000; // 24 hours or more
        }) && (
          <div className="border-t bg-muted/30">
            <div className="flex">
              <div className="w-16 flex-shrink-0 p-2 text-xs font-medium border-r">
                All Day
              </div>
              {daysInWeek.map((day) => {
                const allDayEvents = eventsForWeek.filter(event => {
                  const eventStart = new Date(event.startTime);
                  const duration = new Date(event.endTime).getTime() - eventStart.getTime();
                  return isSameDay(eventStart, day) && duration >= 24 * 60 * 60 * 1000;
                });
                
                return (
                  <div
                    key={day.toISOString()}
                    className="flex-1 p-2 border-r"
                  >
                    <div className="space-y-1">
                      {allDayEvents.map((event) => {
                        const Icon = eventTypeIcons[event.type];
                        return (
                          <button
                            key={event.id}
                            onClick={() => onEventClick?.(event)}
                            className={cn(
                              "w-full text-left p-2 rounded-lg border transition-all text-xs",
                              eventTypeStyles[event.type]
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="h-3 w-3" />
                              <span className="font-medium truncate">{event.title}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


