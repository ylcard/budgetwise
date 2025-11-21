import React from "react";
import { CustomButton } from "@/components/ui/CustomButton";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MonthYearPickerPopover from "./MonthYearPickerPopover";

export default function MonthNavigator({ currentMonth, currentYear, onMonthChange }) {
    const now = new Date();
    const isCurrentMonth = currentMonth === now.getMonth() && currentYear === now.getFullYear();

    const goToPreviousMonth = () => {
        if (currentMonth === 0) {
            onMonthChange(11, currentYear - 1);
        } else {
            onMonthChange(currentMonth - 1, currentYear);
        }
    };

    const goToNextMonth = () => {
        if (currentMonth === 11) {
            onMonthChange(0, currentYear + 1);
        } else {
            onMonthChange(currentMonth + 1, currentYear);
        }
    };

    const goToCurrentMonth = () => {
        onMonthChange(now.getMonth(), now.getFullYear());
    };

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    return (
        <div className="flex flex-col items-center gap-2 w-fit">
            <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border border-gray-200 p-1">
                <CustomButton
                    variant="ghost"
                    size="icon"
                    onClick={goToPreviousMonth}
                    className="h-8 w-8 hover:bg-blue-50 text-gray-700 hover:text-blue-600"
                >
                    <ChevronLeft className="w-5 h-5" />
                </CustomButton>

                <MonthYearPickerPopover
                    currentMonth={currentMonth}
                    currentYear={currentYear}
                    onMonthChange={onMonthChange}
                >
                    <button
                        className="px-4 py-1 min-w-[160px] text-center font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer rounded hover:bg-blue-50"
                    >
                        {monthNames[currentMonth]} {currentYear}
                    </button>
                </MonthYearPickerPopover>

                <CustomButton
                    variant="ghost"
                    size="icon"
                    onClick={goToNextMonth}
                    className="h-8 w-8 hover:bg-blue-50 text-gray-700 hover:text-blue-600"
                >
                    <ChevronRight className="w-5 h-5" />
                </CustomButton>
            </div>

            <AnimatePresence>
                {!isCurrentMonth && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, height: 0 }}
                        animate={{ opacity: 1, scale: 1, height: "auto" }}
                        exit={{ opacity: 0, scale: 0.8, height: 0 }}
                    >
                        <CustomButton
                            variant="ghost"
                            size="icon"
                            onClick={goToCurrentMonth}
                            className="h-6 w-6 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 mt-1"
                            title="Reset to Current Month"
                        >
                            <RotateCcw className="w-3 h-3" />
                        </CustomButton>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

