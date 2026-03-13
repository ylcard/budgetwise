/**
 * @fileoverview DatePicker component for selecting a single date using react-day-picker v9.
 * Integrates UI components (Popover, CustomButton, DayPicker) and utilizes
 * user settings for date formatting and utility functions for storage/retrieval.
 * UPDATED: 17-Jan-2026 - Migrated to react-day-picker v9 with dropdown navigation
 */

import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CustomButton } from "@/components/ui/CustomButton";
import { DayPicker } from "react-day-picker";
// import classNames from "react-day-picker/style.module.css";
// import "react-day-picker/style.css";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSettings } from "../utils/SettingsContext";
import { parseDate, formatDateString, formatDate } from "../utils/dateUtils";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

// Export the styled calendar so it can be embedded in drawers/dialogs directly
export function CalendarView({ selected, onSelect, className, ...props }) {
  return (
    <DayPicker
      mode="single"
      navLayout="around"
      selected={selected}
      onSelect={onSelect}
      defaultMonth={selected}
      // className={cn("p-3", className)}
      // classNames={classNames}
      weekStartsOn={1}
      showOutsideDays
      fixedWeeks
      captionLayout="dropdown"
      startMonth={new Date(1986, 0)}
      endMonth={new Date(2100, 11)}
      // REMOVED 13-Mar-2026: classNames and custom components removed.
      // v9 no longer uses IconLeft/IconRight — it uses a single Chevron component internally.
      // Passing the old v8 component names was silently ignored, breaking nav icon rendering.
      {...props}
    />
  );
}

/**
 * A reusable single-date picker component using react-day-picker.
 * The component manages date parsing for the DayPicker and formatting for display
 * and storage based on user settings.
 *
 * @param {object} props
 * @param {string|null|undefined} props.value - The date stored in YYYY-MM-DD string format (e.g., '2025-01-12').
 * @param {function(string|null)} props.onChange - Handler to update the external date value. Receives the date string in YYYY-MM-DD format or null.
 * @param {string} [props.placeholder="Pick a date"] - Text to display when no date is selected.
 * @param {string} [props.className=""] - Additional class names for the trigger button.
 * @returns {JSX.Element} The date picker component.
 */
export default function DatePicker({ value, onChange, placeholder = "Pick a date", className = "" }) {
  const { settings } = useSettings();
  const isMobile = useIsMobile();

  /**
   * @type {[boolean, function(boolean)]} Internal state to control the open/closed state of the Popover.
   */
  const [open, setOpen] = useState(false);

  // Parse the date string to a Date object
  const dateValue = value ? parseDate(value) : undefined;

  /**
   * Handles the date selection from the DayPicker component.
   * Converts the selected Date object back into the standardized YYYY-MM-DD string format
   * before calling the external onChange handler.
   * @param {Date|undefined} date - The date object selected from the DayPicker.
   */
  const handleSelect = (date) => {
    if (date) {
      // Convert to YYYY-MM-DD format (timezone agnostic)
      const formattedDate = formatDateString(date);
      onChange(formattedDate);
      setOpen(false);
    }
  };

  const trigger = (
    <CustomButton
      variant="outline"
      className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground", className)}
    >
      <CalendarIcon className="mr-2 h-4 w-4" />
      {value ? formatDate(value, settings.dateFormat) : <span>{placeholder}</span>}
    </CustomButton>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="z-[600]">
          <div className="mx-auto w-full max-w-sm px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-2">
            <CalendarView selected={dateValue} onSelect={handleSelect} className="w-full" />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-[600]" align="start" sideOffset={4}>
        <CalendarView selected={dateValue} onSelect={handleSelect} />
      </PopoverContent>
    </Popover>
  );
}