// @epic-3.4-teams: Event creation modal for team calendar
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, Tag, Repeat, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useCreateEvent } from "@/hooks/mutations/calendar/use-create-event";
import useWorkspaceStore from "@/store/workspace";

interface CreateEventModalProps {
  open: boolean;
  onClose: () => void;
  onCreateEvent: (eventData: EventFormData) => void;
  selectedTeam?: Team | null;
  selectedDate?: Date;
}

interface EventFormData {
  title: string;
  description: string;
  type: 'meeting' | 'deadline' | 'time-off' | 'workload' | 'milestone';
  date: string;
  time: string;
  duration: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  attendees: string[];
  estimatedHours: number;
  recurring: 'none' | 'daily' | 'weekly' | 'monthly';
  reminderMinutes: number;
}

interface Team {
  id: string;
  name: string;
  members: any[];
}

const eventTypes = [
  { value: 'meeting', label: 'Meeting', icon: Users, color: 'bg-blue-500' },
  { value: 'deadline', label: 'Deadline', icon: AlertCircle, color: 'bg-red-500' },
  { value: 'time-off', label: 'Time Off', icon: Calendar, color: 'bg-green-500' },
  { value: 'workload', label: 'Workload', icon: Clock, color: 'bg-orange-500' },
  { value: 'milestone', label: 'Milestone', icon: Tag, color: 'bg-purple-500' },
];

const priorityOptions = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800' },
];

const recurringTypes = [
  { value: 'none', label: 'No Repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom...' },
];

