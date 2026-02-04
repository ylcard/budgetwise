/**
 * @fileoverview Modern Month/Year Picker with grid layout
 * REDESIGNED: 17-Jan-2026 - New modern design inspired by react-native-modern-datepicker
 */

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getMonthName } from "../utils/dateUtils";
import { CustomButton } from "@/components/ui/CustomButton";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

export default function MonthYearPickerPopover({ currentMonth, currentYear, onMonthChange, children }) {
    const [open, setOpen] = useState(false);
    const [tempYear, setTempYear] = useState(currentYear);

    // Months in reverse chronological order (12 -> 1)
    const months = [
        { index: 2, label: "March" },
        { index: 1, label: "February" },
        { index: 0, label: "January" },
        { index: 5, label: "June" },
        { index: 4, label: "May" },
        { index: 3, label: "April" },
        { index: 8, label: "September" },
        { index: 7, label: "August" },
        { index: 6, label: "July" },
        { index: 11, label: "December" },
        { index: 10, label: "November" },
        { index: 9, label: "October" },
    ];

    const handleYearChange = (delta) => {
        setTempYear(prev => prev + delta);
    };

    const handleMonthSelect = (monthIndex) => {
        onMonthChange(monthIndex, tempYear);
        setOpen(false);
    };

    const handleOpenChange = (isOpen) => {
        setOpen(isOpen);
        if (isOpen) {
            // Reset to current year when opening
            setTempYear(currentYear);
        }
    };

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>
            <PopoverContent className="max-w-[90vw] p-8" align="center">
                <div className="space-y-8">
                    {/* Year Navigation */}
                    <div className="flex items-center justify-between">
                        <CustomButton
                            variant="ghost"
                            size="icon"
                            onClick={() => handleYearChange(-1)}
                            className="h-10 w-10 hover:bg-gray-100"
                        >
                            <ChevronLeft className="h-5 w-5 text-cyan-500" />
                        </CustomButton>
                        <h2 className="text-2xl font-semibold text-gray-700">
                            {tempYear}
                        </h2>
                        <CustomButton
                            variant="ghost"
                            size="icon"
                            onClick={() => handleYearChange(1)}
                            className="h-10 w-10 hover:bg-gray-100"
                        >
                            <ChevronRight className="h-5 w-5 text-cyan-500" />
                        </CustomButton>
                    </div>

                    {/* Month Grid - 3x4 */}
                    <div className="grid grid-cols-3 gap-4">
                        {months.map(({ index, label }) => {
                            const isSelected = index === currentMonth && tempYear === currentYear;
                            return (
                                <button
                                    key={index}
                                    onClick={() => handleMonthSelect(index)}
                                    className={`
                                        py-3 px-4 rounded-2xl text-base font-medium transition-all
                                        ${isSelected 
                                            ? 'bg-cyan-400 text-white shadow-md' 
                                            : 'text-gray-600 hover:bg-gray-100'
                                        }
                                    `}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

// COMMENTED OUT: 17-Jan-2026 - Old select-based implementation replaced with modern grid design
// import {
//     Select,
//     SelectContent,
//     SelectItem,
//     SelectTrigger,
//     SelectValue,
// } from "@/components/ui/select";
// 
// Old implementation with dropdowns and Apply/Cancel buttons removed