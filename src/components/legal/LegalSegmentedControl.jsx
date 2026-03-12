/**
 * LegalSegmentedControl — Full-width segmented control with icon+text labels.
 * CREATED 12-Mar-2026
 * Isolated from the shared SegmentedControl so changes here don't affect other pages.
 */
import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const LegalSegmentedControl = React.memo(({ options, value, onChange }) => {
  return (
    <div className="w-full rounded-lg bg-muted p-1 flex gap-1">
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex-1 flex items-center justify-center gap-1.5 py-2 text-xs md:text-sm font-medium rounded-md transition-colors",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {/* Animated active background */}
            {isActive && (
              <motion.div
                layoutId="legal-seg-active"
                className="absolute inset-0 bg-background rounded-md shadow-sm"
                transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {option.icon}
              {option.text}
            </span>
          </button>
        );
      })}
    </div>
  );
});

LegalSegmentedControl.displayName = "LegalSegmentedControl";

export default LegalSegmentedControl;