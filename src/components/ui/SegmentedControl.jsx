import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * CREATED: 02-Feb-2026
 * Segmented Control - Tab-like styled component for view switching
 */

const SegmentedControl = ({ options, value, onChange, className }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const containerRef = useRef(null);

    // Collapse when clicking outside or scrolling
    useEffect(() => {
        const handleCollapse = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsExpanded(false);
            }
        };

        document.addEventListener("mousedown", handleCollapse);
        window.addEventListener("scroll", () => setIsExpanded(false), { passive: true });

        return () => {
            document.removeEventListener("mousedown", handleCollapse);
            window.removeEventListener("scroll", () => setIsExpanded(false));
        };
    }, []);

    const handleSelect = (val) => {
        if (!isExpanded && window.innerWidth < 768) {
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
            className={cn(
                "inline-flex items-center gap-1 rounded-lg h-[40px]",
                "md:relative md:bg-gray-100 md:p-1 md:shadow-sm", 
                isExpanded ? "absolute right-4 left-4 z-50 shadow-xl bg-gray-100 p-1" : "relative md:w-auto",
                className
            )}
        >
            <AnimatePresence mode="popLayout" initial={false}>
                {options.map((option) => {
                    const isActive = value === option.value;
                    const shouldShow = isExpanded || isActive || (typeof window !== 'undefined' && window.innerWidth >= 768);

                    if (!shouldShow) return null;

                    return (
                        <motion.button
                            key={option.value}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                            onClick={() => handleSelect(option.value)}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                                isActive
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-600 hover:text-gray-900"
                            )}
                        >
                            {option.label}
                            {(isActive || (isExpanded && window.innerWidth < 768)) && option.desktopLabel && (
                                <motion.span
                                    layout
                                    className="hidden md:inline"
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
