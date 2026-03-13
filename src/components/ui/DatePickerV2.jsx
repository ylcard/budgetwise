/**
 * @fileoverview DatePickerV2 — Test replacement for DatePicker.
 * Uses Base UI Drawer on mobile (avoids Vaul focus-trap issues with native <select>)
 * and Shadcn Popover on desktop.
 * CREATED: 13-Mar-2026
 */

import { useState, useCallback } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CustomButton } from "@/components/ui/CustomButton";
import { CalendarView } from "@/components/ui/DatePicker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Drawer } from "@base-ui/react/drawer";
import { useSettings } from "../utils/SettingsContext";
import { parseDate, formatDateString, formatDate } from "../utils/dateUtils";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * DatePickerV2 — same API as DatePicker.
 * Mobile: Base UI Drawer bottom sheet.
 * Desktop: Shadcn Popover.
 */
export default function DatePickerV2({
  value,
  onChange,
  placeholder = "Pick a date",
  className = "",
}) {
  const { settings } = useSettings();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const dateValue = value ? parseDate(value) : undefined;

  const handleSelect = useCallback(
    (date) => {
      if (date) {
        const formattedDate = formatDateString(date);
        onChange(formattedDate);
        setOpen(false);
      }
    },
    [onChange],
  );

  const triggerLabel = value
    ? formatDate(value, settings.dateFormat)
    : placeholder;

  // ─── Desktop: Popover ───
  if (!isMobile) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <CustomButton
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground",
              className,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {triggerLabel}
          </CustomButton>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-[600]" align="start" sideOffset={4}>
          <CalendarView selected={dateValue} onSelect={handleSelect} />
        </PopoverContent>
      </Popover>
    );
  }

  // ─── Mobile: Base UI Drawer ───
  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger
        render={
          <CustomButton
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground",
              className,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {triggerLabel}
          </CustomButton>
        }
      />

      <Drawer.Portal>
        <Drawer.Backdrop
          className="fixed inset-0 bg-black/40 z-[9998]"
        />
        <Drawer.Viewport className="fixed inset-0 z-[9999] pointer-events-none">
          <Drawer.Popup
            className="pointer-events-auto fixed bottom-0 left-0 right-0 flex flex-col rounded-t-2xl bg-background shadow-xl will-change-transform"
            style={{
              transform: "translateY(calc(var(--drawer-snap-point-offset, 0px) + var(--drawer-swipe-movement-y, 0px)))",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <Drawer.Content className="flex flex-col items-center px-4 pt-3 pb-6">
              {/* Drag handle */}
              <div className="mb-3 h-1.5 w-12 rounded-full bg-muted-foreground/30" />

              <Drawer.Title className="sr-only">Select a date</Drawer.Title>

              <CalendarView selected={dateValue} onSelect={handleSelect} />

              <Drawer.Close
                className="mt-2 w-full rounded-lg border border-border py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                Cancel
              </Drawer.Close>
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}