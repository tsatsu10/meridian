import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  Video,
  AlertTriangle,
  CheckCircle,
  Plus,
  X,
  CalendarDays,
  Timer,
  Mail
} from 'lucide-react';
import { useCalendarIntegration } from '../../hooks/useCalendarIntegration';
import { useMessageParser } from '../../hooks/useMessageParser';

interface MeetingSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  messageId?: string;
  initialParticipants?: string[];
  suggestedTitle?: string;
  suggestedTime?: Date;
  suggestedDuration?: number;
}

interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
  conflicts: string[];
}

interface Participant {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: 'available' | 'busy' | 'tentative' | 'unknown';
  conflicts: string[];
}

export const MeetingSchedulerModal: React.FC<MeetingSchedulerModalProps> = ({
  isOpen,
  onClose,
  chatId,
  messageId,
  initialParticipants = [],
  suggestedTitle,
  suggestedTime,
  suggestedDuration = 30
}) => {
  const [currentStep, setCurrentStep] = useState<'details' | 'scheduling' | 'confirmation'>('details');
  const [title, setTitle] = useState(suggestedTitle || '');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(suggestedDuration);
  const [location, setLocation] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(suggestedTime || new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [meetingLink, setMeetingLink] = useState('');
  const [schedulingConflicts, setSchedulingConflicts] = useState<any[]>([]);

  const {
    scheduleMeetingFromChat,
    findAvailableSlots,
    checkSchedulingConflicts,
    templates,
    isLoading: calendarLoading
  } = useCalendarIntegration();

  const { parseMessageForMeetingData } = useMessageParser();

  // Initialize participants
  useEffect(() => {
    if (initialParticipants.length > 0) {
      const mockParticipants: Participant[] = initialParticipants.map((id, index) => ({
        id,
        name: `User ${index + 1}`,
        email: `user${index + 1}@meridian.app`,
        status: 'unknown',
        conflicts: []
      }));
      setParticipants(mockParticipants);
    }
  }, [initialParticipants]);

  // Load available time slots when date or participants change
  useEffect(() => {
    if (selectedDate && participants.length > 0 && currentStep === 'scheduling') {
      loadAvailableSlots();
    }
  }, [selectedDate, participants, duration, currentStep]);

  const loadAvailableSlots = async () => {
    try {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(8, 0, 0, 0); // Start at 8 AM
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(18, 0, 0, 0); // End at 6 PM

      const slots = await findAvailableSlots(
        participants.map(p => p.id),
        duration,
        startOfDay,
        endOfDay,
        20
      );

      const timeSlots: TimeSlot[] = slots.map(slot => ({
        start: slot.start,
        end: slot.end,
        available: slot.conflictLevel === 'free',
        conflicts: slot.conflictLevel !== 'free' ? ['Conflict detected'] : []
      }));

      setAvailableSlots(timeSlots);
    } catch (error) {
      console.error('Failed to load available slots:', error);
    }
  };

  const handleAddParticipant = (email: string) => {
    if (email && !participants.find(p => p.email === email)) {
      const newParticipant: Participant = {
        id: `user_${Date.now()}`,
        name: email.split('@')[0],
        email,
        status: 'unknown',
        conflicts: []
      };
      setParticipants([...participants, newParticipant]);
    }
  };

  const handleRemoveParticipant = (participantId: string) => {
    setParticipants(participants.filter(p => p.id !== participantId));
  };

  const handleTimeSlotSelect = async (slot: TimeSlot) => {
    setSelectedTimeSlot(slot);
    
    // Check for conflicts
    try {
      const eventData = {
        title,
        description,
        startTime: slot.start,
        endTime: slot.end,
        attendees: participants.map(p => ({
          email: p.email,
          name: p.name,
          userId: p.id,
          status: 'needsAction' as const,
          optional: false
        })),
        status: 'tentative' as const,
        visibility: 'public' as const,
        reminders: [{ method: 'popup' as const, minutes: 15 }],
        source: 'meridian' as const,
        metadata: { chatId, messageId }
      };

      const conflicts = await checkSchedulingConflicts({
        ...eventData,
        id: 'temp',
        organizer: participants[0] || { email: '', name: '', status: 'accepted', optional: false }
      });

      setSchedulingConflicts(conflicts);
    } catch (error) {
      console.error('Failed to check conflicts:', error);
    }
  };

  const handleGenerateMeetingLink = async () => {
    setIsGeneratingLink(true);
    try {
      // Mock meeting link generation
      await new Promise(resolve => setTimeout(resolve, 1000));
      const meetingId = Math.random().toString(36).substr(2, 11);
      setMeetingLink(`https://meridian.com/meet/${meetingId}`);
    } catch (error) {
      console.error('Failed to generate meeting link:', error);
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleScheduleMeeting = async () => {
    if (!selectedTimeSlot) return;

    try {
      await scheduleMeetingFromChat({
        chatId,
        messageId: messageId || '',
        participants: participants.map(p => p.id),
        suggestedTime: selectedTimeSlot.start,
        duration,
        title,
        description
      });

      // Move to confirmation step
      setCurrentStep('confirmation');
    } catch (error) {
      console.error('Failed to schedule meeting:', error);
    }
  };

  const handleApplyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setTitle(template.name);
      setDescription(template.description || '');
      setDuration(template.duration);
      setLocation(template.location || '');
    }
  };

  const formatTimeSlot = (slot: TimeSlot) => {
    return `${slot.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${slot.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const canProceedToScheduling = title.trim() && participants.length > 0;
  const canSchedule = selectedTimeSlot && !schedulingConflicts.some(c => c.severity === 'error');

  const renderDetailsStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Meeting Title *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter meeting title"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="duration">Duration (minutes)</Label>
          <Select value={duration.toString()} onValueChange={(value) => setDuration(parseInt(value))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="45">45 minutes</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
              <SelectItem value="90">1.5 hours</SelectItem>
              <SelectItem value="120">2 hours</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add meeting agenda or description"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Conference room or online meeting link"
        />
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={handleGenerateMeetingLink}
          disabled={isGeneratingLink}
          className="mt-2"
        >
          <Video className="h-4 w-4 mr-2" />
          {isGeneratingLink ? 'Generating...' : 'Generate Meeting Link'}
        </Button>
        {meetingLink && (
          <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
            Meeting link: <a href={meetingLink} target="_blank" rel="noopener noreferrer">{meetingLink}</a>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <Label>Participants *</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {participants.map((participant) => (
            <Badge key={participant.id} variant="secondary" className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={participant.avatar} />
                <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
              </Avatar>
              {participant.name}
              <button 
                onClick={() => handleRemoveParticipant(participant.id)}
                className="ml-1 hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        
        <div className="flex gap-2">
          <Input 
            placeholder="Enter email address"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddParticipant((e.target as HTMLInputElement).value);
                (e.target as HTMLInputElement).value = '';
              }
            }}
          />
          <Button 
            type="button" 
            variant="outline"
            onClick={(e) => {
              const input = e.currentTarget.previousElementSibling as HTMLInputElement;
              handleAddParticipant(input.value);
              input.value = '';
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {templates.length > 0 && (
        <div className="space-y-2">
          <Label>Quick Templates</Label>
          <div className="flex flex-wrap gap-2">
            {templates.map((template) => (
              <Button
                key={template.id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleApplyTemplate(template.id)}
              >
                {template.name}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderSchedulingStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            <Label>Select Date</Label>
          </div>
          <Input
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            <Label>Meeting Info</Label>
          </div>
          <div className="text-sm space-y-1">
            <div>Duration: {duration} minutes</div>
            <div>Participants: {participants.length}</div>
            <div>Date: {selectedDate.toLocaleDateString()}</div>
          </div>
        </div>
      </div>

      {availableSlots.length > 0 && (
        <div className="space-y-3">
          <Label>Available Time Slots</Label>
          <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
            {availableSlots.map((slot, index) => (
              <Card 
                key={index}
                className={`cursor-pointer transition-colors ${
                  selectedTimeSlot === slot 
                    ? 'border-blue-500 bg-blue-50' 
                    : slot.available 
                      ? 'hover:bg-gray-50' 
                      : 'opacity-50 cursor-not-allowed'
                }`}
                onClick={() => slot.available && handleTimeSlotSelect(slot)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {formatTimeSlot(slot)}
                      </span>
                    </div>
                    {slot.available ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                    )}
                  </div>
                  {slot.conflicts.length > 0 && (
                    <div className="text-xs text-orange-600 mt-1">
                      {slot.conflicts.join(', ')}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {schedulingConflicts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800 text-sm flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Scheduling Conflicts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {schedulingConflicts.map((conflict, index) => (
                <div key={index} className="text-sm">
                  <div className="font-medium text-orange-800">{conflict.message}</div>
                  {conflict.suggestions && (
                    <ul className="list-disc list-inside text-orange-700 mt-1">
                      {conflict.suggestions.map((suggestion: string, i: number) => (
                        <li key={i}>{suggestion}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderConfirmationStep = () => (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <div className="rounded-full bg-green-100 p-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Meeting Scheduled!</h3>
        <p className="text-gray-600">
          Your meeting has been successfully scheduled and invitations will be sent to all participants.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="text-left">
            <div className="font-medium">{title}</div>
            <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
              <Calendar className="h-4 w-4" />
              {selectedTimeSlot && formatTimeSlot(selectedTimeSlot)} on {selectedDate.toLocaleDateString()}
            </div>
            <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
              <Users className="h-4 w-4" />
              {participants.length} participants
            </div>
            {location && (
              <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                <MapPin className="h-4 w-4" />
                {location}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-center">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button>
          <Mail className="h-4 w-4 mr-2" />
          Send Additional Invites
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Meeting
          </DialogTitle>
        </DialogHeader>

        <Tabs value={currentStep} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details" disabled={currentStep !== 'details' && currentStep !== 'scheduling'}>
              Details
            </TabsTrigger>
            <TabsTrigger value="scheduling" disabled={!canProceedToScheduling}>
              Scheduling
            </TabsTrigger>
            <TabsTrigger value="confirmation" disabled={currentStep !== 'confirmation'}>
              Confirmation
            </TabsTrigger>
          </TabsList>

          <div className="mt-6 max-h-96 overflow-y-auto">
            <TabsContent value="details" className="space-y-0">
              {renderDetailsStep()}
            </TabsContent>

            <TabsContent value="scheduling" className="space-y-0">
              {renderSchedulingStep()}
            </TabsContent>

            <TabsContent value="confirmation" className="space-y-0">
              {renderConfirmationStep()}
            </TabsContent>
          </div>
        </Tabs>

        {currentStep !== 'confirmation' && (
          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            
            <div className="flex gap-2">
              {currentStep === 'scheduling' && (
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep('details')}
                >
                  Back
                </Button>
              )}
              
              {currentStep === 'details' && (
                <Button 
                  onClick={() => setCurrentStep('scheduling')}
                  disabled={!canProceedToScheduling}
                >
                  Next: Choose Time
                </Button>
              )}
              
              {currentStep === 'scheduling' && (
                <Button 
                  onClick={handleScheduleMeeting}
                  disabled={!canSchedule || calendarLoading}
                >
                  {calendarLoading ? 'Scheduling...' : 'Schedule Meeting'}
                </Button>
              )}
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};