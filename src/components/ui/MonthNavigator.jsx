import React from "react";
// UPDATED 16-Jan-2025: Replaced Button with CustomButton for consistency
// import { Button } from "@/components/ui/button";
import { CustomButton } from "@/components/ui/CustomButton";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
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
    <div className="flex items-center gap-3">
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
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <CustomButton
              variant="outline"
              size="sm"
              onClick={goToCurrentMonth}
              className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Current Month
            </CustomButton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// UPDATED 16-Jan-2025: Replaced shadcn Button with CustomButton
// - Previous/Next month buttons now use CustomButton with variant="ghost" size="icon"
// - "Current Month" button uses CustomButton with variant="outline" size="sm"
// - Month/year selector button (line 53) intentionally kept as native <button>
//   REASON: This button acts as a trigger for MonthYearPickerPopover's PopoverTrigger
//   The Popover library expects its trigger to be a direct child, and wrapping it in
//   CustomButton could interfere with Popover's internal ref management and event handling
// - All functionality preserved, consistent styling applied where appropriate