export default function CreateEventModal({
  open,
  onClose,
  onCreateEvent,
  selectedTeam,
  selectedDate,
}: CreateEventModalProps) {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const createEvent = useCreateEvent();
  
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    type: 'meeting',
    date: selectedDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
    time: '09:00',
    duration: '60',
    priority: 'medium',
    attendees: [],
    estimatedHours: 1,
    recurring: 'none',
    reminderMinutes: 15,
  });

  const [recurringOptions, setRecurringOptions] = useState({
    endDate: '',
    occurrences: 10,
    interval: 1,
    weekdays: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (!formData.time) {
      newErrors.time = 'Time is required';
    }

    if (formData.estimatedHours <= 0) {
      newErrors.estimatedHours = 'Estimated hours must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!selectedTeam?.id || !workspace?.id) {
      console.error('Missing team or workspace ID');
      return;
    }

    try {
      // Prepare event data
      const startDateTime = new Date(`${formData.date}T${formData.time}`);
      const endDateTime = new Date(startDateTime.getTime() + parseInt(formData.duration) * 60000);

      const eventData = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        allDay: false,
        teamId: selectedTeam.id,
        workspaceId: workspace.id,
        priority: formData.priority,
        estimatedHours: formData.estimatedHours,
        attendees: formData.attendees,
        reminderMinutes: formData.reminderMinutes,
        isRecurring: formData.recurring !== 'none',
        recurringPattern: formData.recurring !== 'none' ? {
          frequency: formData.recurring,
          interval: recurringOptions.interval,
          endDate: recurringOptions.endDate || undefined,
          occurrences: recurringOptions.occurrences,
          weekdays: recurringOptions.weekdays.map(Number),
        } : undefined,
      };

      // Call the API
      await createEvent.mutateAsync({
        teamId: selectedTeam.id,
        data: eventData,
      });

      // Call the parent handler (for any additional logic)
      onCreateEvent?.(formData);
      
      // Close modal
      onClose();
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        type: 'meeting',
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        duration: '60',
        priority: 'medium',
        attendees: [],
        estimatedHours: 1,
        recurring: 'none',
        reminderMinutes: 15,
      });
      setErrors({});
    } catch (error) {
      console.error('Failed to create event:', error);
      // Error is already handled by the mutation hook with toast
    }
  };

  const handleAttendeeAdd = (attendee: string) => {
    if (attendee && !formData.attendees.includes(attendee)) {
      setFormData(prev => ({
        ...prev,
        attendees: [...prev.attendees, attendee]
      }));
    }
  };

  const handleAttendeeRemove = (attendee: string) => {
    setFormData(prev => ({
      ...prev,
      attendees: prev.attendees.filter(a => a !== attendee)
    }));
  };

  const selectedEventType = eventTypes.find(type => type.value === formData.type);
  const selectedPriority = priorityOptions.find(p => p.value === formData.priority);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Create New Event</span>
          </DialogTitle>
          <DialogDescription>
            Schedule a new event for {selectedTeam?.name || 'your team'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm">Basic Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter event title..."
                className={cn(errors.title && "border-red-500")}
              />
              {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Add event description..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Event Type *</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((type) => {
                      const IconComponent = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center space-x-2">
                            <div className={cn("w-3 h-3 rounded-full", type.color)} />
                            <IconComponent className="h-4 w-4" />
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority *</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((priority) => (
                      <SelectItem key={priority.value} value={priority.value}>
                        <Badge className={priority.color}>{priority.label}</Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Date and Time */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm">Date & Time</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className={cn(errors.date && "border-red-500")}
                />
                {errors.date && <p className="text-sm text-red-500">{errors.date}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Time *</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  className={cn(errors.time && "border-red-500")}
                />
                {errors.time && <p className="text-sm text-red-500">{errors.time}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                  placeholder="60"
                  min="15"
                  step="15"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimatedHours">Estimated Hours</Label>
                <Input
                  id="estimatedHours"
                  type="number"
                  value={formData.estimatedHours}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimatedHours: Number(e.target.value) }))}
                  placeholder="1"
                  min="0.5"
                  step="0.5"
                  className={cn(errors.estimatedHours && "border-red-500")}
                />
                {errors.estimatedHours && <p className="text-sm text-red-500">{errors.estimatedHours}</p>}
              </div>

              <div className="space-y-2">
                <Label>Recurring</Label>
                <Select 
                  value={formData.recurring} 
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, recurring: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {recurringTypes.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center space-x-2">
                          <Repeat className="h-4 w-4" />
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Recurring Event Options */}
            {formData.recurring !== 'none' && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h4 className="font-medium text-sm">Recurring Event Options</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="recurring-end-date">End Date (optional)</Label>
                    <Input
                      id="recurring-end-date"
                      type="date"
                      value={recurringOptions.endDate}
                      onChange={(e) => setRecurringOptions(prev => ({ ...prev, endDate: e.target.value }))}
                      min={formData.date}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recurring-occurrences">Number of Occurrences</Label>
                    <Input
                      id="recurring-occurrences"
                      type="number"
                      value={recurringOptions.occurrences}
                      onChange={(e) => setRecurringOptions(prev => ({ ...prev, occurrences: Number(e.target.value) }))}
                      min="1"
                      max="365"
                    />
                  </div>
                </div>

                {formData.recurring === 'weekly' && (
                  <div className="space-y-2">
                    <Label>Repeat on Days</Label>
                    <div className="flex flex-wrap gap-2">
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                        <label key={day} className="flex items-center space-x-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={recurringOptions.weekdays.includes(day)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setRecurringOptions(prev => ({ 
                                  ...prev, 
                                  weekdays: [...prev.weekdays, day] 
                                }));
                              } else {
                                setRecurringOptions(prev => ({ 
                                  ...prev, 
                                  weekdays: prev.weekdays.filter(d => d !== day) 
                                }));
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm">{day.substring(0, 3)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {formData.recurring === 'custom' && (
                  <div className="space-y-2">
                    <Label htmlFor="recurring-interval">Repeat every</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="recurring-interval"
                        type="number"
                        value={recurringOptions.interval}
                        onChange={(e) => setRecurringOptions(prev => ({ ...prev, interval: Number(e.target.value) }))}
                        min="1"
                        max="30"
                        className="w-20"
                      />
                      <Select defaultValue="days">
                        <SelectTrigger className="w-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="days">day(s)</SelectItem>
                          <SelectItem value="weeks">week(s)</SelectItem>
                          <SelectItem value="months">month(s)</SelectItem>
                          <SelectItem value="years">year(s)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="text-sm text-muted-foreground p-2 bg-background rounded">
                  <strong>Preview:</strong> {formData.recurring === 'none' ? 'Single event' : 
                    `Repeats ${formData.recurring}${
                      recurringOptions.endDate ? ` until ${new Date(recurringOptions.endDate).toLocaleDateString()}` :
                      ` for ${recurringOptions.occurrences} occurrences`
                    }`
                  }
                </div>
              </div>
            )}
          </div>

          {/* Attendees */}
          {selectedTeam && (
            <div className="space-y-4">
              <h3 className="font-medium text-sm">Attendees</h3>
              
              <div className="space-y-2">
                <Label>Team Members</Label>
                <div className="space-y-2">
                  {selectedTeam.members.map((member) => (
                    <div key={member.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`member-${member.id}`}
                        checked={formData.attendees.includes(member.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleAttendeeAdd(member.id);
                          } else {
                            handleAttendeeRemove(member.id);
                          }
                        }}
                        className="rounded"
                      />
                      <Label htmlFor={`member-${member.id}`} className="font-normal">
                        {member.name} ({member.role})
                      </Label>
                    </div>
                  ))}
                </div>

                {formData.attendees.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.attendees.map((attendeeId) => {
                      const member = selectedTeam.members.find(m => m.id === attendeeId);
                      return (
                        <Badge 
                          key={attendeeId} 
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => handleAttendeeRemove(attendeeId)}
                        >
                          {member?.name || attendeeId} ×
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reminder */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm">Reminder</h3>
            
            <div className="space-y-2">
              <Label htmlFor="reminder">Remind me</Label>
              <Select 
                value={formData.reminderMinutes.toString()} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, reminderMinutes: Number(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No reminder</SelectItem>
                  <SelectItem value="5">5 minutes before</SelectItem>
                  <SelectItem value="15">15 minutes before</SelectItem>
                  <SelectItem value="30">30 minutes before</SelectItem>
                  <SelectItem value="60">1 hour before</SelectItem>
                  <SelectItem value="1440">1 day before</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={createEvent.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={createEvent.isPending}>
              {createEvent.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {createEvent.isPending ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}