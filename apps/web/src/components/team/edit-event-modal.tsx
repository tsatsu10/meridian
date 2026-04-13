// @epic-3.4-teams: Edit event modal for calendar
import { useState, useEffect } from "react";
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
import { Loader2, AlertCircle } from "lucide-react";
import { useGetEvent } from "@/hooks/queries/calendar/use-get-event";
import { useUpdateEvent } from "@/hooks/mutations/calendar/use-update-event";
import { format } from "date-fns";

interface EditEventModalProps {
  open: boolean;
  onClose: () => void;
  eventId: string;
}

const eventTypes = [
  { value: 'meeting', label: 'Meeting' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'time-off', label: 'Time Off' },
  { value: 'workload', label: 'Workload' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'other', label: 'Other' },
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const statusOptions = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function EditEventModal({
  open,
  onClose,
  eventId,
}: EditEventModalProps) {
  const { data, isLoading: isLoadingEvent, error } = useGetEvent(eventId, { enabled: open });
  const updateEvent = useUpdateEvent();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'meeting',
    status: 'scheduled',
    date: '',
    time: '',
    duration: '60',
    priority: 'medium',
    location: '',
    meetingLink: '',
    estimatedHours: 1,
  });

  const event = data?.event;

  // Populate form when event data is loaded
  useEffect(() => {
    if (event) {
      const startDate = new Date(event.startTime);
      const endDate = event.endTime ? new Date(event.endTime) : null;
      const duration = endDate 
        ? Math.round((endDate.getTime() - startDate.getTime()) / 60000) 
        : 60;

      setFormData({
        title: event.title || '',
        description: event.description || '',
        type: event.type || 'meeting',
        status: event.status || 'scheduled',
        date: format(startDate, 'yyyy-MM-dd'),
        time: format(startDate, 'HH:mm'),
        duration: String(duration),
        priority: event.priority || 'medium',
        location: event.location || '',
        meetingLink: event.meetingLink || '',
        estimatedHours: event.estimatedHours || 1,
      });
    }
  }, [event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      return;
    }

    try {
      const startDateTime = new Date(`${formData.date}T${formData.time}`);
      const endDateTime = new Date(startDateTime.getTime() + parseInt(formData.duration) * 60000);

      await updateEvent.mutateAsync({
        eventId,
        data: {
          title: formData.title,
          description: formData.description,
          type: formData.type as any,
          status: formData.status as any,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          priority: formData.priority as any,
          location: formData.location || undefined,
          meetingLink: formData.meetingLink || undefined,
          estimatedHours: formData.estimatedHours,
        },
      });

      onClose();
    } catch (error) {
      console.error('Failed to update event:', error);
    }
  };

  if (isLoadingEvent) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !event) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <p className="text-sm text-muted-foreground">Failed to load event</p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
          <DialogDescription>
            Update event details and information
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter event title"
              required
            />
          </div>

          {/* Description */}
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

          {/* Type, Status, Priority */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map(priority => (
                    <SelectItem key={priority.value} value={priority.value}>
                      {priority.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (min)</Label>
              <Input
                id="duration"
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                min="15"
                step="15"
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="Physical location or address"
            />
          </div>

          {/* Meeting Link */}
          <div className="space-y-2">
            <Label htmlFor="meetingLink">Meeting Link</Label>
            <Input
              id="meetingLink"
              type="url"
              value={formData.meetingLink}
              onChange={(e) => setFormData(prev => ({ ...prev, meetingLink: e.target.value }))}
              placeholder="https://meet.google.com/..."
            />
          </div>

          {/* Estimated Hours */}
          <div className="space-y-2">
            <Label htmlFor="estimatedHours">Estimated Hours</Label>
            <Input
              id="estimatedHours"
              type="number"
              value={formData.estimatedHours}
              onChange={(e) => setFormData(prev => ({ ...prev, estimatedHours: Number(e.target.value) }))}
              min="0"
              step="0.5"
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={updateEvent.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateEvent.isPending}>
              {updateEvent.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {updateEvent.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

