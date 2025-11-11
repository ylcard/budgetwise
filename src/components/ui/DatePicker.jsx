import React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSettings } from "../utils/SettingsContext";
// UPDATED 12-Jan-2025: Changed imports to use dateUtils.js instead of budgetCalculations.js
import { formatDate } from "../utils/dateUtils";
import { parseDate, formatDateString } from "../utils/dateUtils";

export default function DatePicker({ value, onChange, placeholder = "Pick a date", className = "" }) {
  const { settings } = useSettings();
  const [open, setOpen] = React.useState(false);
  
  // Parse the date string to a Date object
  const dateValue = value ? parseDate(value) : undefined;

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
        <Button
          variant="outline"
          className={`w-full justify-start text-left font-normal ${!value && "text-muted-foreground"} ${className}`}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? formatDate(value, settings.dateFormat) : <span>{placeholder}</span>}
        </Button>
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