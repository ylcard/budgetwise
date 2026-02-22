/**
 * @fileoverview DateRangePicker using react-day-picker v9 range mode
 * REDESIGNED: 17-Jan-2026 - Replaced custom dual DatePicker with native DayPicker range mode (single calendar)
 * UPDATED: 17-Jan-2026 - Upgraded to react-day-picker v9 with dropdown navigation
 */

import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { CustomButton } from "@/components/ui/CustomButton";
import { DayPicker } from "react-day-picker";
import { buttonVariants } from "@/components/ui/button";
import "react-day-picker/style.css"; // Use global styles instead of modules
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSettings } from "../utils/SettingsContext";
import { parseDate, formatDateString, formatDate } from "../utils/dateUtils";

export default function DateRangePicker({ startDate, endDate, onRangeChange }) {
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  // Internal state to handle the selection process independently of parent state
  const [internalRange, setInternalRange] = useState(undefined);

  // Sync internal state with props ONLY when the popover opens or props change externally
  useEffect(() => {
    if (open) {
      setInternalRange({
        from: startDate ? parseDate(startDate) : undefined,
        to: endDate ? parseDate(endDate) : undefined
      });
    }
  }, [open, startDate, endDate]);

  // We accept triggerDate (the specific day clicked) to handle the reset logic
  const handleSelect = (selectedRange, triggerDate) => {
    // If we already have a complete range selected, start a fresh selection
    // instead of letting the library "extend" the previous range.
    if (internalRange?.from && internalRange?.to) {
      setInternalRange({ from: triggerDate, to: undefined });
      return;
    }

    // Otherwise, proceed with normal selection logic (e.g., picking the end date)
    setInternalRange(selectedRange);

    if (selectedRange?.from && selectedRange?.to) {
      onRangeChange(
        formatDateString(selectedRange.from),
        formatDateString(selectedRange.to)
      );
      setOpen(false);
    }
  };
  const CalendarContent = (
    <DayPicker
      mode="range"
      selected={internalRange}
      onSelect={handleSelect}
      defaultMonth={internalRange?.from || (startDate ? parseDate(startDate) : new Date())}
      className="p-3"
      weekStartsOn={1}
      showOutsideDays
      captionLayout="dropdown"
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center absolute right-1",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "",
        nav_button_next: "",
        table: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        week: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-range-start)]:rounded-l-md [&:has([aria-selected].day-outside)]:bg-primary/20 [&:has([aria-selected])]:bg-primary/10 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        range_end: "day-range-end",
        selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md",
        today: "bg-accent text-accent-foreground",
        outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-primary/20 aria-selected:text-muted-foreground aria-selected:opacity-30",
        disabled: "text-muted-foreground opacity-50",
        range_middle: "aria-selected:bg-primary/10 aria-selected:text-primary !rounded-none",
        hidden: "invisible",
      }}
      components={{
        IconLeft: ({ className, ...props }) => <ChevronLeft className={cn("h-4 w-4", className)} {...props} />,
        IconRight: ({ className, ...props }) => <ChevronRight className={cn("h-4 w-4", className)} {...props} />,
      }}
    />
  );

  const TriggerButton = (
    <CustomButton
      variant="outline"
      className={cn(
        "w-full md:w-auto justify-center md:justify-start text-center md:text-left font-normal",
        !startDate && "text-muted-foreground"
      )}
    >
      <CalendarIcon className="mr-2 h-4 w-4" />
      {startDate && endDate ? (
        <span>
          {formatDate(startDate, settings.dateFormat)} - {formatDate(endDate, settings.dateFormat)}
        </span>
      ) : (
        <span>Pick date range</span>
      )}
    </CustomButton>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          {TriggerButton}
        </DrawerTrigger>
        <DrawerContent className="z-[600]">
          <div className="p-4 pb-8 flex justify-center overflow-x-auto">
            {CalendarContent}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        {TriggerButton}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-[600]" align="start" sideOffset={4}>
        {CalendarContent}
      </PopoverContent>
    </Popover>
  );
}
