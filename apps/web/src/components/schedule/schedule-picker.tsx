// @epic-3.1-messaging: Schedule picker component for message scheduling
// @persona-sarah: PM needs to schedule messages for team coordination
// @persona-david: Team lead needs to schedule reminders and announcements

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Send, X, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, addMinutes, addHours, addDays, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';

export interface ScheduleData {
  scheduledFor: Date;
  timezone: string;
}

interface SchedulePickerProps {
  onSchedule: (scheduleData: ScheduleData) => void;
  onCancel?: () => void;
  trigger?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

// Common timezone options
const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC', offset: '+00:00' },
  { value: 'America/New_York', label: 'Eastern Time', offset: '-05:00' },
  { value: 'America/Chicago', label: 'Central Time', offset: '-06:00' },
  { value: 'America/Denver', label: 'Mountain Time', offset: '-07:00' },
  { value: 'America/Los_Angeles', label: 'Pacific Time', offset: '-08:00' },
  { value: 'Europe/London', label: 'London', offset: '+00:00' },
  { value: 'Europe/Berlin', label: 'Berlin', offset: '+01:00' },
  { value: 'Europe/Paris', label: 'Paris', offset: '+01:00' },
  { value: 'Asia/Tokyo', label: 'Tokyo', offset: '+09:00' },
  { value: 'Asia/Shanghai', label: 'Shanghai', offset: '+08:00' },
  { value: 'Asia/Kolkata', label: 'Mumbai', offset: '+05:30' },
  { value: 'Australia/Sydney', label: 'Sydney', offset: '+11:00' },
];

// Quick schedule options
const QUICK_OPTIONS = [
  { label: 'In 5 minutes', getValue: () => addMinutes(new Date(), 5) },
  { label: 'In 15 minutes', getValue: () => addMinutes(new Date(), 15) },
  { label: 'In 30 minutes', getValue: () => addMinutes(new Date(), 30) },
  { label: 'In 1 hour', getValue: () => addHours(new Date(), 1) },
  { label: 'In 2 hours', getValue: () => addHours(new Date(), 2) },
  { label: 'Tomorrow 9 AM', getValue: () => {
    const tomorrow = addDays(new Date(), 1);
    const date = new Date(tomorrow);
    date.setHours(9, 0, 0, 0);
    return date;
  }},
  { label: 'Tomorrow 2 PM', getValue: () => {
    const tomorrow = addDays(new Date(), 1);
    const date = new Date(tomorrow);
    date.setHours(14, 0, 0, 0);
    return date;
  }},
  { label: 'Next Monday 9 AM', getValue: () => {
    const now = new Date();
    const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
    const nextMonday = addDays(now, daysUntilMonday);
    nextMonday.setHours(9, 0, 0, 0);
    return nextMonday;
  }},
];

export function SchedulePicker({
  onSchedule,
  onCancel,
  trigger,
  disabled = false,
  className = ""
}: SchedulePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedTimezone, setSelectedTimezone] = useState("");
  const [previewDate, setPreviewDate] = useState<Date | null>(null);
  const [validationError, setValidationError] = useState("");

  // Detect user's timezone
  useEffect(() => {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setSelectedTimezone(userTimezone);
  }, []);

  // Update preview when inputs change
  useEffect(() => {
    if (selectedDate && selectedTime && selectedTimezone) {
      try {
        const datetime = new Date(`${selectedDate}T${selectedTime}`);
        if (!isNaN(datetime.getTime())) {
          setPreviewDate(datetime);
          
          // Validate the selected time is in the future
          if (!isAfter(datetime, new Date())) {
            setValidationError("Scheduled time must be in the future");
          } else {
            setValidationError("");
          }
        } else {
          setPreviewDate(null);
          setValidationError("Invalid date or time");
        }
      } catch (error) {
        setPreviewDate(null);
        setValidationError("Invalid date or time format");
      }
    } else {
      setPreviewDate(null);
      setValidationError("");
    }
  }, [selectedDate, selectedTime, selectedTimezone]);

  const handleQuickOption = (option: typeof QUICK_OPTIONS[0]) => {
    const date = option.getValue();
    setSelectedDate(format(date, 'yyyy-MM-dd'));
    setSelectedTime(format(date, 'HH:mm'));
  };

  const handleSchedule = () => {
    if (!previewDate || validationError) {
      return;
    }

    onSchedule({
      scheduledFor: previewDate,
      timezone: selectedTimezone,
    });

    // Reset form
    setSelectedDate("");
    setSelectedTime("");
    setPreviewDate(null);
    setValidationError("");
    setIsOpen(false);
  };

  const handleCancel = () => {
    // Reset form
    setSelectedDate("");
    setSelectedTime("");
    setPreviewDate(null);
    setValidationError("");
    setIsOpen(false);
    onCancel?.();
  };

  const defaultTrigger = (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled}
      className={cn("gap-2", className)}
    >
      <Clock className="w-4 h-4" />
      Schedule
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Schedule Message
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick options */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Quick Schedule</Label>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_OPTIONS.map((option) => (
                <Button
                  key={option.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickOption(option)}
                  className="text-xs h-8"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom date and time */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Custom Schedule</Label>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="date" className="text-xs text-muted-foreground">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="text-sm"
                />
              </div>
              
              <div>
                <Label htmlFor="time" className="text-xs text-muted-foreground">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>

            {/* Timezone selector */}
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                <Globe className="w-3 h-3" />
                Timezone
              </Label>
              <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      <div className="flex items-center justify-between w-full">
                        <span>{tz.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">{tz.offset}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview */}
          {previewDate && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-sm font-medium mb-1">Preview</div>
              <div className="text-sm text-muted-foreground">
                Message will be sent on <strong>{format(previewDate, 'EEEE, MMMM d, yyyy')}</strong> at{' '}
                <strong>{format(previewDate, 'h:mm a')}</strong>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {selectedTimezone}
              </div>
            </div>
          )}

          {/* Validation error */}
          {validationError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="text-sm text-red-600 dark:text-red-400">{validationError}</div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSchedule}
              disabled={!previewDate || !!validationError}
            >
              <Send className="w-4 h-4 mr-2" />
              Schedule Message
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SchedulePicker;