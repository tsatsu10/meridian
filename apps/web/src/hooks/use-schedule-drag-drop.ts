// @epic-3.4-teams: Drag-and-drop schedule management
// @persona-sarah: PM intuitive task rescheduling
import { useState, useCallback } from 'react';
import { addDays, differenceInDays, startOfDay } from 'date-fns';
import type { CalendarEvent, DragDropContext, ScheduleConflict, MemberSchedule } from '@/types/schedule';

interface UseScheduleDragDropOptions {
  events: CalendarEvent[];
  memberSchedules: MemberSchedule[];
  onEventMove: (eventId: string, newDate: Date, newMember?: string) => void;
  onEventResize: (eventId: string, newStartDate: Date, newEndDate: Date) => void;
  checkConflicts?: (event: CalendarEvent, newDate: Date, newMember?: string) => ScheduleConflict[];
}

export function useScheduleDragDrop({
  events,
  memberSchedules,
  onEventMove,
  onEventResize,
  checkConflicts
}: UseScheduleDragDropOptions) {
  
  const [dragContext, setDragContext] = useState<DragDropContext>({
    draggedEvent: null,
    targetDate: null,
    targetMember: null,
    isValidDrop: false,
    conflicts: []
  });
  
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<'start' | 'end' | null>(null);
  
  const startDrag = useCallback((event: CalendarEvent) => {
    setDragContext({
      draggedEvent: event,
      targetDate: null,
      targetMember: null,
      isValidDrop: false,
      conflicts: []
    });
  }, []);
  
  const updateDragTarget = useCallback((targetDate: Date, targetMember?: string) => {
    if (!dragContext.draggedEvent) return;
    
    const conflicts = checkConflicts 
      ? checkConflicts(dragContext.draggedEvent, targetDate, targetMember)
      : [];
    
    const isValidDrop = validateDrop(
      dragContext.draggedEvent,
      targetDate,
      targetMember,
      memberSchedules,
      events
    );
    
    setDragContext(prev => ({
      ...prev,
      targetDate,
      targetMember: targetMember || null,
      isValidDrop,
      conflicts
    }));
  }, [dragContext.draggedEvent, checkConflicts, memberSchedules, events]);
  
  const completeDrag = useCallback(() => {
    if (!dragContext.draggedEvent || !dragContext.targetDate || !dragContext.isValidDrop) {
      setDragContext({
        draggedEvent: null,
        targetDate: null,
        targetMember: null,
        isValidDrop: false,
        conflicts: []
      });
      return false;
    }
    
    onEventMove(
      dragContext.draggedEvent.id,
      dragContext.targetDate,
      dragContext.targetMember || undefined
    );
    
    setDragContext({
      draggedEvent: null,
      targetDate: null,
      targetMember: null,
      isValidDrop: false,
      conflicts: []
    });
    
    return true;
  }, [dragContext, onEventMove]);
  
  const cancelDrag = useCallback(() => {
    setDragContext({
      draggedEvent: null,
      targetDate: null,
      targetMember: null,
      isValidDrop: false,
      conflicts: []
    });
    setIsResizing(false);
    setResizeDirection(null);
  }, []);
  
  const startResize = useCallback((event: CalendarEvent, direction: 'start' | 'end') => {
    setIsResizing(true);
    setResizeDirection(direction);
    setDragContext({
      draggedEvent: event,
      targetDate: null,
      targetMember: null,
      isValidDrop: false,
      conflicts: []
    });
  }, []);
  
  const updateResize = useCallback((newDate: Date) => {
    if (!dragContext.draggedEvent || !resizeDirection) return;
    
    setDragContext(prev => ({
      ...prev,
      targetDate: newDate,
      isValidDrop: true
    }));
  }, [dragContext.draggedEvent, resizeDirection]);
  
  const completeResize = useCallback(() => {
    if (!dragContext.draggedEvent || !dragContext.targetDate || !resizeDirection) {
      cancelDrag();
      return false;
    }
    
    const newStartDate = resizeDirection === 'start' 
      ? dragContext.targetDate 
      : dragContext.draggedEvent.startDate;
    const newEndDate = resizeDirection === 'end' 
      ? dragContext.targetDate 
      : dragContext.draggedEvent.endDate;
    
    // Validate dates
    if (newStartDate >= newEndDate) {
      cancelDrag();
      return false;
    }
    
    onEventResize(dragContext.draggedEvent.id, newStartDate, newEndDate);
    cancelDrag();
    return true;
  }, [dragContext, resizeDirection, onEventResize, cancelDrag]);
  
  const moveEventByDays = useCallback((eventId: string, days: number) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;
    
    const newStartDate = addDays(event.startDate, days);
    const daysDiff = differenceInDays(event.endDate, event.startDate);
    const newEndDate = addDays(newStartDate, daysDiff);
    
    onEventResize(eventId, newStartDate, newEndDate);
  }, [events, onEventResize]);
  
  const duplicateEvent = useCallback((eventId: string, targetDate: Date) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return null;
    
    const duration = differenceInDays(event.endDate, event.startDate);
    const newEvent: CalendarEvent = {
      ...event,
      id: `${event.id}-copy-${Date.now()}`,
      startDate: targetDate,
      endDate: addDays(targetDate, duration),
      title: `${event.title} (Copy)`
    };
    
    return newEvent;
  }, [events]);
  
  return {
    // Drag state
    dragContext,
    isDragging: !!dragContext.draggedEvent && !isResizing,
    isResizing,
    resizeDirection,
    
    // Drag operations
    startDrag,
    updateDragTarget,
    completeDrag,
    cancelDrag,
    
    // Resize operations
    startResize,
    updateResize,
    completeResize,
    
    // Utility operations
    moveEventByDays,
    duplicateEvent
  };
}

function validateDrop(
  event: CalendarEvent,
  targetDate: Date,
  targetMember: string | undefined,
  memberSchedules: MemberSchedule[],
  allEvents: CalendarEvent[]
): boolean {
  // 1. Check if event can be edited
  if (event.canEdit === false) return false;
  
  // 2. Check if target date is in the past
  if (targetDate < startOfDay(new Date())) return false;
  
  // 3. If reassigning to a member, check their availability
  if (targetMember) {
    const memberSchedule = memberSchedules.find(s => s.memberId === targetMember);
    if (!memberSchedule) return false;
    
    // Check if member is available
    if (memberSchedule.availability === 'unavailable' || 
        memberSchedule.availability === 'out-of-office') {
      return false;
    }
    
    // Check if member would be overloaded
    if (memberSchedule.workload > 95) return false;
  }
  
  // 4. Check for overlaps with existing events
  const duration = differenceInDays(event.endDate, event.startDate);
  const targetEndDate = addDays(targetDate, duration);
  
  const attendees = targetMember ? [targetMember] : event.attendees;
  const hasOverlap = allEvents.some(e => {
    if (e.id === event.id) return false;
    
    const hasCommonAttendee = e.attendees.some(a => attendees.includes(a));
    if (!hasCommonAttendee) return false;
    
    return (
      (targetDate >= e.startDate && targetDate < e.endDate) ||
      (targetEndDate > e.startDate && targetEndDate <= e.endDate) ||
      (targetDate <= e.startDate && targetEndDate >= e.endDate)
    );
  });
  
  if (hasOverlap) return false;
  
  return true;
}


