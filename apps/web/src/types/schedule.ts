// @epic-3.4-teams: Comprehensive schedule types for team calendar
// @epic-1.2-gantt: Timeline and dependency visualization
// @persona-david: Team Lead workload management
// @persona-sarah: PM sprint planning

export type EventType = 'meeting' | 'deadline' | 'time-off' | 'workload' | 'milestone' | 'focus-time' | 'break';
export type EventPriority = 'low' | 'medium' | 'high' | 'critical';
export type ConflictSeverity = 'low' | 'medium' | 'high';
export type ConflictType = 'overlap' | 'overload' | 'availability' | 'dependency';
export type CalendarViewMode = 'day' | 'week' | 'month' | 'timeline' | 'heatmap' | 'agenda';
export type MemberAvailability = 'available' | 'busy' | 'meeting' | 'focused' | 'unavailable' | 'out-of-office';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  type: EventType;
  priority: EventPriority;
  
  // Timing
  date?: string; // ISO date string (legacy/API compatibility)
  startDate: Date;
  endDate: Date;
  startTime?: string;
  endTime?: string;
  duration?: string;
  isAllDay?: boolean;
  isRecurring?: boolean;
  recurrenceRule?: string;
  
  // Participants
  organizerId?: string;
  attendees: string[];
  requiredAttendees?: string[];
  optionalAttendees?: string[];
  
  // Team/Project context
  teamId?: string;
  teamName?: string;
  projectId?: string;
  projectName?: string;
  taskId?: string;
  
  // Metadata
  color?: string;
  location?: string;
  meetingLink?: string;
  estimatedHours?: number;
  actualHours?: number;
  source?: 'task' | 'milestone' | 'calendar'; // Event source type
  
  // Status
  status?: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  hasConflict?: boolean;
  conflicts?: ScheduleConflict[];
  
  // Permissions
  canEdit?: boolean;
  canDelete?: boolean;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ScheduleConflict {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  affectedEvents: string[];
  affectedMembers: string[];
  description: string;
  suggestedResolutions: Resolution[];
}

export interface Resolution {
  id: string;
  description: string;
  action: 'reschedule' | 'reassign' | 'split' | 'cancel' | 'extend';
  targetDate?: Date;
  targetMember?: string;
  autoApplicable: boolean;
}

export interface MemberSchedule {
  memberId: string;
  memberName: string;
  memberEmail: string;
  role: string;
  avatar?: string;
  
  // Availability
  availability: MemberAvailability;
  status: 'online' | 'away' | 'busy' | 'offline';
  currentActivity?: string;
  
  // Workload
  workload: number; // percentage
  hoursScheduled: number;
  hoursAvailable: number;
  tasksCount: number;
  
  // Schedule slots
  events: CalendarEvent[];
  blockedSlots: TimeSlot[];
  availableSlots: TimeSlot[];
  
  // Working hours
  workingHours: WorkingHours;
  timezone?: string;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  duration: number; // minutes
  type: 'available' | 'blocked' | 'meeting' | 'focus' | 'break';
  eventId?: string;
}

export interface WorkingHours {
  monday: { start: string; end: string; enabled: boolean };
  tuesday: { start: string; end: string; enabled: boolean };
  wednesday: { start: string; end: string; enabled: boolean };
  thursday: { start: string; end: string; enabled: boolean };
  friday: { start: string; end: string; enabled: boolean };
  saturday: { start: string; end: string; enabled: boolean };
  sunday: { start: string; end: string; enabled: boolean };
}

export interface WorkloadMetrics {
  teamId: string;
  teamName: string;
  
  // Overall metrics
  averageWorkload: number;
  totalHoursScheduled: number;
  totalHoursAvailable: number;
  utilizationRate: number;
  
  // Member breakdown
  memberMetrics: MemberWorkloadMetric[];
  
  // Time-based analysis
  weeklyForecast: WeeklyForecast[];
  overloadedPeriods: DateRange[];
  underutilizedPeriods: DateRange[];
  
  // Health indicators
  healthScore: number;
  balanceScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  warnings: string[];
}

export interface MemberWorkloadMetric {
  memberId: string;
  memberName: string;
  currentWorkload: number;
  projectedWorkload: number;
  hoursThisWeek: number;
  hoursNextWeek: number;
  tasksCount: number;
  isOverloaded: boolean;
  isUnderutilized: boolean;
}

export interface WeeklyForecast {
  weekNumber: number;
  weekStart: Date;
  weekEnd: Date;
  totalEvents: number;
  totalHours: number;
  workloadPercentage: number;
  memberBreakdown: {
    memberId: string;
    memberName: string;
    hours: number;
    workload: number;
  }[];
}

export interface DateRange {
  start: Date;
  end: Date;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface SmartSuggestion {
  id: string;
  type: 'best-time' | 'load-balance' | 'break-reminder' | 'deadline-risk' | 'resource-conflict';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  suggestedDate?: Date;
  suggestedTime?: string;
  affectedMembers: string[];
  confidence: number; // 0-100
  reasoning: string;
  action?: () => void;
}

export interface CalendarFilters {
  eventTypes: EventType[];
  priorities: EventPriority[];
  members: string[];
  teams: string[];
  projects: string[];
  dateRange?: DateRange;
  showConflicts?: boolean;
  showRecurring?: boolean;
}

export interface DragDropContext {
  draggedEvent: CalendarEvent | null;
  targetDate: Date | null;
  targetMember: string | null;
  isValidDrop: boolean;
  conflicts: ScheduleConflict[];
}

export interface CalendarSettings {
  workingHoursStart: string;
  workingHoursEnd: string;
  defaultEventDuration: number; // minutes
  autoDetectConflicts: boolean;
  showWeekends: boolean;
  firstDayOfWeek: 0 | 1; // 0 = Sunday, 1 = Monday
  timeFormat: '12h' | '24h';
  notifications: {
    beforeMeeting: number; // minutes
    onConflict: boolean;
    onOverload: boolean;
  };
  integrations: {
    googleCalendar: boolean;
    outlook: boolean;
    slack: boolean;
  };
}

export interface HeatmapData {
  date: Date;
  value: number; // workload percentage or hours
  level: 'none' | 'low' | 'medium' | 'high' | 'critical';
  events: CalendarEvent[];
  tooltip: string;
}

export interface TimelineEntry {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  progress: number; // 0-100
  dependencies: string[];
  assignees: string[];
  color: string;
  type: 'task' | 'milestone' | 'phase';
  canDrag: boolean;
  canResize: boolean;
}

