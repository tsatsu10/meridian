import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { 
  Clock, 
  Calendar as CalendarIcon, 
  Send,
  X,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { toast } from '@/lib/toast';
import { logger } from "../../lib/logger";

export interface ScheduledMessage {
  id: string;
  scheduledFor: Date;
  content: string;
  recipients: any[];
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled';
}

interface MessageSchedulerProps {
  onSchedule: (scheduledFor: Date) => void;
  trigger?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

const QUICK_SCHEDULE_OPTIONS = [
  { label: 'In 1 hour', getValue: () => new Date(Date.now() + 60 * 60 * 1000) },
  { label: 'Tomorrow 9 AM', getValue: () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  }},
  { label: 'Monday 9 AM', getValue: () => {
    const nextMonday = new Date();
    const daysUntilMonday = (8 - nextMonday.getDay()) % 7 || 7;
    nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
    nextMonday.setHours(9, 0, 0, 0);
    return nextMonday;
  }},
  { label: 'Next Friday 5 PM', getValue: () => {
    const nextFriday = new Date();
    const daysUntilFriday = (5 - nextFriday.getDay() + 7) % 7 || 7;
    nextFriday.setDate(nextFriday.getDate() + daysUntilFriday);
    nextFriday.setHours(17, 0, 0, 0);
    return nextFriday;
  }},
];

export default function MessageScheduler({ 
  onSchedule, 
  trigger, 
  disabled = false,
  className 
}: MessageSchedulerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [useCustomDateTime, setUseCustomDateTime] = useState(false);

  const defaultTrigger = (
    <Button variant="ghost" size="sm" disabled={disabled} title="Schedule message">
      <Clock className="w-4 h-4" />
    </Button>
  );

  const handleQuickSchedule = (option: typeof QUICK_SCHEDULE_OPTIONS[0]) => {
    const scheduledFor = option.getValue();
    if (scheduledFor <= new Date()) {
      toast.error('Cannot schedule messages in the past');
      return;
    }
    
    onSchedule(scheduledFor);
    setIsOpen(false);
    toast.success(`Message scheduled for ${scheduledFor.toLocaleString()}`);
  };

  const handleCustomSchedule = () => {
    if (!selectedDate) {
      toast.error('Please select a date');
      return;
    }

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const scheduledFor = new Date(selectedDate);
    scheduledFor.setHours(hours, minutes, 0, 0);

    if (scheduledFor <= new Date()) {
      toast.error('Cannot schedule messages in the past');
      return;
    }

    onSchedule(scheduledFor);
    setIsOpen(false);
    setSelectedDate(undefined);
    setSelectedTime('09:00');
    setUseCustomDateTime(false);
    toast.success(`Message scheduled for ${scheduledFor.toLocaleString()}`);
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 24) {
      return `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    } else if (diffDays < 7) {
      return `in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    } else {
      return `on ${date.toLocaleDateString()}`;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger || defaultTrigger}
      </PopoverTrigger>
      <PopoverContent className={cn("w-80 p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700", className)} align="start">
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <h3 className="font-medium">Schedule Message</h3>
          </div>

          {!useCustomDateTime ? (
            <>
              {/* Quick Schedule Options */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Quick Options</Label>
                <div className="grid gap-2">
                  {QUICK_SCHEDULE_OPTIONS.map((option, index) => {
                    const scheduledFor = option.getValue();
                    const isPast = scheduledFor <= new Date();
                    
                    return (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickSchedule(option)}
                        disabled={isPast}
                        className="justify-between text-left h-auto p-3"
                      >
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {scheduledFor.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {isPast ? 'Past' : formatRelativeTime(scheduledFor)}
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Date Time Toggle */}
              <div className="pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUseCustomDateTime(true)}
                  className="w-full"
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Choose custom date & time
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Custom Date Time Picker */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Custom Schedule</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUseCustomDateTime(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Date</Label>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      className="rounded-md border"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Time</Label>
                    <Input
                      type="time"
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  {selectedDate && (
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                      <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Scheduled for:
                      </div>
                      <div className="text-sm text-blue-700 dark:text-blue-300">
                        {selectedDate.toLocaleDateString()} at {selectedTime}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">
                        {formatRelativeTime(new Date(selectedDate.getTime() + parseInt(selectedTime.split(':')[0]) * 60 * 60 * 1000 + parseInt(selectedTime.split(':')[1]) * 60 * 1000))}
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleCustomSchedule}
                  disabled={!selectedDate}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Schedule Message
                </Button>
              </div>
            </>
          )}

          {/* Info */}
          <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <div>
                Scheduled messages will be sent automatically at the specified time. 
                You can cancel them anytime before delivery.
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Hook for managing scheduled messages
export function useScheduledMessages() {
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);

  const scheduleMessage = (content: string, recipients: any[], scheduledFor: Date): string => {
    const messageId = Date.now().toString() + Math.random().toString(36).substring(7);
    const newMessage: ScheduledMessage = {
      id: messageId,
      scheduledFor,
      content,
      recipients,
      status: 'scheduled'
    };

    setScheduledMessages(prev => [...prev, newMessage]);
    
    // In a real implementation, this would be stored in the backend
    // and a background service would handle the actual sending
    logger.info("Message scheduled:");
    
    return messageId;
  };

  const cancelScheduledMessage = (messageId: string) => {
    setScheduledMessages(prev => prev.filter(msg => msg.id !== messageId));
    toast.success('Scheduled message cancelled');
  };

  const getScheduledMessages = () => {
    return scheduledMessages.filter(msg => msg.status === 'scheduled');
  };

  return {
    scheduledMessages,
    scheduleMessage,
    cancelScheduledMessage,
    getScheduledMessages,
  };
}