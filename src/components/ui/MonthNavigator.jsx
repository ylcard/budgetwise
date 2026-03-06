
/**
 * @fileoverview Month and Year navigation component with a popover picker and "Reset to Today" functionality.
 * Utilizes Framer Motion for the reset button transition and dateUtils for safe date handling.
 */

import { CustomButton } from "@/components/ui/CustomButton";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MonthYearPickerPopover from "./MonthYearPickerPopover";
import { getMonthName, getCurrentPeriodBoundaries } from "../utils/dateUtils";

/** 
 * Configuration map for ABSOLUTE positioning of the Reset button.
 * Defined outside component to prevent re-initialization.
 */
const POSITION_CONFIG = {
  bottom: { className: "top-full left-1/2 mt-2", axis: "x" },
  top: { className: "bottom-full left-1/2 mb-2", axis: "x" },
  left: { className: "right-full top-1/2 mr-2", axis: "y" },
  right: { className: "left-full top-1/2 ml-2", axis: "y" },
};

/**
 * @param {Object} props
 * @param {number} props.currentMonth - 0-indexed month (0-11).
 * @param {number} props.currentYear - Full year (YYYY).
 * @param {Function} props.onMonthChange - Callback (month, year) => void.
 * @param {'top'|'bottom'|'left'|'right'} [props.resetPosition="bottom"] - Where the reset button appears.
 */
export default function MonthNavigator({ currentMonth, currentYear, onMonthChange, resetPosition = "bottom" }) {
  // Get current time boundaries from utility to ensure timezone consistency
  const { currentYear: todayYear } = getCurrentPeriodBoundaries();
  const todayMonth = new Date().getMonth();

  const isCurrentMonth = currentMonth === todayMonth && currentYear === todayYear;

  const config = POSITION_CONFIG[resetPosition] || POSITION_CONFIG.bottom;
  const centerTransform = config.axis === "x" ? { x: "-50%" } : { y: "-50%" };

  const goToPreviousMonth = () => {
    const date = new Date(currentYear, currentMonth - 1);
    onMonthChange(date.getMonth(), date.getFullYear());
  };

  const goToNextMonth = () => {
    const date = new Date(currentYear, currentMonth + 1);
    onMonthChange(date.getMonth(), date.getFullYear());
  };

  const goToCurrentMonth = () => {
    onMonthChange(todayMonth, todayYear);
  };

  return (
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
