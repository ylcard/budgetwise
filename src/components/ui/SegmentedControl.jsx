import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

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
        <div
            ref={containerRef}
            className={cn(
                "inline-flex items-center gap-1 p-1 bg-gray-100 rounded-lg transition-all duration-300 h-[40px] shadow-sm",
                "md:relative", // Desktop is normal
                isExpanded ? "absolute right-4 left-4 z-20 shadow-md" : "relative w-[40px] md:w-auto",
                className
            )}
        >
            {options.map((option) => {
                const isActive = value === option.value;
                const shouldShow = isExpanded || isActive || window.innerWidth >= 768;

                if (!shouldShow) return null;

                return (
                    <button
                        key={option.value}
                        onClick={() => handleSelect(option.value)}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-300",
                            isActive
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-600 hover:text-gray-900"
                        )}
                    >
                        {option.label}
                        {(isActive || (isExpanded && window.innerWidth < 768)) && option.desktopLabel && (
                            <span className="hidden md:inline">
                                {option.desktopLabel}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export default SegmentedControl;
