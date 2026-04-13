// @epic-3.4-teams: Event details modal with edit/delete actions
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Video, 
  Users, 
  AlertCircle,
  Edit,
  Trash2,
  Loader2,
  ExternalLink
} from "lucide-react";
import { useGetEvent } from "@/hooks/queries/calendar/use-get-event";
import { useDeleteEvent } from "@/hooks/mutations/calendar/use-delete-event";
import { format } from "date-fns";
import { cn } from "@/lib/cn";
import { useState } from "react";

interface EventDetailsModalProps {
  open: boolean;
  onClose: () => void;
  eventId: string;
  onEdit?: (eventId: string) => void;
}

const eventTypeColors = {
  meeting: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  deadline: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  'time-off': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  workload: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  milestone: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

const priorityColors = {
  low: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const statusColors = {
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  'in-progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

export default function EventDetailsModal({ 
  open, 
  onClose, 
  eventId,
  onEdit 
}: EventDetailsModalProps) {
  const { data, isLoading, error } = useGetEvent(eventId, { enabled: open });
  const deleteEvent = useDeleteEvent();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const event = data?.event;

  const handleDelete = async () => {
    try {
      await deleteEvent.mutateAsync(eventId);
      onClose();
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const handleEdit = () => {
    onEdit?.(eventId);
    onClose();
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Loading Event</DialogTitle>
            <DialogDescription>Please wait while we load the event details...</DialogDescription>
          </DialogHeader>
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>Unable to load event details</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <p className="text-sm text-muted-foreground">Failed to load event details</p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl">{event.title}</DialogTitle>
              <DialogDescription className="mt-2">
                Event details and information
              </DialogDescription>
            </div>
            <div className="flex space-x-2">
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEdit}
                  disabled={deleteEvent.isPending}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleteEvent.isPending}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status and Type Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge className={cn(eventTypeColors[event.type as keyof typeof eventTypeColors] || eventTypeColors.other)}>
              {event.type}
            </Badge>
            <Badge className={cn(statusColors[event.status as keyof typeof statusColors] || statusColors.scheduled)}>
              {event.status}
            </Badge>
            <Badge className={cn(priorityColors[event.priority as keyof typeof priorityColors] || priorityColors.medium)}>
              {event.priority} priority
            </Badge>
            {event.isRecurring && (
              <Badge variant="outline">Recurring</Badge>
            )}
          </div>

          <Separator />

          {/* Description */}
          {event.description && (
            <div>
              <h4 className="text-sm font-medium mb-2">Description</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {/* Date & Time */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Schedule</h4>
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>{format(new Date(event.startTime), 'EEEE, MMMM d, yyyy')}</span>
              </div>
              <div className="flex items-center text-sm">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>
                  {format(new Date(event.startTime), 'h:mm a')}
                  {event.endTime && ` - ${format(new Date(event.endTime), 'h:mm a')}`}
                </span>
              </div>
              {event.allDay && (
                <Badge variant="secondary" className="text-xs">All Day Event</Badge>
              )}
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Location</h4>
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mr-2" />
                <span>{event.location}</span>
              </div>
            </div>
          )}

          {/* Meeting Link */}
          {event.meetingLink && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Meeting Link</h4>
              <div className="flex items-center text-sm">
                <Video className="h-4 w-4 mr-2 text-muted-foreground" />
                <a 
                  href={event.meetingLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center"
                >
                  Join Meeting
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </div>
            </div>
          )}

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Attendees ({event.attendees.length})</h4>
              <div className="flex items-center text-sm text-muted-foreground">
                <Users className="h-4 w-4 mr-2" />
                <span>
                  {event.attendees.length} {event.attendees.length === 1 ? 'attendee' : 'attendees'}
                </span>
              </div>
            </div>
          )}

          {/* Estimated Hours */}
          {event.estimatedHours && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Time Estimate</h4>
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="h-4 w-4 mr-2" />
                <span>{event.estimatedHours} {event.estimatedHours === 1 ? 'hour' : 'hours'}</span>
              </div>
            </div>
          )}

          {/* Recurring Pattern */}
          {event.isRecurring && event.recurringPattern && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Recurring Pattern</h4>
              <p className="text-sm text-muted-foreground">
                Repeats {event.recurringPattern.frequency}
                {event.recurringPattern.interval > 1 && ` every ${event.recurringPattern.interval} times`}
              </p>
            </div>
          )}

          <Separator />

          {/* Metadata */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Created: {format(new Date(event.createdAt), 'PPpp')}</p>
            {event.updatedAt && event.updatedAt !== event.createdAt && (
              <p>Last updated: {format(new Date(event.updatedAt), 'PPpp')}</p>
            )}
          </div>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4 space-y-3">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">Delete this event?</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This action cannot be undone. The event will be permanently deleted.
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteEvent.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleteEvent.isPending}
              >
                {deleteEvent.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {deleteEvent.isPending ? 'Deleting...' : 'Delete Event'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

