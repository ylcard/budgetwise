/**
 * @fileoverview DateRangePicker using react-day-picker v9 range mode
 * REDESIGNED: 17-Jan-2026 - Replaced custom dual DatePicker with native DayPicker range mode (single calendar)
 * UPDATED: 17-Jan-2026 - Upgraded to react-day-picker v9 with dropdown navigation
 */

import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { CustomButton } from "@/components/ui/CustomButton";
import { DayPicker } from "react-day-picker";
import classNames from "react-day-picker/style.module.css";
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

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <CustomButton
                    variant="outline"
                    className="w-full md:w-auto justify-center md:justify-start text-center md:text-left font-normal"
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
            <PopoverContent className="w-auto p-0 mobile-high-z-index" align="start" sideOffset={4}>
                <DayPicker
                    mode="range"
                    selected={internalRange}
                    onSelect={handleSelect}
                    defaultMonth={internalRange?.from || (startDate ? parseDate(startDate) : new Date())}
                    className="p-3"
                    weekStartsOn={1}
                    showOutsideDays
                    captionLayout="dropdown"
                    startMonth={new Date(1986, 0)}
                    endMonth={new Date(2100, 11)}
                    classNames={classNames}
                    components={{
                        IconLeft: ({ className, ...props }) => <ChevronLeft className={cn("h-4 w-4", className)} {...props} />,
                        IconRight: ({ className, ...props }) => <ChevronRight className={cn("h-4 w-4", className)} {...props} />,
                    }}
                />
            </PopoverContent>
        </Popover>
    );
}
