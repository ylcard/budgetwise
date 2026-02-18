import React, { useState, useRef, useEffect, useId } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';

/**
 * CREATED: 02-Feb-2026
 * Segmented Control - Tab-like styled component for view switching
 */

const SegmentedControl = ({ options, value, onChange, className }) => {
    // Syncing parent and child transitions prevents the 2-step stutter
    const sharedTransition = { type: "spring", bounce: 0, duration: 0.35 };

    // The Wrapper: Holds physical space in the UI so the header never jumps
    return (
        <div className={cn("flex items-center justify-end h-[40px]", className)}>
            <motion.div
                layout
                className={cn(
                    "flex items-center gap-1 rounded-lg transition-colors overflow-hidden",
                    "bg-muted p-1 shadow-sm relative"
                )}
                initial={false}
                transition={sharedTransition}
            >
                <AnimatePresence initial={false}>
                    {options.map((option) => {
                        const isActive = value === option.value;
                        // Removed complex mobile logic: Always show all options.
                        // This is simpler, more stable, and prevents layout overlap.
                        const shouldShow = true;

                        if (!shouldShow) return null;

                        const animationProps = { opacity: 1, width: "auto", paddingLeft: 8, paddingRight: 8 };

                        return (
                            <motion.button
                                key={option.value}
                                layout
                                initial={{ opacity: 0, width: 0, paddingLeft: 0, paddingRight: 0 }}
                                animate={animationProps}
                                exit={{ opacity: 0, width: 0, paddingLeft: 0, paddingRight: 0 }}
                                transition={sharedTransition}
                                onClick={() => onChange(option.value)}
                                className={cn(
                                    "flex items-center justify-center gap-2 py-1.5 text-sm font-medium rounded-md transition-colors shrink-0 overflow-hidden whitespace-nowrap",
                                    isActive ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                                )}
                            >
                                <span className="flex items-center justify-center shrink-0">
                                    {option.label}
                                </span>
                                {option.desktopLabel && (
                                    <motion.span
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="hidden md:inline whitespace-nowrap text-xs md:text-sm"
                                    >
                                        {option.desktopLabel}
                                    </motion.span>
                                )}
                            </motion.button>
                        );
                    })}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default SegmentedControl;
