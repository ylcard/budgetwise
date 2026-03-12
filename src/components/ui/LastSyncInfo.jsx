import { memo } from "react";
import { formatDate } from "../utils/dateUtils";
import { cn } from "@/lib/utils";

/**
 * LastSyncInfo Component
 * Centralized indicator for bank synchronization timestamps.
 */
const LastSyncInfo = memo(function LastSyncInfo({ 
  date, 
  settings, 
  prefix = "Last synced:", 
  className,
  formatOverride 
}) {
  if (!date) return null;

  return (
    <span className={cn("text-gray-500", className)}>
      {prefix} {formatDate(date, formatOverride || settings)}
    </span>
  );
});

export default LastSyncInfo;
