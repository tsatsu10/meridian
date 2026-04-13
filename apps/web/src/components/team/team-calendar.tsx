// @epic-3.4-teams: Team availability calendar and scheduling
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Calendar, 
  Clock,
  ChevronLeft,
  ChevronRight,
  Users,
  Plus
} from "lucide-react";
import { cn } from "@/lib/cn";

// Icon wrappers to fix TypeScript issues
const CalendarIcon = Calendar as React.FC<{ className?: string }>;
const ClockIcon = Clock as React.FC<{ className?: string }>;
const ChevronLeftIcon = ChevronLeft as React.FC<{ className?: string }>;
const ChevronRightIcon = ChevronRight as React.FC<{ className?: string }>;
const UsersIcon = Users as React.FC<{ className?: string }>;
const PlusIcon = Plus as React.FC<{ className?: string }>;

interface TeamCalendarProps {
  open: boolean;
  onClose: () => void;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: 'meeting' | 'focus' | 'unavailable' | 'available';
  attendees: string[];
}

interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  availability: 'available' | 'meeting' | 'focused' | 'unavailable';
}

// Team members will be loaded from real workspace data
const teamMembers: TeamMember[] = [];

// Calendar events will be loaded from real project data
const calendarEvents: CalendarEvent[] = [];

const timeSlots = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"
];

const availabilityColors = {
  available: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  meeting: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300", 
  focused: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  unavailable: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
};

const eventColors = {
  meeting: "bg-blue-500",
  focus: "bg-purple-500",
  unavailable: "bg-gray-500",
  available: "bg-green-500"
};

export default function TeamCalendar({ open, onClose }: TeamCalendarProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week">("day");

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getEventForTimeSlot = (memberId: string, timeSlot: string) => {
    return calendarEvents.find(event => {
      const eventStart = event.start;
      const eventEnd = event.end;
      return event.attendees.includes(memberId) && 
             timeSlot >= eventStart && timeSlot < eventEnd;
    });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setSelectedDate(newDate);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5" />
            <span>Team Calendar</span>
          </DialogTitle>
          <DialogDescription>
            View team availability and schedule meetings across your team members.
          </DialogDescription>
        </DialogHeader>

        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate('prev')}
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <div className="text-lg font-semibold min-w-[200px] text-center">
                {formatDate(selectedDate)}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate('next')}
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex rounded-lg border border-input">
              <button
                onClick={() => setViewMode("day")}
                className={cn(
                  "px-3 py-1 text-sm font-medium transition-colors",
                  viewMode === "day" ? "bg-muted" : "hover:bg-muted/50"
                )}
              >
                Day
              </button>
              <button
                onClick={() => setViewMode("week")}
                className={cn(
                  "px-3 py-1 text-sm font-medium transition-colors border-l border-input",
                  viewMode === "week" ? "bg-muted" : "hover:bg-muted/50"
                )}
              >
                Week
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <UsersIcon className="mr-2 h-4 w-4" />
              Team View
            </Button>
            <Button size="sm">
              <PlusIcon className="mr-2 h-4 w-4" />
              Schedule Meeting
            </Button>
          </div>
        </div>

        {/* Team Availability Overview */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-3">Current Availability</h3>
          <div className="flex flex-wrap gap-3">
            {teamMembers.map((member) => (
              <div key={member.id} className="flex items-center space-x-2">
                <Avatar className="w-6 h-6">
                  <div className="w-full h-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                    {member.name.charAt(0)}
                  </div>
                </Avatar>
                <span className="text-sm font-medium">{member.name}</span>
                <Badge className={cn("text-xs", availabilityColors[member.availability])}>
                  {member.availability}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
          {/* Header Row */}
          <div className="grid grid-cols-6 bg-muted/50">
            <div className="p-3 text-sm font-medium border-r border-zinc-200 dark:border-zinc-800">
              Time
            </div>
            {teamMembers.map((member) => (
              <div key={member.id} className="p-3 text-sm font-medium border-r border-zinc-200 dark:border-zinc-800 last:border-r-0">
                <div className="flex items-center space-x-2">
                  <Avatar className="w-6 h-6">
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                      {member.name.charAt(0)}
                    </div>
                  </Avatar>
                  <span className="truncate">{member.name.split(' ')[0]}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Time Slots */}
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {timeSlots.map((timeSlot) => (
              <div key={timeSlot} className="grid grid-cols-6 min-h-[60px]">
                <div className="p-3 text-sm text-muted-foreground border-r border-zinc-200 dark:border-zinc-800 bg-muted/25">
                  {timeSlot}
                </div>
                {teamMembers.map((member) => {
                  const event = getEventForTimeSlot(member.id, timeSlot);
                  return (
                    <div 
                      key={`${member.id}-${timeSlot}`} 
                      className="p-2 border-r border-zinc-200 dark:border-zinc-800 last:border-r-0"
                    >
                      {event && (
                        <div className={cn(
                          "p-2 rounded text-xs text-white font-medium",
                          eventColors[event.type]
                        )}>
                          <div className="truncate">{event.title}</div>
                          <div className="text-xs opacity-75">
                            {event.start} - {event.end}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-blue-500"></div>
              <span className="text-sm">Meeting</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-purple-500"></div>
              <span className="text-sm">Focus Time</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-gray-500"></div>
              <span className="text-sm">Unavailable</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-green-500"></div>
              <span className="text-sm">Available</span>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            {teamMembers.filter(m => m.availability === 'available').length} of {teamMembers.length} available now
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <div className="flex space-x-2">
            <Button variant="outline">
              <ClockIcon className="mr-2 h-4 w-4" />
              Find Meeting Time
            </Button>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              Schedule Meeting
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 