// @epic-3.4-teams: AI-powered smart scheduling suggestions
// @persona-sarah: PM sprint planning with intelligent recommendations
import { useMemo } from 'react';
import { addDays, addHours, isWithinInterval, startOfDay, endOfDay, format } from 'date-fns';
import type { CalendarEvent, MemberSchedule, SmartSuggestion } from '@/types/schedule';

interface UseSmartSchedulingOptions {
  events: CalendarEvent[];
  memberSchedules: MemberSchedule[];
  teamSize: number;
}

export function useSmartScheduling({
  events,
  memberSchedules,
  teamSize
}: UseSmartSchedulingOptions) {
  
  const suggestions = useMemo(() => {
    const smartSuggestions: SmartSuggestion[] = [];
    
    // 1. Find best meeting times
    const bestMeetingTimes = findBestMeetingTimes(memberSchedules);
    bestMeetingTimes.forEach((time, index) => {
      smartSuggestions.push({
        id: `best-time-${index}`,
        type: 'best-time',
        priority: 'medium',
        title: 'Optimal Meeting Time',
        description: `${format(time.date, 'EEEE, MMMM d')} at ${time.time} - ${time.availableCount}/${teamSize} members available`,
        suggestedDate: time.date,
        suggestedTime: time.time,
        affectedMembers: time.availableMembers,
        confidence: (time.availableCount / teamSize) * 100,
        reasoning: `Based on team availability and workload patterns. ${time.availableCount} out of ${teamSize} members are free with optimal energy levels.`
      });
    });
    
    // 2. Detect workload imbalance
    const imbalances = detectWorkloadImbalance(memberSchedules);
    imbalances.forEach((imbalance, index) => {
      smartSuggestions.push({
        id: `balance-${index}`,
        type: 'load-balance',
        priority: imbalance.severity === 'high' ? 'high' : 'medium',
        title: 'Workload Imbalance Detected',
        description: imbalance.description,
        affectedMembers: [imbalance.overloadedMember, imbalance.underutilizedMember],
        confidence: 85,
        reasoning: imbalance.reasoning
      });
    });
    
    // 3. Break reminders for overworked members
    memberSchedules.forEach(schedule => {
      if (schedule.workload > 85 && schedule.hoursScheduled > 6) {
        const breakSuggestion = findBreakTime(schedule);
        if (breakSuggestion) {
          smartSuggestions.push({
            id: `break-${schedule.memberId}`,
            type: 'break-reminder',
            priority: 'medium',
            title: 'Break Time Recommended',
            description: `${schedule.memberName} has been scheduled for ${schedule.hoursScheduled} hours without a break`,
            suggestedDate: breakSuggestion.date,
            suggestedTime: breakSuggestion.time,
            affectedMembers: [schedule.memberId],
            confidence: 90,
            reasoning: 'Continuous work without breaks leads to decreased productivity and increased burnout risk.'
          });
        }
      }
    });
    
    // 4. Deadline risk warnings
    const upcomingDeadlines = events.filter(e => 
      e.type === 'deadline' && 
      e.startDate > new Date() && 
      e.startDate <= addDays(new Date(), 7)
    );
    
    upcomingDeadlines.forEach(deadline => {
      const assignees = memberSchedules.filter(s => 
        deadline.attendees.includes(s.memberId)
      );
      
      const highWorkloadAssignees = assignees.filter(a => a.workload > 80);
      if (highWorkloadAssignees.length > 0) {
        smartSuggestions.push({
          id: `deadline-risk-${deadline.id}`,
          type: 'deadline-risk',
          priority: 'high',
          title: 'Deadline Risk',
          description: `"${deadline.title}" deadline approaching with overloaded team members`,
          suggestedDate: deadline.startDate,
          affectedMembers: highWorkloadAssignees.map(a => a.memberId),
          confidence: 75,
          reasoning: `${highWorkloadAssignees.length} assigned members are already at >80% capacity. Consider reassigning or extending the deadline.`
        });
      }
    });
    
    // 5. Resource conflicts
    const resourceConflicts = detectResourceConflicts(events, memberSchedules);
    resourceConflicts.forEach((conflict, index) => {
      smartSuggestions.push({
        id: `resource-${index}`,
        type: 'resource-conflict',
        priority: 'high',
        title: 'Resource Conflict',
        description: conflict.description,
        affectedMembers: conflict.members,
        confidence: 95,
        reasoning: conflict.reasoning
      });
    });
    
    // Sort by priority and confidence
    return smartSuggestions.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      }
      return b.confidence - a.confidence;
    });
  }, [events, memberSchedules, teamSize]);
  
  const suggestionStats = useMemo(() => ({
    total: suggestions.length,
    byType: {
      bestTime: suggestions.filter(s => s.type === 'best-time').length,
      loadBalance: suggestions.filter(s => s.type === 'load-balance').length,
      breakReminder: suggestions.filter(s => s.type === 'break-reminder').length,
      deadlineRisk: suggestions.filter(s => s.type === 'deadline-risk').length,
      resourceConflict: suggestions.filter(s => s.type === 'resource-conflict').length
    },
    highPriority: suggestions.filter(s => s.priority === 'high').length,
    averageConfidence: suggestions.length > 0 
      ? suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length 
      : 0
  }), [suggestions]);
  
  return {
    suggestions,
    suggestionStats,
    hasSuggestions: suggestions.length > 0
  };
}

