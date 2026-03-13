/**
 * @fileoverview TestDatePicker — Sandbox page to test DatePickerV2
 * (Base UI Drawer on mobile, Popover on desktop).
 * CREATED: 13-Mar-2026
 */

import { useState } from "react";
import DatePickerV2 from "@/components/ui/DatePickerV2";

export default function TestDatePicker() {
  const [date, setDate] = useState(null);

  return (
    <div className="p-6 max-w-md mx-auto space-y-6">
      <h1 className="text-xl font-bold text-foreground">DatePickerV2 Test</h1>
      <p className="text-sm text-muted-foreground">
        Uses Base UI Drawer on mobile and Popover on desktop.
        Try opening the picker and using the month/year dropdowns.
      </p>

      <DatePickerV2
        value={date}
        onChange={setDate}
        placeholder="Pick a date"
      />

      {date && (
        <p className="text-sm text-foreground">
          Selected: <span className="font-mono font-semibold">{date}</span>
        </p>
      )}
    </div>
  );
}