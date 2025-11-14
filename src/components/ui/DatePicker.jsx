/**
 * @fileoverview DatePicker component for selecting a single date,
 * integrating UI components (Popover, CustomButton, Calendar) and utilizing
 * user settings for date formatting and utility functions for storage/retrieval.
 */

import React, { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
// UPDATED 16-Jan-2025: Replaced Button with CustomButton for consistency
// import { Button } from "@/components/ui/button";
import { CustomButton } from "@/components/ui/CustomButton";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSettings } from "../utils/SettingsContext";
import { parseDate, formatDateString, formatDate } from "../utils/dateUtils";

/**
 * A reusable single-date picker component using a popover calendar.
 * The component manages date parsing for the Calendar object and formatting for display
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

  /**
   * @type {[boolean, function(boolean)]} Internal state to control the open/closed state of the Popover.
   */
  const [open, setOpen] = useState(false);
  
  // Parse the date string to a Date object
  const dateValue = value ? parseDate(value) : undefined;

  /**
   * Handles the date selection from the Calendar component.
   * Converts the selected Date object back into the standardized YYYY-MM-DD string format
   * before calling the external onChange handler.
   * @param {Date|undefined} date - The date object selected from the Calendar.
   */
  const handleSelect = (date) => {
    if (date) {
      // Convert to YYYY-MM-DD format (timezone agnostic)
      const formattedDate = formatDateString(date);
      onChange(formattedDate);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <CustomButton
          variant="outline"
          className={`w-full justify-start text-left font-normal ${!value && "text-muted-foreground"} ${className}`}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? formatDate(value, settings.dateFormat) : <span>{placeholder}</span>}
        </CustomButton>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={handleSelect}
          initialFocus
          className="rounded-md border"
        />
      </PopoverContent>
    </Popover>
  );
}

// UPDATED 16-Jan-2025: Replaced shadcn Button with CustomButton
// - Trigger button now uses CustomButton with variant="outline"
// - Calendar component (internal date selection UI) remains unchanged (external library component)
// - All functionality preserved, consistent styling applied