import React, { useState, useRef, useEffect, useId } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';

/**
 * CREATED: 02-Feb-2026
 * Segmented Control - Tab-like styled component for view switching
 */

const SegmentedControl = ({ options, value, onChange, className }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isMobile = useIsMobile();
    const containerRef = useRef(null);

    // Syncing parent and child transitions prevents the 2-step stutter
    const sharedTransition = { type: "spring", bounce: 0, duration: 0.35 };

    // Collapse when clicking outside or scrolling
    useEffect(() => {
        if (!isExpanded) return;
        const handleCollapse = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsExpanded(false);
            }
        };

        const handleScroll = () => setIsExpanded(false);
        document.addEventListener("mousedown", handleCollapse);
        window.addEventListener("scroll", handleScroll, { passive: true });

        return () => {
            document.removeEventListener("mousedown", handleCollapse);
            window.removeEventListener("scroll", handleScroll);
        };
    }, [isExpanded]);

    const handleSelect = (val) => {
        // If collapsed on mobile, clicking the icon just expands it
        if (isMobile && !isExpanded) {
            setIsExpanded(true);
            return;
        }

        // Otherwise, update the view and collapse
        onChange(val);
        if (isMobile) {
            setIsExpanded(false);
        }
    };

    // The Wrapper: Holds physical space in the UI so the header never jumps
    return (
        <div ref={containerRef} className={cn("relative flex items-center justify-end h-[40px] z-50 md:w-auto", isMobile ? "w-[40px]" : "", className)}>
            <motion.div
                layout
                className={cn(
                    "flex items-center gap-1 rounded-lg transition-colors overflow-hidden",
                    isMobile
                        ? (isExpanded ? "bg-popover border border-border shadow-xl p-1 absolute right-0 flex-row" : "bg-transparent")
                        : "bg-muted p-1 shadow-sm relative md:w-auto"
                )}
                initial={false}
                transition={sharedTransition}
            >
                <AnimatePresence initial={false}>
                    {options.map((option) => {
                        const isActive = value === option.value;
                        const isSingleMobileIcon = isMobile && !isExpanded && isActive;
                        const shouldShow = !isMobile || isExpanded || isActive;

                        if (!shouldShow) return null;

                        const animationProps = isSingleMobileIcon
                            ? { opacity: 1, width: 40, paddingLeft: 0, paddingRight: 0 }
                            : { opacity: 1, width: "auto", paddingLeft: 8, paddingRight: 8 };

                        return (
                            <motion.button
                                key={option.value}
                                layout
                                initial={{ opacity: 0, width: 0, paddingLeft: 0, paddingRight: 0 }}
                                animate={animationProps}
                                exit={{ opacity: 0, width: 0, paddingLeft: 0, paddingRight: 0 }}
                                transition={sharedTransition}
                                onClick={() => handleSelect(option.value)}
                                className={cn(
                                    "flex items-center justify-center gap-2 py-1.5 text-sm font-medium rounded-md transition-colors shrink-0 overflow-hidden whitespace-nowrap",
                                    isActive && (!isMobile || isExpanded) ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                                    // Single icon state formatting
                                    isSingleMobileIcon && "bg-muted shadow-sm h-10 rounded-lg"
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
