
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useSettings } from "../utils/SettingsContext";
import { formatCurrency, unformatCurrency } from "../utils/currencyUtils";

export default function AmountInput({
    value,
    onChange,
    placeholder = "0.00",
    className = "",
    currencySymbol = null, // New prop to override default symbol
    ...props
}) {
    const { settings } = useSettings();

    // Use provided currencySymbol or fall back to user's base currency
    const displaySymbol = currencySymbol || settings.currencySymbol;

    // 1. ADD STATE: State to hold the formatted string visible in the input field
    const [displayValue, setDisplayValue] = useState(
        value !== null && value !== undefined && !isNaN(value) ? formatCurrency(value, settings) : ''
    );

    // 2. ADD EFFECT: Sync displayValue when the external 'value' prop changes
    useEffect(() => {
        // Check if external 'value' (number) differs from the number represented by our display string
        const currentNumericValue = parseFloat(unformatCurrency(displayValue, settings));

        if (value === null || value === undefined || isNaN(value)) {
            if (displayValue !== '') setDisplayValue('');
        } else if (value !== currentNumericValue) {
            setDisplayValue(formatCurrency(value, settings));
        }
    }, [value, settings]);

    const handleChange = (e) => {
        const rawInput = e.target.value;

        // 1. Update the internal display state immediately
        setDisplayValue(rawInput);

        // 2. Unformat the string to get a standard numeric string ('1000.50')
        const numericString = unformatCurrency(rawInput, settings);

        // 3. Basic validation: allow empty string, or a string that looks like a standard number
        const numericRegex = /^-?\d*\.?\d*$/;

        if (numericString === '') {
            onChange(null);
        } else if (numericRegex.test(numericString)) {
            // Parse and enforce precision before sending to parent
            const parsedValue = parseFloat(numericString);

            // CRITICAL: Round result to 2 decimal places to fix floating-point math
            const roundedValue = Math.round(parsedValue * 100) / 100;

            onChange(roundedValue);
        }
    };

    return (
        <div className="relative">
            {settings.currencyPosition === 'before' && (
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm font-medium">
                        {displaySymbol}
                    </span>
                </div>
            )}
            <Input
                type="text"
                inputMode="decimal"
                value={displayValue}
                onChange={handleChange}
                placeholder={placeholder}
                className={`${settings.currencyPosition === 'before' ? 'pl-8' : 'pr-8'} ${className}`}
                {...props}
            />
            {settings.currencyPosition === 'after' && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm font-medium">
                        {displaySymbol}
                    </span>
                </div>
            )}
        </div>
    );
}