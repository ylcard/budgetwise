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

// COMMENTED OUT: 17-Jan-2026 - react-day-picker v9 removed useNavigation hook and custom caption support
// Using captionLayout="dropdown-buttons" instead for navigation
// import { useNavigation } from "react-day-picker";
// import { ScrollArea } from "@/components/ui/scroll-area";
// import { getMonthName } from "../utils/dateUtils";
// import { setMonth, setYear } from "date-fns";

// COMMENTED OUT: 17-Jan-2026 - Custom caption not supported in react-day-picker v9
// Using built-in dropdown navigation with captionLayout prop instead
// /**
//  * Custom Caption component for DayPicker range mode.
//  */
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
                    className="p-3"
                    weekStartsOn={1}
                    showOutsideDays
                    captionLayout="dropdown-buttons"
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

// COMMENTED OUT: 17-Jan-2026 - Old implementation with separate DatePicker components replaced with native range mode
// import DatePicker from "./DatePicker";
// const [tempStart, setTempStart] = useState(startDate);
// const [tempEnd, setTempEnd] = useState(endDate);
// Apply/Cancel button logic removed - native range selection is more intuitive

// COMMENTED OUT: 17-Jan-2026 - Removed numberOfMonths={2} to show single calendar instead of two side-by-side
// numberOfMonths={2}