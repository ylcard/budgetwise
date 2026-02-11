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
                        ? (isExpanded ? "bg-white border border-gray-200 shadow-xl p-1 absolute right-0 flex-row" : "bg-transparent")
                        : "bg-gray-100 p-1 shadow-sm relative md:w-auto"
                )}
                initial={false}
            >
                <AnimatePresence mode="popLayout" initial={false}>
                    {options.map((option) => {
                        const isActive = value === option.value;
                        const shouldShow = !isMobile || isExpanded || isActive;

                        if (!shouldShow) return null;

                        return (
                            <motion.button
                                key={option.value}
                                layout="position"
                                initial={{ opacity: 0, scale: 0.5, width: 0 }}
                                animate={{ opacity: 1, scale: 1, width: 'auto' }}
                                exit={{ opacity: 0, scale: 0.5, width: 0 }}
                                transition={{ duration: 0.2 }}
                                onClick={() => handleSelect(option.value)}
                                className={cn(
                                    "flex items-center justify-center gap-2 px-2 py-1.5 text-sm font-medium rounded-md transition-all duration-200 shrink-0",
                                    isActive && (!isMobile || isExpanded) ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900",
                                    // Single icon state formatting
                                    !isExpanded && isMobile && isActive && "bg-gray-100 shadow-sm px-0 w-10 h-10 rounded-lg"
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
