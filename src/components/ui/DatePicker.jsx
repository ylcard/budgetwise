/**
 * @fileoverview DatePicker component for selecting a single date,
 * integrating UI components (Popover, CustomButton, Calendar) and utilizing
 * user settings for date formatting and utility functions for storage/retrieval.
 */

import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { CustomButton } from "@/components/ui/CustomButton";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSettings } from "../utils/SettingsContext";
import { parseDate, formatDateString, formatDate, getMonthName } from "../utils/dateUtils";
import { useNavigation } from "react-day-picker";
import { setMonth, setYear, startOfMonth } from "date-fns";

/**
 * Custom Caption Label component for the Calendar.
 * Replaces the default caption with interactive Month and Year popovers
 * that display grids for quicker selection.
 */
function CalendarCaptionLabel({ displayMonth }) {
    const { goToMonth } = useNavigation();
    const [monthOpen, setMonthOpen] = useState(false);
    const [yearOpen, setYearOpen] = useState(false);

    // Generate a range of years (e.g., 2000 - 2050)
    // const startYear = 2000;
    // const endYear = 2050;
    // const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
    // Generate ranges
    const months = Array.from({ length: 12 }, (_, i) => getMonthName(i));
    const currentYear = new Date().getFullYear();
    // Range: Current Year - 50 to + 50
    const years = Array.from({ length: 101 }, (_, i) => currentYear - 50 + i);

    // const handleMonthChange = (value) => {
    //     const newMonth = parseInt(value);
    //     goToMonth(setMonth(startOfMonth(displayMonth), newMonth));
    const handleMonthSelect = (index) => {
        goToMonth(setMonth(displayMonth, index));
        setMonthOpen(false);
    };

    // const handleYearChange = (value) => {
    //     const newYear = parseInt(value);
    //     goToMonth(setYear(startOfMonth(displayMonth), newYear));
    const handleYearSelect = (year) => {
        goToMonth(setYear(displayMonth, year));
        setYearOpen(false);
    };

    return (
        <div className="flex items-center gap-1">
            {/* Month Picker */}
            <Popover open={monthOpen} onOpenChange={setMonthOpen}>
                <PopoverTrigger asChild>
                    <CustomButton variant="ghost" size="sm" className="h-7 text-sm font-medium hover:bg-gray-100">
                        {getMonthName(displayMonth.getMonth())}
                    </CustomButton>
                </PopoverTrigger>
                <PopoverContent className="w-[260px] p-2" align="center">
                    <div className="grid grid-cols-3 gap-2">
                        {months.map((m, i) => (
                            <CustomButton
                                key={m}
                                variant={displayMonth.getMonth() === i ? "default" : "ghost"}
                                size="sm"
                                onClick={() => handleMonthSelect(i)}
                                className="h-8 text-xs"
                            >
                                {m.slice(0, 3)}
                            </CustomButton>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>

            {/* Year Picker */}
            <Popover open={yearOpen} onOpenChange={setYearOpen}>
                <PopoverTrigger asChild>
                    <CustomButton variant="ghost" size="sm" className="h-7 text-sm font-medium hover:bg-gray-100">
                        {displayMonth.getFullYear()}
                    </CustomButton>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-0" align="center">
                    <ScrollArea className="h-[280px]">
                        <div className="grid grid-cols-4 gap-2 p-2">
                            {years.map((year) => (
                                <CustomButton
                                    key={year}
                                    variant={displayMonth.getFullYear() === year ? "default" : "ghost"}
                                    size="sm"
                                    onClick={() => handleYearSelect(year)}
                                    className="h-8 text-xs"
                                >
                                    {year}
                                </CustomButton>
                            ))}
                        </div>
                    </ScrollArea>
                </PopoverContent>
            </Popover>
        </div>
    );
}

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
                    defaultMonth={dateValue}
                    initialFocus
                    className="w-fit rounded-md border"
                    weekStartsOn={1}
                    fixedWeeks
                    components={{
                        CaptionLabel: CalendarCaptionLabel
                    }}
                />
            </PopoverContent>
        </Popover>
    );
}
