import { CustomButton } from "@/components/ui/CustomButton";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MonthYearPickerPopover from "./MonthYearPickerPopover";
import { getMonthName } from "../utils/dateUtils";

export default function MonthNavigator({ currentMonth, currentYear, onMonthChange, resetPosition = "bottom" }) {
    const now = new Date();
    const isCurrentMonth = currentMonth === now.getMonth() && currentYear === now.getFullYear();

    // Configuration map for ABSOLUTE positioning
    // We use absolute positioning so the "Reset" button doesn't affect the layout width/height,
    // preventing the main navigator from "jumping" when the button appears.
    const positionConfig = {
        bottom: { className: "top-full left-1/2 -translate-x-1/2 mt-2" },
        top: { className: "bottom-full left-1/2 -translate-x-1/2 mb-2" },
        left: { className: "right-full top-1/2 -translate-y-1/2 mr-2" },
        right: { className: "left-full top-1/2 -translate-y-1/2 ml-2" },
    };

    // Fallback to 'bottom' if an invalid prop is passed
    const config = positionConfig[resetPosition] || positionConfig.bottom;

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

    return (
        // 'relative' is needed so the absolute child positions itself relative to this container
        <div className="relative flex items-center justify-center w-fit z-20">
            <div className="flex items-center gap-1 sm:gap-2 bg-white rounded-lg shadow-sm border border-gray-200 p-1">
                <CustomButton
                    variant="ghost"
                    size="icon"
                    onClick={goToPreviousMonth}
                    className="h-8 w-8 shrink-0 hover:bg-blue-50 text-gray-700 hover:text-blue-600"
                >
                    <ChevronLeft className="w-5 h-5" />
                </CustomButton>

                <MonthYearPickerPopover
                    currentMonth={currentMonth}
                    currentYear={currentYear}
                    onMonthChange={onMonthChange}
                >
                    <button
                        className="px-2 sm:px-4 py-1 min-w-[130px] sm:min-w-[160px] text-sm sm:text-base text-center font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer rounded hover:bg-blue-50 truncate"
                    >
                        {getMonthName(currentMonth)} {currentYear}
                    </button>
                </MonthYearPickerPopover>

                <CustomButton
                    variant="ghost"
                    size="icon"
                    onClick={goToNextMonth}
                    className="h-8 w-8 shrink-0 hover:bg-blue-50 text-gray-700 hover:text-blue-600"
                >
                    <ChevronRight className="w-5 h-5" />
                </CustomButton>
            </div>

            <AnimatePresence>
                {!isCurrentMonth && (
                    <motion.div
                        // Removed width/height animation since it's now absolute
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        className={`absolute ${config.className}`}
                    >
                        <CustomButton
                            variant="ghost"
                            size="icon"
                            onClick={goToCurrentMonth}
                            className="h-6 w-6 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 bg-white/50 backdrop-blur-sm border border-transparent hover:border-blue-100 shadow-sm"
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



