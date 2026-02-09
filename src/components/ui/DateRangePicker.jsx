/**
 * @fileoverview DateRangePicker using react-day-picker v9 range mode
 * REDESIGNED: 17-Jan-2026 - Replaced custom dual DatePicker with native DayPicker range mode (single calendar)
 * UPDATED: 17-Jan-2026 - Upgraded to react-day-picker v9 with dropdown navigation
 */

import { useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { CustomButton } from "@/components/ui/CustomButton";
import { DayPicker } from "react-day-picker";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useSettings } from "../utils/SettingsContext";
import { parseDate, formatDateString, formatDate } from "../utils/dateUtils";

export default function DateRangePicker({ startDate, endDate, onRangeChange }) {
    const { settings } = useSettings();
    const [open, setOpen] = useState(false);

    const range = {
        from: startDate ? parseDate(startDate) : undefined,
        to: endDate ? parseDate(endDate) : undefined
    };

    const handleSelect = (selectedRange) => {
        if (selectedRange?.from && selectedRange?.to) {
            onRangeChange(
                formatDateString(selectedRange.from),
                formatDateString(selectedRange.to)
            );
            setOpen(false);
        } else if (selectedRange?.from) {
            // Keep popover open until both dates are selected
            // Range selection in progress
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <CustomButton
                    variant="outline"
                    className="w-full md:w-auto justify-start text-left font-normal"
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate && endDate ? (
                        <span>
                            {formatDate(startDate, settings.dateFormat)} - {formatDate(endDate, settings.dateFormat)}
                        </span>
                    ) : (
                        <span className="text-muted-foreground">Pick date range</span>
                    )}
                </CustomButton>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
                <DayPicker
                    mode="range"
                    selected={range}
                    onSelect={handleSelect}
                    defaultMonth={range.from || new Date()}
                    className="p-3"
                    weekStartsOn={1}
                    showOutsideDays
                    captionLayout="dropdown"
                    startMonth={new Date(1986, 0)}
                    endMonth={new Date(2100, 11)}
                    classNames={{
                        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                        month: "space-y-4",
                        caption: "flex justify-center pt-1 relative items-center",
                        caption_label: "text-sm font-medium",
                        caption_dropdowns: "flex justify-center gap-1",
                        nav: "space-x-1 flex items-center absolute right-1",
                        nav_button: cn(
                            buttonVariants({ variant: "ghost" }),
                            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                        ),
                        nav_button_previous: "absolute left-1",
                        nav_button_next: "absolute right-1",
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
                        selected: "bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white rounded-md",
                        today: "bg-accent text-accent-foreground",
                        outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                        disabled: "text-muted-foreground opacity-50",
                        range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                        hidden: "invisible",
                        dropdown: "p-1 bg-transparent outline-none cursor-pointer hover:bg-accent rounded-sm text-sm font-medium",
                        dropdown_icon: "hidden",
                        dropdown_month: "mr-2",
                        dropdown_year: "",
                    }}
                    components={{
                        IconLeft: ({ className, ...props }) => <ChevronLeft className={cn("h-4 w-4", className)} {...props} />,
                        IconRight: ({ className, ...props }) => <ChevronRight className={cn("h-4 w-4", className)} {...props} />,
                    }}
                />
            </PopoverContent>
        </Popover>
    );
}
