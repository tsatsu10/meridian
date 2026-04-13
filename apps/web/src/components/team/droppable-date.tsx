// @epic-3.4-teams: Droppable date component for calendar drag & drop
import React, { useState } from 'react';
import { cn } from "@/lib/cn";
import DraggableEvent from './draggable-event';

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

interface DroppableDateProps {
  date: Date;
  events: CalendarEvent[];
  isCurrentMonth: boolean;
  isToday: boolean;
  onDateClick: (date: Date) => void;
  onEventDrop: (event: CalendarEvent, newDate: Date) => void;
  onEventEdit?: (event: CalendarEvent) => void;
  onEventDelete?: (eventId: string) => void;
  viewMode?: string;
}

export default function DroppableDate({
  date,
  events,
  isCurrentMonth,
  isToday,
  onDateClick,
  onEventDrop,
  onEventEdit,
  onEventDelete,
  viewMode = 'month'
}: DroppableDateProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    try {
      const eventData = JSON.parse(e.dataTransfer.getData('application/json'));
      if (eventData && eventData.id) {
        onEventDrop(eventData, date);
      }
    } catch (error) {
      console.error('Failed to parse dropped event data:', error);
    }
  };

  const handleEventDragStart = (event: CalendarEvent) => {
    setDraggedEvent(event);
  };

  const handleEventDragEnd = () => {
    setDraggedEvent(null);
  };

  const handleDateClick = (e: React.MouseEvent) => {
    // Only trigger date click if not clicking on an event
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.date-number')) {
      onDateClick(date);
    }
  };

  return (
    <div
      className={cn(
        "min-h-[80px] p-2 border-r border-b relative cursor-pointer transition-all",
        !isCurrentMonth && "bg-muted/30 text-muted-foreground",
        isToday && "bg-blue-50 dark:bg-blue-900/20",
        isDragOver && "bg-primary/10 border-primary/50 border-2",
        "hover:bg-muted/50"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleDateClick}
      title="Click to add event or drag events here"
    >
      {/* Date number */}
      <div 
        className={cn(
          "date-number text-sm mb-1 pointer-events-none select-none",
          isToday && "font-bold text-blue-600"
        )}
      >
        {date.getDate()}
      </div>

      {/* Events */}
      <div className="space-y-1">
        {events.slice(0, viewMode === 'month' ? 2 : 10).map((event) => (
          <DraggableEvent
            key={event.id}
            event={event}
            onEdit={onEventEdit}
            onDelete={onEventDelete}
            onDragStart={handleEventDragStart}
            onDragEnd={handleEventDragEnd}
            isDragging={draggedEvent?.id === event.id}
            viewMode={viewMode}
          />
        ))}
        
        {/* Show count if more events */}
        {events.length > 2 && viewMode === 'month' && (
          <div className="text-xs text-muted-foreground pointer-events-none">
            +{events.length - 2} more
          </div>
        )}
      </div>

      {/* Drop indicator */}
      {isDragOver && (
        <div className="absolute inset-0 border-2 border-dashed border-primary/50 bg-primary/5 rounded pointer-events-none flex items-center justify-center">
          <div className="text-primary text-sm font-medium bg-background/90 px-2 py-1 rounded">
            Drop event here
          </div>
        </div>
      )}
    </div>
  );
}