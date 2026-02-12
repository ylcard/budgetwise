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

    // Generate 0-11 array to ensure natural chronological sorting
    const monthIndices = Array.from({ length: 12 }, (_, i) => i);

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
            <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[380px] p-4 sm:p-8" align="center">
                <div className="space-y-6 sm:space-y-8">
                    {/* Year Navigation */}
                    <div className="flex items-center justify-between">
                        <CustomButton
                            variant="ghost"
                            size="icon"
                            onClick={() => handleYearChange(-1)}
                            className="h-10 w-10 hover:bg-accent hover:text-accent-foreground"
                        >
                            <ChevronLeft className="h-5 w-5 text-cyan-500" />
                        </CustomButton>
                        <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
                            {tempYear}
                        </h2>
                        <CustomButton
                            variant="ghost"
                            size="icon"
                            onClick={() => handleYearChange(1)}
                            className="h-10 w-10 hover:bg-accent hover:text-accent-foreground"
                        >
                            <ChevronRight className="h-5 w-5 text-cyan-500" />
                        </CustomButton>
                    </div>

                    {/* Month Grid - 3x4 */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                        {monthIndices.map((index) => {
                            const isSelected = index === currentMonth && tempYear === currentYear;
                            const fullLabel = getMonthName(index);
                            const shortLabel = fullLabel.substring(0, 3);

                            return (
                                <button
                                    key={index}
                                    onClick={() => handleMonthSelect(index)}
                                    className={`
                                        py-3 px-2 sm:px-4 rounded-xl sm:rounded-2xl text-sm sm:text-base font-medium transition-all
                                        ${isSelected
                                            ? 'bg-cyan-400 text-white shadow-md'
                                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                        }
                                    `}
                                >
                                    <span className="hidden sm:block">{fullLabel}</span>
                                    <span className="block sm:hidden">{shortLabel}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
