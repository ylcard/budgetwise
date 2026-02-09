import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

/**
 * CREATED: 02-Feb-2026
 * Segmented Control - Tab-like styled component for view switching
 */

const SegmentedControl = ({ options, value, onChange, className }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const containerRef = useRef(null);

    // Collapse when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsExpanded(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
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
                "inline-flex items-center gap-1 p-1 bg-gray-100 rounded-lg transition-all duration-300",
                "md:relative", // Desktop is normal
                isExpanded ? "absolute right-0 left-0 z-10 shadow-lg mx-4" : "relative", // Mobile morph
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
