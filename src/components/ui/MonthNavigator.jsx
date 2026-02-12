
import { CustomButton } from "@/components/ui/CustomButton";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MonthYearPickerPopover from "./MonthYearPickerPopover";
import { getMonthName } from "../utils/dateUtils";

export default function MonthNavigator({ currentMonth, currentYear, onMonthChange, resetPosition = "bottom" }) {
    const now = new Date();
    const isCurrentMonth = currentMonth === now.getMonth() && currentYear === now.getFullYear();

    // Configuration map for ABSOLUTE positioning
    // We use absolute positioning so the "Reset" button doesn't affect the layout width/height.
    // NOTE: We removed the translate-x/y classes here because Framer Motion overwrites CSS transforms.
    // We will handle centering in the motion props instead.
    const positionConfig = {
        bottom: { className: "top-full left-1/2 mt-2", axis: "x" },
        top: { className: "bottom-full left-1/2 mb-2", axis: "x" },
        left: { className: "right-full top-1/2 mr-2", axis: "y" },
        right: { className: "left-full top-1/2 ml-2", axis: "y" },
    };

    // Fallback to 'bottom' if an invalid prop is passed
    const config = positionConfig[resetPosition] || positionConfig.bottom;

    // Determine which axis needs to be centered (-50%)
    const centerTransform = config.axis === "x" ? { x: "-50%" } : { y: "-50%" };

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
            <div className="flex items-center gap-1 sm:gap-2 bg-card rounded-lg shadow-sm border border-border p-1">
                <CustomButton
                    variant="ghost"
                    size="icon"
                    onClick={goToPreviousMonth}
                    className="h-8 w-8 shrink-0 hover:bg-accent text-muted-foreground hover:text-foreground"
                >
                    <ChevronLeft className="w-5 h-5" />
                </CustomButton>

                <MonthYearPickerPopover
                    currentMonth={currentMonth}
                    currentYear={currentYear}
                    onMonthChange={onMonthChange}
                >
                    <button
                        className="px-2 sm:px-4 py-1 min-w-[130px] sm:min-w-[160px] text-sm sm:text-base text-center font-bold text-foreground hover:text-primary transition-colors cursor-pointer rounded hover:bg-accent truncate"
                    >
                        {getMonthName(currentMonth)} {currentYear}
                    </button>
                </MonthYearPickerPopover>

                <CustomButton
                    variant="ghost"
                    size="icon"
                    onClick={goToNextMonth}
                    className="h-8 w-8 shrink-0 hover:bg-accent text-muted-foreground hover:text-foreground"
                >
                    <ChevronRight className="w-5 h-5" />
                </CustomButton>
            </div>

            <AnimatePresence>
                {!isCurrentMonth && (
                    <motion.div
                        // Apply the centering transform (x or y) here so Framer doesn't overwrite it
                        initial={{ opacity: 0, scale: 0.5, ...centerTransform }}
                        animate={{ opacity: 1, scale: 1, ...centerTransform }}
                        exit={{ opacity: 0, scale: 0.5, ...centerTransform }}
                        className={`absolute ${config.className}`}
                    >
                        <CustomButton
                            variant="ghost"
                            size="icon"
                            onClick={goToCurrentMonth}
                            className="h-6 w-6 rounded-full text-muted-foreground hover:text-primary hover:bg-accent bg-background/50 backdrop-blur-sm border border-transparent hover:border-border shadow-sm"
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
