/**
 * @fileoverview DatePickerV2 — Test replacement for DatePicker.
 * Uses Base UI Drawer on mobile (avoids Vaul focus-trap issues with native <select>)
 * and Shadcn Popover on desktop.
 * CREATED: 13-Mar-2026
 */

import { useState, useCallback, useRef } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CustomButton } from "@/components/ui/CustomButton";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
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
 * Shared RDP v9 CSS variable overrides.
 */
/** @type {React.CSSProperties} RDP v9 CSS variable overrides */
const BASE_RDP_VARS = {
  "--rdp-accent-color": "hsl(var(--primary))",
  "--rdp-accent-background-color": "hsl(var(--primary))",
  "--rdp-outside-opacity": "0.35",
  /* Kill inherited border-color from global * { border-border } reset */
  "--rdp-selected-border": "none",
};

/**
 * Prevents pointer events on <select> dropdowns from bubbling up to
 * the Base UI Drawer drag handler, which otherwise interprets them as swipe gestures.
 * @param {React.PointerEvent|React.TouchEvent} e
 */
function stopDragOnDropdowns(e) {
  const tag = e.target?.tagName;
  if (tag === "SELECT" || tag === "OPTION") {
    e.stopPropagation();
  }
}

/**
 * @param {object} props
 * @param {Date|undefined} props.selected
 * @param {(date: Date) => void} props.onSelect
 * @param {boolean} [props.mobile=false]
 */
function StyledCalendar({ selected, onSelect, mobile = false }) {
  const defaultClassNames = getDefaultClassNames();
  return (
    <div
      className={cn(
        mobile && "w-full overflow-hidden px-2",
      )}
      onPointerDown={mobile ? stopDragOnDropdowns : undefined}
      onPointerMove={mobile ? stopDragOnDropdowns : undefined}
    >
      <DayPicker
        mode="single"
        navLayout="around"
        selected={selected}
        onSelect={onSelect}
        defaultMonth={selected}
        weekStartsOn={1}
        showOutsideDays
        fixedWeeks
        captionLayout="dropdown"
        startMonth={new Date(1986, 0)}
        endMonth={new Date(2100, 11)}
        className="rdp-v2-calendar"
        style={BASE_RDP_VARS}
        classNames={{
          selected: `${defaultClassNames.selected} bg-primary text-primary-foreground rounded-md`,
          today: `${defaultClassNames.today} font-bold text-primary`,
          chevron: `${defaultClassNames.chevron} fill-foreground`,
          outside: `${defaultClassNames.outside} text-muted-foreground/40`,
        }}
      />
    </div>
  );
}

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
          <StyledCalendar selected={dateValue} onSelect={handleSelect} />
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
        <Drawer.Backdrop className="fixed inset-0 bg-black/40 z-[9998]" />
        <Drawer.Viewport className="fixed inset-0 z-[9999] pointer-events-none">
          <Drawer.Popup
            className="pointer-events-auto fixed bottom-0 left-0 right-0 flex flex-col rounded-t-2xl bg-background shadow-xl will-change-transform overflow-hidden"
            style={{
              transform: "translateY(calc(var(--drawer-snap-point-offset, 0px) + var(--drawer-swipe-movement-y, 0px)))",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <div className="flex flex-col items-center px-4 pt-3 pb-6 overflow-hidden">
              {/* Drag handle */}
              <div className="mb-3 h-1.5 w-12 rounded-full bg-muted-foreground/30" />

              <Drawer.Title className="sr-only">Select a date</Drawer.Title>

              <StyledCalendar selected={dateValue} onSelect={handleSelect} mobile />

              <Drawer.Close
                className="mt-2 mx-2 w-[calc(100%-1rem)] rounded-lg border border-border py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                Cancel
              </Drawer.Close>
            </div>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}