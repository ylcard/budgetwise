import React, { useState, useRef, useEffect } from 'react';
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
        const handleCollapse = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsExpanded(false);
            }
        };

        document.addEventListener("mousedown", handleCollapse);
        const handleScroll = () => setIsExpanded(false);
        window.addEventListener("scroll", handleScroll, { passive: true });

        return () => {
            document.removeEventListener("mousedown", handleCollapse);
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    const handleSelect = (val) => {
        if (!isExpanded && isMobile) {
            setIsExpanded(true);
            return;
        }
        onChange(val);
        setIsExpanded(false);
    };

    return (
        <motion.div
            ref={containerRef}
            layout="position"
            layoutId="segmented-control-container"
            className={cn(
                "inline-flex items-center gap-1 rounded-lg h-[40px]",
                "md:relative md:bg-gray-100 md:p-1 md:shadow-sm",
                isExpanded ? "absolute inset-x-4 z-50 shadow-xl bg-gray-100 p-1 origin-right flex-row" : "relative md:w-auto",
                className
            )}
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
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            onClick={() => handleSelect(option.value)}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 px-2 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
                                isActive
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-600 hover:text-gray-900"
                            )}
                        >
                            {option.label}
                            {(isExpanded || !isMobile) && option.desktopLabel && (
                                <motion.span
                                    layout
                                   className={cn("whitespace-nowrap", !isExpanded && "hidden md:inline")}
                                >
                                    {option.desktopLabel}
                                </motion.span>
                            )}
                        </motion.button>
                    );
                })}
            </AnimatePresence>
        </motion.div>
    );
};

export default SegmentedControl;
