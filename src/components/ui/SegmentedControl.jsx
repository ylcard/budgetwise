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
                            "px-4 py-2 text-sm font-medium rounded-md transition-all duration-200",
                            isActive 
                                ? "bg-white text-gray-900 shadow-sm" 
                                : "text-gray-600 hover:text-gray-900"
                        )}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
};

export default SegmentedControl;