import React from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays, addWeeks, isToday, isTomorrow, isPast } from "date-fns";

interface DueDatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  statusLabel?: boolean;
}

const quickSelects = [
  { label: "Today", get: () => new Date() },
  { label: "Tomorrow", get: () => addDays(new Date(), 1) },
  { label: "Next Week", get: () => addWeeks(new Date(), 1) },
];

export const DueDatePicker: React.FC<DueDatePickerProps> = ({
  value,
  onChange,
  disabled,
  minDate,
  maxDate,
  statusLabel = true,
}) => {
  // Status label logic
  let status = "";
  if (value) {
    if (isToday(value)) status = "Today";
    else if (isTomorrow(value)) status = "Tomorrow";
    else if (isPast(value) && !isToday(value)) status = "Overdue";
    else status = format(value, "PPP");
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal"
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? (
            <span>
              {format(value, "PPP")}
              {statusLabel && (
                <span className={`ml-2 text-xs font-medium ${status === "Overdue" ? "text-red-500" : status === "Today" ? "text-blue-600" : status === "Tomorrow" ? "text-yellow-600" : "text-muted-foreground"}`}>{status}</span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">Pick a date</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 border-b flex gap-2">
          {quickSelects.map((q) => (
            <Button
              key={q.label}
              size="sm"
              variant="ghost"
              className="text-xs"
              onClick={() => onChange(q.get())}
            >
              {q.label}
            </Button>
          ))}
        </div>
        <Calendar
          mode="single"
          selected={value ?? undefined}
          onSelect={(date) => onChange(date ?? null)}
          initialFocus
          disabled={disabled}
          required={false}
          fromDate={minDate}
          toDate={maxDate}
        />
        {value && (
          <div className="p-3 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onChange(null)}
              className="w-full"
            >
              Clear Date
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}; 