// @epic-3.4-teams: Schedule conflict detection and resolution
// @persona-david: Team Lead workload management
import { useMemo } from 'react';
import { isWithinInterval, areIntervalsOverlapping } from 'date-fns';
import type { CalendarEvent, ScheduleConflict, Resolution, MemberSchedule, ConflictType, ConflictSeverity } from '@/types/schedule';

interface UseScheduleConflictsOptions {
  events: CalendarEvent[];
  memberSchedules: MemberSchedule[];
  autoDetect?: boolean;
}

export function useScheduleConflicts({
  events,
  memberSchedules,
  autoDetect = true
}: UseScheduleConflictsOptions) {
  
  const conflicts = useMemo(() => {
    if (!autoDetect) return [];
    
    const detectedConflicts: ScheduleConflict[] = [];
    
    // 1. Detect overlapping events for same members
    const memberEventMap = new Map<string, CalendarEvent[]>();
    events.forEach(event => {
      event.attendees.forEach(memberId => {
        if (!memberEventMap.has(memberId)) {
          memberEventMap.set(memberId, []);
        }
        memberEventMap.get(memberId)!.push(event);
      });
    });
    
    memberEventMap.forEach((memberEvents, memberId) => {
      for (let i = 0; i < memberEvents.length; i++) {
        for (let j = i + 1; j < memberEvents.length; j++) {
          const event1 = memberEvents[i];
          const event2 = memberEvents[j];
          
          if (areIntervalsOverlapping(
            { start: event1.startDate, end: event1.endDate },
            { start: event2.startDate, end: event2.endDate }
          )) {
            detectedConflicts.push({
              id: `overlap-${event1.id}-${event2.id}`,
              type: 'overlap',
              severity: determineSeverity([event1, event2]),
              affectedEvents: [event1.id, event2.id],
              affectedMembers: [memberId],
              description: `${event1.title} overlaps with ${event2.title}`,
              suggestedResolutions: generateOverlapResolutions(event1, event2)
            });
          }
        }
      }
    });
    
    // 2. Detect workload overload
    memberSchedules.forEach(schedule => {
      if (schedule.workload > 90) {
        const overloadEvents = schedule.events.filter(e => 
          e.startDate >= new Date()
        );
        
        if (overloadEvents.length > 0) {
          detectedConflicts.push({
            id: `overload-${schedule.memberId}`,
            type: 'overload',
            severity: schedule.workload > 100 ? 'high' : 'medium',
            affectedEvents: overloadEvents.map(e => e.id),
            affectedMembers: [schedule.memberId],
            description: `${schedule.memberName} is overloaded at ${schedule.workload}%`,
            suggestedResolutions: generateOverloadResolutions(schedule, overloadEvents)
          });
        }
      }
    });
    
    // 3. Detect availability conflicts
    events.forEach(event => {
      event.attendees.forEach(memberId => {
        const schedule = memberSchedules.find(s => s.memberId === memberId);
        if (schedule && (schedule.availability === 'unavailable' || schedule.availability === 'out-of-office')) {
          detectedConflicts.push({
            id: `availability-${event.id}-${memberId}`,
            type: 'availability',
            severity: event.priority === 'critical' ? 'high' : 'medium',
            affectedEvents: [event.id],
            affectedMembers: [memberId],
            description: `${schedule.memberName} is ${schedule.availability} during ${event.title}`,
            suggestedResolutions: generateAvailabilityResolutions(event, schedule)
          });
        }
      });
    });
    
    return detectedConflicts;
  }, [events, memberSchedules, autoDetect]);
  
  const conflictStats = useMemo(() => ({
    total: conflicts.length,
    byType: {
      overlap: conflicts.filter(c => c.type === 'overlap').length,
      overload: conflicts.filter(c => c.type === 'overload').length,
      availability: conflicts.filter(c => c.type === 'availability').length,
      dependency: conflicts.filter(c => c.type === 'dependency').length
    },
    bySeverity: {
      low: conflicts.filter(c => c.severity === 'low').length,
      medium: conflicts.filter(c => c.severity === 'medium').length,
      high: conflicts.filter(c => c.severity === 'high').length
    },
    hasConflicts: conflicts.length > 0,
    criticalConflicts: conflicts.filter(c => c.severity === 'high')
  }), [conflicts]);
  
  const getEventConflicts = (eventId: string) => {
    return conflicts.filter(c => c.affectedEvents.includes(eventId));
  };
  
  const getMemberConflicts = (memberId: string) => {
    return conflicts.filter(c => c.affectedMembers.includes(memberId));
  };
  
  const resolveConflict = (conflictId: string, resolutionId: string) => {
    const conflict = conflicts.find(c => c.id === conflictId);
    if (!conflict) return null;
    
    const resolution = conflict.suggestedResolutions.find(r => r.id === resolutionId);
    if (!resolution) return null;
    
    // Return the resolution for the caller to apply
    return resolution;
  };
  
  return {
    conflicts,
    conflictStats,
    getEventConflicts,
    getMemberConflicts,
    resolveConflict,
    hasConflicts: conflicts.length > 0
  };
}

function determineSeverity(events: CalendarEvent[]): ConflictSeverity {
  const hasCritical = events.some(e => e.priority === 'critical');
  const hasHigh = events.some(e => e.priority === 'high');
  
  if (hasCritical) return 'high';
  if (hasHigh) return 'medium';
  return 'low';
}

function generateOverlapResolutions(event1: CalendarEvent, event2: CalendarEvent): Resolution[] {
  return [
    {
      id: `reschedule-${event1.id}`,
      description: `Reschedule "${event1.title}" to after "${event2.title}"`,
      action: 'reschedule',
      targetDate: event2.endDate,
      autoApplicable: event1.priority !== 'critical'
    },
    {
      id: `reschedule-${event2.id}`,
      description: `Reschedule "${event2.title}" to after "${event1.title}"`,
      action: 'reschedule',
      targetDate: event1.endDate,
      autoApplicable: event2.priority !== 'critical'
    },
    {
      id: `cancel-${event1.id}`,
      description: `Cancel "${event1.title}"`,
      action: 'cancel',
      autoApplicable: false
    }
  ];
}

function generateOverloadResolutions(schedule: MemberSchedule, events: CalendarEvent[]): Resolution[] {
  const resolutions: Resolution[] = [];
  
  // Suggest reassigning lower priority events
  const reassignableEvents = events.filter(e => e.priority !== 'critical');
  reassignableEvents.forEach(event => {
    resolutions.push({
      id: `reassign-${event.id}`,
      description: `Reassign "${event.title}" to another team member`,
      action: 'reassign',
      autoApplicable: false
    });
  });
  
  // Suggest extending deadlines
  resolutions.push({
    id: `extend-workload`,
    description: `Extend deadlines to balance workload`,
    action: 'extend',
    autoApplicable: false
  });
  
  return resolutions;
}

function generateAvailabilityResolutions(event: CalendarEvent, schedule: MemberSchedule): Resolution[] {
  return [
    {
      id: `remove-${schedule.memberId}`,
      description: `Remove ${schedule.memberName} from "${event.title}"`,
      action: 'reassign',
      autoApplicable: false
    },
    {
      id: `reschedule-${event.id}`,
      description: `Reschedule "${event.title}" when ${schedule.memberName} is available`,
      action: 'reschedule',
      autoApplicable: false
    }
  ];
}


