import { cn } from "@/lib/cn";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type * as React from "react";
import { DayPicker } from "react-day-picker";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        button_previous: cn(
          "absolute left-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 z-10",
          "text-zinc-800 dark:text-zinc-100",
          "hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors",
        ),
        button_next: cn(
          "absolute right-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 z-10",
          "text-zinc-800 dark:text-zinc-100",
          "hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors",
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday:
          "text-zinc-500 dark:text-zinc-400 rounded-md w-9 font-normal text-[0.8rem]",
        week: "flex w-full mt-2",
        day: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-zinc-100/50 [&:has([aria-selected])]:bg-zinc-100 dark:[&:has([aria-selected].day-outside)]:bg-zinc-800/50 dark:[&:has([aria-selected])]:bg-zinc-800 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day_button: cn(
          "h-9 w-9 p-0 font-normal",
          "aria-selected:opacity-100",
          "hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400",
        ),
        range_end: "day-range-end",
        selected:
          "bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:text-white focus:bg-indigo-600 dark:focus:bg-indigo-500 focus:text-white",
        today: "bg-zinc-100 dark:bg-zinc-800",
        outside:
          "day-outside text-zinc-500 dark:text-zinc-400 opacity-50 aria-selected:bg-zinc-100/50 dark:aria-selected:bg-zinc-800/50 aria-selected:text-zinc-500 dark:aria-selected:text-zinc-400",
        disabled: "text-zinc-500 dark:text-zinc-400 opacity-50",
        range_middle:
          "aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800 aria-selected:text-zinc-900 dark:aria-selected:text-zinc-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...chevronProps }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" {...chevronProps} />
          ) : (
            <ChevronRight className="h-4 w-4" {...chevronProps} />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
