// @epic-3.4-teams: Draggable event component for calendar
import React from 'react';
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  Users, 
  AlertCircle, 
  Target, 
  Coffee, 
  Video, 
  Briefcase,
  Edit,
  Trash2,
  MoreHorizontal
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface CalendarEvent {
  id: string;
  title: string;
  type: 'meeting' | 'deadline' | 'time-off' | 'workload' | 'milestone';
  date: string;
  time?: string;
  duration?: string;
  attendees?: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  color: string;
  memberId?: string;
  estimatedHours?: number;
}

interface DraggableEventProps {
  event: CalendarEvent;
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (eventId: string) => void;
  onDragStart?: (event: CalendarEvent) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  viewMode?: string;
}

const eventTypeIcons = {
  meeting: Video,
  deadline: AlertCircle,
  'time-off': Coffee,
  workload: Briefcase,
  milestone: Target
};

const priorityColors = {
  low: "border-gray-300 bg-gray-50 text-gray-700",
  medium: "border-yellow-300 bg-yellow-50 text-yellow-700", 
  high: "border-orange-300 bg-orange-50 text-orange-700",
  critical: "border-red-300 bg-red-50 text-red-700"
};

export default function DraggableEvent({
  event,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
  isDragging = false,
  viewMode = 'month'
}: DraggableEventProps) {
  const EventIcon = eventTypeIcons[event.type];
  
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify(event));
    e.dataTransfer.effectAllowed = 'move';
    onDragStart?.(event);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    onDragEnd?.();
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(event);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this event?')) {
      onDelete?.(event.id);
    }
  };

  // Compact view for month mode
  if (viewMode === 'month') {
    return (
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={cn(
          "group relative text-xs p-1 rounded truncate cursor-move transition-all",
          event.color,
          "text-white",
          isDragging && "opacity-50 scale-95",
          "hover:shadow-md hover:scale-105"
        )}
        title={`${event.title} - ${event.time || ''} ${event.duration ? `(${event.duration}min)` : ''}`}
      >
        <div className="flex items-center space-x-1">
          <EventIcon className="h-3 w-3 flex-shrink-0" />
          <span className="truncate flex-1">{event.title}</span>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white/20 hover:bg-white/30"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="h-3 w-3 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                <Trash2 className="h-3 w-3 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  // Detailed view for agenda/week/day modes
  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        "group p-4 rounded-lg border-l-4 cursor-move transition-all",
        event.color.replace('bg-', 'border-l-'),
        priorityColors[event.priority],
        isDragging && "opacity-50 scale-95",
        "hover:shadow-md hover:scale-[1.02]"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <EventIcon className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h4 className="font-medium truncate">{event.title}</h4>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
              <span>{event.date}</span>
              {event.time && (
                <span className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>{event.time}</span>
                </span>
              )}
              {event.duration && <span>{event.duration}min</span>}
              {event.estimatedHours && <span>{event.estimatedHours}h</span>}
            </div>
            {event.attendees && event.attendees.length > 0 && (
              <div className="mt-2">
                <div className="flex items-center space-x-2">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <div className="flex space-x-1">
                    {event.attendees.slice(0, 3).map((attendee, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {attendee}
                      </Badge>
                    ))}
                    {event.attendees.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{event.attendees.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge 
            variant={event.priority === 'high' || event.priority === 'critical' ? 'secondary' : 'secondary'}
            className={cn(
              "capitalize text-xs",
              event.priority === 'critical' ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" :
              event.priority === 'high' ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300" :
              event.priority === 'medium' ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" :
              "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
            )}
          >
            {event.priority}
          </Badge>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}