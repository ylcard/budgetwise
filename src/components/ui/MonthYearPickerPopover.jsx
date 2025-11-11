import React, { useState } from "react";
import { Button } from "@/components/ui/button";
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600"
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// NEW COMPONENT (2025-01-12): MonthYearPickerPopover
// Reusable popover for selecting month and year with dropdown selects
// Used by MonthNavigator to make month name clickable