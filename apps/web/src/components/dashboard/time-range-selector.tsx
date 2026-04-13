import { Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type TimeRange = "7d" | "14d" | "30d" | "90d" | "custom";

interface TimeRangeSelectorProps {
  selected: TimeRange;
  onChange: (range: TimeRange) => void;
  className?: string;
  variant?: "button" | "tabs" | "dropdown";
}

export function TimeRangeSelector({
  selected,
  onChange,
  className,
  variant = "tabs",
}: TimeRangeSelectorProps) {
  const options = [
    { value: "7d" as TimeRange, label: "7 Days" },
    { value: "14d" as TimeRange, label: "14 Days" },
    { value: "30d" as TimeRange, label: "30 Days" },
    { value: "90d" as TimeRange, label: "90 Days" },
  ];

  if (variant === "dropdown") {
    return (
      <div className={cn("relative inline-block", className)}>
        <button
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600",
            "bg-white dark:bg-gray-900 px-3 py-2 text-sm font-medium",
            "text-gray-700 dark:text-gray-300",
            "hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          )}
        >
          <Calendar className="h-4 w-4" />
          {options.find((opt) => opt.value === selected)?.label || "Custom"}
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (variant === "button") {
    return (
      <div className={cn("flex flex-wrap gap-2", className)}>
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "px-3 py-1.5 rounded text-sm font-medium transition-colors",
              selected === option.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  }

  // Default: tabs variant
  return (
    <div className={cn("inline-flex rounded-lg border border-gray-300 dark:border-gray-600 p-1 bg-gray-50 dark:bg-gray-900/50", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "px-3 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap",
            selected === option.value
              ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Compact inline time range selector
 */
export function TimeRangeSelectorCompact({
  selected,
  onChange,
  className,
}: Omit<TimeRangeSelectorProps, "variant">) {
  return (
    <TimeRangeSelector
      selected={selected}
      onChange={onChange}
      className={cn("text-xs", className)}
      variant="button"
    />
  );
}
