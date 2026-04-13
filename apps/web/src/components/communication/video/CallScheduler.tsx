import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  Users, 
  Plus, 
  Bell,
  Repeat,
  Settings,
  Layout
} from 'lucide-react';
import { useCreateCall } from '@/hooks/mutations/call/useCreateCall';
import { useCreateCalendarEvent } from '@/hooks/mutations/calendar/useCreateCalendarEvent';
import { MeetingTemplates } from './MeetingTemplates';

interface CallSchedulerProps {
  organizerId: string;
}

export function CallScheduler({ organizerId }: CallSchedulerProps) {
  const [showTemplates, setShowTemplates] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    participants: [] as string[],
    isRecurring: false,
    recurrencePattern: 'weekly',
    reminders: [] as string[],
    enableRecording: true,
    enableScreenShare: true,
    maxParticipants: 10
  });

  const createCall = useCreateCall();
  const createCalendarEvent = useCreateCalendarEvent();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const callData = {
        title: formData.title,
        description: formData.description,
        organizerId,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        participants: formData.participants,
        roomId: `room-${Date.now()}`,
        calendarEventId: null
      };

      const result = await createCall.mutateAsync(callData);
      
      // Create calendar event if call was created successfully
      if (result && formData.participants.length > 0) {
        await createCalendarEvent.mutateAsync({
          title: formData.title,
          description: formData.description,
          startTime: formData.startTime,
          endTime: formData.endTime,
          attendees: formData.participants,
          callId: result.id
        });
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        participants: [],
        isRecurring: false,
        recurrencePattern: 'weekly',
        reminders: [],
        enableRecording: true,
        enableScreenShare: true,
        maxParticipants: 10
      });

    } catch (error) {
      console.error('Failed to schedule call:', error);
    }
  };

  const handleTemplateSelect = (template: any) => {
    setFormData(prev => ({
      ...prev,
      title: template.name,
      description: template.description,
      maxParticipants: template.maxParticipants,
      enableRecording: template.features.includes('Recording'),
      enableScreenShare: template.features.includes('Screen Sharing')
    }));
    setShowTemplates(false);
  };

  const addParticipant = (email: string) => {
    if (email && !formData.participants.includes(email)) {
      setFormData(prev => ({
        ...prev,
        participants: [...prev.participants, email]
      }));
    }
  };

  const removeParticipant = (email: string) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.filter(p => p !== email)
    }));
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Schedule Video Call
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Template Button */}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowTemplates(true)}
                className="flex items-center gap-2"
              >
                <Layout className="w-4 h-4" />
                Use Template
              </Button>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Meeting Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter meeting title"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="max-participants">Max Participants</Label>
                <Input
                  id="max-participants"
                  type="number"
                  min="2"
                  max="20"
                  value={formData.maxParticipants}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Meeting description"
                rows={3}
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time">Start Time</Label>
                <Input
                  id="start-time"
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="end-time">End Time</Label>
                <Input
                  id="end-time"
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                  required
                />
              </div>
            </div>

            {/* Participants */}
            <div className="space-y-2">
              <Label>Participants</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter email address"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const input = e.target as HTMLInputElement;
                      addParticipant(input.value);
                      input.value = '';
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const input = document.querySelector('input[placeholder="Enter email address"]') as HTMLInputElement;
                    if (input) {
                      addParticipant(input.value);
                      input.value = '';
                    }
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              {formData.participants.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.participants.map((email, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {email}
                      <button
                        type="button"
                        onClick={() => removeParticipant(email)}
                        className="ml-1 hover:text-red-500"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Features */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Meeting Features</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="recording"
                    checked={formData.enableRecording}
                    onChange={(e) => setFormData(prev => ({ ...prev, enableRecording: e.target.checked }))}
                  />
                  <Label htmlFor="recording">Enable Recording</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="screen-share"
                    checked={formData.enableScreenShare}
                    onChange={(e) => setFormData(prev => ({ ...prev, enableScreenShare: e.target.checked }))}
                  />
                  <Label htmlFor="screen-share">Enable Screen Sharing</Label>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button type="submit" disabled={createCall.isPending}>
                {createCall.isPending ? 'Scheduling...' : 'Schedule Call'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Meeting Templates Modal */}
      {showTemplates && (
        <MeetingTemplates
          onSelectTemplate={handleTemplateSelect}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </>
  );
} 