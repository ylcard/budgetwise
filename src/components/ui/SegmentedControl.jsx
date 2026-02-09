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
    const instanceId = useId();

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
            layout
            layoutId={`container-${instanceId}`}
            className={cn(
                "inline-flex items-center gap-1 rounded-lg h-[40px] transition-colors",
                "md:relative md:bg-gray-100 md:p-1 md:shadow-sm",
                isExpanded ? "absolute right-6 top-1/2 -translate-y-1/2 z-50 shadow-xl bg-white border border-gray-200 p-1 origin-right flex-row" : "relative md:w-auto",
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
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={() => handleSelect(option.value)}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 px-2 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
                                isActive
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-600 hover:text-gray-900"
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
    );
};

export default SegmentedControl;
