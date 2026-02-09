import React from 'react';
import { cn } from '@/lib/utils';

/**
 * CREATED: 02-Feb-2026
 * Segmented Control - Tab-like styled component for view switching
 */

const SegmentedControl = ({ options, value, onChange, className }) => {
    return (
        <div className={cn("inline-flex items-center gap-1 p-1 bg-gray-100 rounded-lg", className)}>
            {options.map((option) => {
                const isActive = value === option.value;
                return (
                    <button
                        key={option.value}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-300 ease-in-out",
                            isActive 
                                ? "bg-white text-gray-900 shadow-sm" 
                                : "text-gray-600 hover:text-gray-900"
                        )}
                    >
                        {option.label}
                        {isActive && option.desktopLabel && (
                            <span className="hidden md:inline overflow-hidden whitespace-nowrap animate-in fade-in slide-in-from-left-1 duration-300">
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
