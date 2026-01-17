/**
 * @fileoverview DateRangePicker using react-day-picker v8 range mode
 * REDESIGNED: 17-Jan-2026 - Replaced custom dual DatePicker with native DayPicker range mode (single calendar)
 */

import { useState } from "react";
// import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Calendar as CalendarIcon } from "lucide-react";
import { CustomButton } from "@/components/ui/CustomButton";
// import { DayPicker, useNavigation } from "react-day-picker";
import { DayPicker } from "react-day-picker";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
// import { ScrollArea } from "@/components/ui/scroll-area";
import { useSettings } from "../utils/SettingsContext";
// import { parseDate, formatDateString, formatDate, getMonthName } from "../utils/dateUtils";
// import { setMonth, setYear } from "date-fns";
import { parseDate, formatDateString, formatDate } from "../utils/dateUtils";
import "react-day-picker/dist/style.css";

/**
 * Custom Caption component for DayPicker range mode.
 */
// function CustomCaption({ displayMonth }) {
//     const { goToMonth, nextMonth, previousMonth } = useNavigation();
//     const [monthOpen, setMonthOpen] = useState(false);
//     const [yearOpen, setYearOpen] = useState(false);

//     const months = Array.from({ length: 12 }, (_, i) => getMonthName(i));
//     const currentYear = new Date().getFullYear();
//     const years = Array.from({ length: 101 }, (_, i) => currentYear - 50 + i);

//     const handleMonthSelect = (index) => {
//         goToMonth(setMonth(displayMonth, index));
//         setMonthOpen(false);
//     };

//     const handleYearSelect = (year) => {
//         goToMonth(setYear(displayMonth, year));
//         setYearOpen(false);
//     };

//     return (
//         <div className="flex items-center justify-between px-2 py-2">
//             <CustomButton
//                 variant="ghost"
//                 size="icon-sm"
//                 onClick={() => previousMonth && goToMonth(previousMonth)}
//                 disabled={!previousMonth}
//                 className="h-7 w-7"
//             >
//                 <ChevronLeft className="h-4 w-4" />
//             </CustomButton>

//             <div className="flex items-center gap-1">
//                 <Popover open={monthOpen} onOpenChange={setMonthOpen}>
//                     <PopoverTrigger asChild>
//                         <CustomButton variant="ghost" size="sm" className="h-7 text-sm font-medium hover:bg-gray-100">
//                             {getMonthName(displayMonth.getMonth())}
//                         </CustomButton>
//                     </PopoverTrigger>
//                     <PopoverContent className="w-[260px] p-2" align="center">
//                         <div className="grid grid-cols-3 gap-2">
//                             {months.map((m, i) => (
//                                 <CustomButton
//                                     key={m}
//                                     variant={displayMonth.getMonth() === i ? "default" : "ghost"}
//                                     size="sm"
//                                     onClick={() => handleMonthSelect(i)}
//                                     className="h-8 text-xs"
//                                 >
//                                     {m.slice(0, 3)}
//                                 </CustomButton>
//                             ))}
//                         </div>
//                     </PopoverContent>
//                 </Popover>

//                 <Popover open={yearOpen} onOpenChange={setYearOpen}>
//                     <PopoverTrigger asChild>
//                         <CustomButton variant="ghost" size="sm" className="h-7 text-sm font-medium hover:bg-gray-100">
//                             {displayMonth.getFullYear()}
//                         </CustomButton>
//                     </PopoverTrigger>
//                     <PopoverContent className="w-[240px] p-0" align="center">
//                         <ScrollArea className="h-[280px]">
//                             <div className="grid grid-cols-4 gap-2 p-2">
//                                 {years.map((year) => (
//                                     <CustomButton
//                                         key={year}
//                                         variant={displayMonth.getFullYear() === year ? "default" : "ghost"}
//                                         size="sm"
//                                         onClick={() => handleYearSelect(year)}
//                                         className="h-8 text-xs"
//                                     >
//                                         {year}
//                                     </CustomButton>
//                                 ))}
//                             </div>
//                         </ScrollArea>
//                     </PopoverContent>
//                 </Popover>
//             </div>

//             <CustomButton
//                 variant="ghost"
//                 size="icon-sm"
//                 onClick={() => nextMonth && goToMonth(nextMonth)}
//                 disabled={!nextMonth}
//                 className="h-7 w-7"
//             >
//                 <ChevronRight className="h-4 w-4" />
//             </CustomButton>
//         </div>
//     );
// }

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
                    className="rdp-custom p-3"
                    weekStartsOn={1}
                    showOutsideDays
                    // components={{
                    //     Caption: CustomCaption
                    // }}
                    modifiersClassNames={{
                        selected: 'rdp-selected',
                        today: 'rdp-today'
                    }}
                />
            </PopoverContent>
        </Popover>
    );
}

// COMMENTED OUT: 17-Jan-2026 - Old implementation with separate DatePicker components replaced with native range mode
// import DatePicker from "./DatePicker";
// const [tempStart, setTempStart] = useState(startDate);
// const [tempEnd, setTempEnd] = useState(endDate);
// Apply/Cancel button logic removed - native range selection is more intuitive

// COMMENTED OUT: 17-Jan-2026 - Removed numberOfMonths={2} to show single calendar instead of two side-by-side
// numberOfMonths={2}