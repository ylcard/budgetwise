import React, { useState } from "react";
// UPDATED 16-Jan-2025: Replaced Button with CustomButton for consistency
// import { Button } from "@/components/ui/button";
import { CustomButton } from "@/components/ui/CustomButton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function MonthYearPickerPopover({ currentMonth, currentYear, onMonthChange, children }) {
  const [open, setOpen] = useState(false);
  const [tempMonth, setTempMonth] = useState(currentMonth);
  const [tempYear, setTempYear] = useState(currentYear);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Generate year options: current year ± 5 years
  const currentYearNow = new Date().getFullYear();
  const years = [];
  for (let i = currentYearNow - 5; i <= currentYearNow + 5; i++) {
    years.push(i);
  }

  const handleApply = () => {
    onMonthChange(tempMonth, tempYear);
    setOpen(false);
  };

  const handleCancel = () => {
    setTempMonth(currentMonth);
    setTempYear(currentYear);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80" align="center">
        <div className="space-y-4">
          <h4 className="font-semibold text-sm">Select Month & Year</h4>
          
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600">Month</label>
            <Select
              value={tempMonth.toString()}
              onValueChange={(value) => setTempMonth(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthNames.map((month, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600">Year</label>
            <Select
              value={tempYear.toString()}
              onValueChange={(value) => setTempYear(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2">
            <CustomButton
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="flex-1"
            >
              Cancel
            </CustomButton>
            <CustomButton
              variant="primary"
              size="sm"
              onClick={handleApply}
              className="flex-1"
            >
              Apply
            </CustomButton>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// UPDATED 16-Jan-2025: Replaced shadcn Button with CustomButton
// - Cancel button uses CustomButton with variant="outline"
// - Apply button uses CustomButton with variant="primary" (gradient blue-purple)
// - Removed manual gradient styling as variant="primary" provides it
// - All functionality preserved, consistent styling applied