function findBestMeetingTimes(memberSchedules: MemberSchedule[]) {
  const times: Array<{
    date: Date;
    time: string;
    availableCount: number;
    availableMembers: string[];
  }> = [];
  
  // Check next 7 days
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const checkDate = addDays(new Date(), dayOffset);
    
    // Check common meeting times: 9 AM, 10 AM, 2 PM, 3 PM
    ['09:00', '10:00', '14:00', '15:00'].forEach(timeSlot => {
      const [hours, minutes] = timeSlot.split(':').map(Number);
      const checkDateTime = new Date(checkDate);
      checkDateTime.setHours(hours, minutes, 0, 0);
      
      const availableMembers = memberSchedules.filter(schedule => {
        // Check if member has events at this time
        const hasConflict = schedule.events.some(event => 
          isWithinInterval(checkDateTime, {
            start: event.startDate,
            end: event.endDate
          })
        );
        
        return !hasConflict && schedule.availability === 'available';
      });
      
      if (availableMembers.length > 0) {
        times.push({
          date: checkDateTime,
          time: timeSlot,
          availableCount: availableMembers.length,
          availableMembers: availableMembers.map(m => m.memberId)
        });
      }
    });
  }
  
  // Return top 3 times with most availability
  return times
    .sort((a, b) => b.availableCount - a.availableCount)
    .slice(0, 3);
}

function detectWorkloadImbalance(memberSchedules: MemberSchedule[]) {
  const imbalances: Array<{
    overloadedMember: string;
    underutilizedMember: string;
    severity: 'medium' | 'high';
    description: string;
    reasoning: string;
  }> = [];
  
  const overloaded = memberSchedules.filter(s => s.workload > 85);
  const underutilized = memberSchedules.filter(s => s.workload < 50);
  
  overloaded.forEach(over => {
    const under = underutilized[0]; // Pick first underutilized member
    if (under) {
      imbalances.push({
        overloadedMember: over.memberId,
        underutilizedMember: under.memberId,
        severity: over.workload > 100 ? 'high' : 'medium',
        description: `${over.memberName} is at ${over.workload}% while ${under.memberName} is at ${under.workload}%`,
        reasoning: `Consider redistributing some tasks from ${over.memberName} to ${under.memberName} to balance team workload.`
      });
    }
  });
  
  return imbalances;
}

function findBreakTime(schedule: MemberSchedule) {
  // Find longest gap between events
  const sortedEvents = [...schedule.events].sort((a, b) => 
    a.startDate.getTime() - b.startDate.getTime()
  );
  
  for (let i = 0; i < sortedEvents.length - 1; i++) {
    const gap = sortedEvents[i + 1].startDate.getTime() - sortedEvents[i].endDate.getTime();
    const gapMinutes = gap / (1000 * 60);
    
    if (gapMinutes >= 30) {
      return {
        date: sortedEvents[i].endDate,
        time: format(sortedEvents[i].endDate, 'HH:mm')
      };
    }
  }
  
  return null;
}

function detectResourceConflicts(events: CalendarEvent[], memberSchedules: MemberSchedule[]) {
  const conflicts: Array<{
    description: string;
    members: string[];
    reasoning: string;
  }> = [];
  
  // Check for key members being double-booked
  memberSchedules.forEach(schedule => {
    if (schedule.role.includes('lead') || schedule.role.includes('manager')) {
      const overlappingEvents = schedule.events.filter((e1, i, arr) => 
        arr.some((e2, j) => i !== j && areIntervalsOverlapping(
          { start: e1.startDate, end: e1.endDate },
          { start: e2.startDate, end: e2.endDate }
        ))
      );
      
      if (overlappingEvents.length > 0) {
        conflicts.push({
          description: `Key member ${schedule.memberName} has ${overlappingEvents.length} overlapping commitments`,
          members: [schedule.memberId],
          reasoning: `${schedule.memberName} is a critical resource and should not be double-booked.`
        });
      }
    }
  });
  
  return conflicts;
}

function areIntervalsOverlapping(
  interval1: { start: Date; end: Date },
  interval2: { start: Date; end: Date }
): boolean {
  return interval1.start < interval2.end && interval2.start < interval1.end;
}


