import { useMemo } from "react";
import { format, startOfDay, addHours, isSameHour, isAfter, isBefore, isSameDay, endOfDay } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { CalendarEvent } from "@/types/schedule";
import { Clock, Video, AlertCircle, CheckCircle2, MapPin } from "lucide-react";

interface DayViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick?: (event: CalendarEvent) => void;
  className?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WORKING_HOURS_START = 8;
const WORKING_HOURS_END = 18;

const eventTypeStyles = {
  meeting: "bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20",
  deadline: "bg-red-500/10 border-red-500/30 hover:bg-red-500/20",
  milestone: "bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20",
  task: "bg-green-500/10 border-green-500/30 hover:bg-green-500/20",
};

const eventTypeIcons = {
  meeting: Video,
  deadline: AlertCircle,
  milestone: CheckCircle2,
  task: Clock,
};

export default function DayView({ events, currentDate, onEventClick, className }: DayViewProps) {
  const dayStart = startOfDay(currentDate);
  
  const eventsForDay = useMemo(() => {
    const dayEnd = endOfDay(currentDate);
    return events.filter(event => {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      // Include events that start on this day OR span across this day
      return (
        isSameDay(eventStart, currentDate) ||
        (eventStart <= dayStart && eventEnd >= dayStart) ||
        (eventStart <= dayEnd && eventEnd >= dayEnd)
      );
    });
  }, [events, dayStart, currentDate]);

  const getEventsForHour = (hour: number) => {
    const hourStart = addHours(dayStart, hour);
    const hourEnd = addHours(hourStart, 1);
    
    return eventsForDay.filter(event => {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      
      return (
        (isAfter(eventStart, hourStart) && isBefore(eventStart, hourEnd)) ||
        (isAfter(eventEnd, hourStart) && isBefore(eventEnd, hourEnd)) ||
        (isBefore(eventStart, hourStart) && isAfter(eventEnd, hourEnd))
      );
    });
  };

  const isWorkingHour = (hour: number) => {
    return hour >= WORKING_HOURS_START && hour < WORKING_HOURS_END;
  };

  const getCurrentHour = () => {
    const now = new Date();
    if (format(now, 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd')) {
      return now.getHours();
    }
    return -1;
  };

  const currentHour = getCurrentHour();

  return (
    <div className={cn("h-full overflow-auto", className)}>
      <div className="min-w-[600px]">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{format(currentDate, 'EEEE, MMMM d, yyyy')}</h3>
              <p className="text-sm text-muted-foreground">
                {eventsForDay.length} event{eventsForDay.length !== 1 ? 's' : ''} scheduled
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Working Hours: {WORKING_HOURS_START}:00 - {WORKING_HOURS_END}:00
              </Badge>
            </div>
          </div>
        </div>

        {/* Time Grid */}
        <div className="divide-y divide-border">
          {HOURS.map((hour) => {
            const hourEvents = getEventsForHour(hour);
            const isCurrentHour = hour === currentHour;
            const isWorking = isWorkingHour(hour);

            return (
              <div
                key={hour}
                className={cn(
                  "flex border-l-2 transition-colors",
                  isCurrentHour && "bg-blue-500/5 border-l-blue-500",
                  !isCurrentHour && isWorking && "bg-background",
                  !isCurrentHour && !isWorking && "bg-muted/30",
                  !isCurrentHour && "border-l-transparent"
                )}
              >
                {/* Time Label */}
                <div className="w-20 flex-shrink-0 p-3 text-right border-r">
                  <div className="flex flex-col items-end">
                    <span className={cn(
                      "text-sm font-medium",
                      isCurrentHour && "text-blue-600 dark:text-blue-400"
                    )}>
                      {format(addHours(dayStart, hour), 'h:mm')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(addHours(dayStart, hour), 'a')}
                    </span>
                  </div>
                </div>

                {/* Events Column */}
                <div className="flex-1 min-h-[80px] p-2">
                  {hourEvents.length > 0 ? (
                    <div className="space-y-1">
                      {hourEvents.map((event) => {
                        const Icon = eventTypeIcons[event.type];
                        return (
                          <button
                            key={event.id}
                            onClick={() => onEventClick?.(event)}
                            className={cn(
                              "w-full text-left p-3 rounded-lg border transition-all",
                              eventTypeStyles[event.type],
                              "hover:shadow-md group"
                            )}
                          >
                            <div className="flex items-start gap-2">
                              <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium text-sm truncate">{event.title}</p>
                                  <Badge variant="secondary" className="text-xs">
                                    {event.type}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {format(new Date(event.startTime), 'h:mm a')} - {format(new Date(event.endTime), 'h:mm a')}
                                  </span>
                                  {event.location && (
                                    <span className="flex items-center gap-1 truncate">
                                      <MapPin className="h-3 w-3" />
                                      {event.location}
                                    </span>
                                  )}
                                </div>
                                {event.participants && event.participants.length > 0 && (
                                  <div className="flex items-center gap-1 mt-2">
                                    <div className="flex -space-x-2">
                                      {event.participants.slice(0, 3).map((participant, i) => (
                                        <div
                                          key={i}
                                          className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 border-2 border-background flex items-center justify-center text-white text-xs font-semibold"
                                          title={participant.name}
                                        >
                                          {participant.name.charAt(0).toUpperCase()}
                                        </div>
                                      ))}
                                      {event.participants.length > 3 && (
                                        <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                                          +{event.participants.length - 3}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-xs text-muted-foreground/50">No events</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


