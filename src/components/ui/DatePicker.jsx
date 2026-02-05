/**
 * @fileoverview DatePicker component for selecting a single date using react-day-picker v9.
 * Integrates UI components (Popover, CustomButton, DayPicker) and utilizes
 * user settings for date formatting and utility functions for storage/retrieval.
 * UPDATED: 17-Jan-2026 - Migrated to react-day-picker v9 with dropdown navigation
 */

import React, { useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CustomButton } from "@/components/ui/CustomButton";
import { DayPicker } from "react-day-picker";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useSettings } from "../utils/SettingsContext";
import { parseDate, formatDateString, formatDate } from "../utils/dateUtils";

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

export default function DatePicker({
    value,
    onChange,
    placeholder = "Pick a date",
    className = "",
    // Allow overriding these defaults via props
    ...dayPickerProps
}) {
    const { settings } = useSettings();

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
                <DayPicker
                    mode="single"
                    selected={dateValue}
                    onSelect={handleSelect}
                    className="p-3"
                    weekStartsOn={1}
                    showOutsideDays
                    fixedWeeks
                    // Defaults (can be overridden by ...dayPickerProps)
                    captionLayout="dropdown"
                    fromYear={1900}
                    toYear={2100}
                    // Replace the native native dropdowns with Shadcn Select
                    components={{
                        Dropdown: ({ value, onChange, children }) => {
                            const options = React.Children.toArray(children);
                            const selected = options.find((child) => child.props.value?.toString() === value?.toString());
                            const handleChange = (value) => {
                                const changeEvent = {
                                    target: { value },
                                };
                                onChange?.(changeEvent);
                            };
                            return (
                                <Select
                                    value={value?.toString()}
                                    onValueChange={handleChange}
                                >
                                    <SelectTrigger className="h-7 w-fit gap-1 border-none bg-transparent p-0 pl-2 pr-1 font-medium hover:bg-accent/50 focus:ring-0 shadow-none text-sm">
                                        <SelectValue>{selected?.props?.children}</SelectValue>
                                    </SelectTrigger>
                                    <SelectContent position="popper" className="max-h-[240px] overflow-y-auto min-w-[120px] bg-white z-50">
                                        {options.map((option) => (
                                            <SelectItem
                                                key={option.props.value}
                                                value={option.props.value?.toString() ?? ""}
                                                className="text-sm"
                                            >
                                                {option.props.children}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            );
                        },
                        IconLeft: ({ ...props }) => <ChevronLeft {...props} className="h-4 w-4" />,
                        IconRight: ({ ...props }) => <ChevronRight {...props} className="h-4 w-4" />,
                    }}
                    // Spread parent props last to allow overrides
                    {...dayPickerProps}
                    classNames={{
                        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                        month: "space-y-4",
                        // Ensure the container is centered and relatively positioned
                        caption: "flex justify-center pt-1 relative items-center",
                        // Hide the static text label when dropdowns are active to prevent duplication
                        caption_label: "hidden",
                        caption_dropdowns: "flex justify-center gap-1",
                        nav: "space-x-1 flex items-center absolute right-1",
                        nav_button: cn(
                            buttonVariants({ variant: "outline" }),
                            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                        ),
                        nav_button_previous: "absolute left-1 border-none",
                        nav_button_next: "absolute right-1 border-none",
                        table: "w-full border-collapse space-y-1",
                        weekdays: "flex",
                        weekday: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                        week: "flex w-full mt-2",
                        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                        day: cn(
                            buttonVariants({ variant: "ghost" }),
                            "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
                        ),
                        range_end: "day-range-end",
                        selected: "bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white rounded-full",
                        today: "bg-accent text-accent-foreground",
                        outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                        disabled: "text-muted-foreground opacity-50",
                        range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                        hidden: "invisible",
                        // Removing default styles since we are replacing the component entirely
                        dropdown: "",
                        dropdown_icon: "hidden",
                        dropdown_month: "mr-1",
                        dropdown_year: "mr-1",
                    }}
                />
            </PopoverContent>
        </Popover>
    );
}
