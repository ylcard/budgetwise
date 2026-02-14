/**
 * @fileoverview AmountInput component for currency input with localization and financial precision.
 * Handles display, synchronization, and parsing of localized currency strings based on user settings.
 */

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useSettings } from "../utils/SettingsContext";
import { formatCurrency, unformatCurrency } from "../utils/currencyUtils";
import { CustomButton } from "@/components/ui/CustomButton";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
// COMMENTED 14-Feb-2026: Replaced with dynamic REST Countries API data via useCurrencies hook
// import { SUPPORTED_CURRENCIES } from "../utils/constants";
import { useCurrencies } from "../hooks/useCurrencies"; // ADDED 14-Feb-2026
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { Loader2 } from "lucide-react"; // ADDED 14-Feb-2026: Loading spinner

/**
 * Custom input component designed for monetary amounts.
 * It handles formatting and parsing based on user's defined separators and currency position.
 * Can optionally act as a combined Amount + Currency selector.
 * 
 * @param {object} props
 * @param {number|null|undefined} props.value - The external numeric amount (e.g., 1234.56).
 * @param {function(number|null)} props.onChange - Handler to update the external numeric value. Receives the rounded number or null.
 * @param {string} [props.placeholder="0.00"] - Placeholder text for the input.
 * @param {string} [props.className=""] - Additional class names for the Input component.
 * @param {string|null} [props.currencySymbol=null] - Optional symbol to override the user's base currency symbol.
 * @param {string} [props.currency=null] - Optional currency code (e.g. "USD"). If provided along with onCurrencyChange, enables the selector.
 * @param {function(string)} [props.onCurrencyChange=null] - Handler for currency change.
 * @param {object} [props.settingsOverride=null] - Optional settings object to override context (for previews).
 * @param {object} props.... - Remaining props passed directly to the underlying Input component.
 * @returns {JSX.Element} The styled amount input with currency symbol or selector.
 */
export default function AmountInput({
    value,
    onChange,
    placeholder = "0.00",
    className = "",
    currencySymbol = null,
    currency = null,
    onCurrencyChange = null,
    settingsOverride = null,
    ...props
}) {
    // const { settings } = useSettings();
    const { settings: contextSettings } = useSettings();
    const settings = settingsOverride || contextSettings;
    const [open, setOpen] = useState(false);
    const isMobile = useIsMobile();
    
    // ADDED 14-Feb-2026: Fetch currencies from REST Countries API
    const { currencies: SUPPORTED_CURRENCIES, isLoading: currenciesLoading } = useCurrencies();

    // Use provided currencySymbol or fall back to user's base currency
    const displaySymbol = currencySymbol || settings.currencySymbol;

    // Determine if we are in "Combined Mode"
    const isCombined = currency && onCurrencyChange;

    /**
     * @type {[string, function(string)]} Internal state for the formatted string visible in the input field.
     */
    const [displayValue, setDisplayValue] = useState(
        // Use empty string instead of formatted "0" for zero/null values
        value !== null && value !== undefined && !isNaN(value) && value !== 0
            ? formatCurrency(Math.abs(value), settings).replace(displaySymbol, '').trim()
            : ''
    );

    /**
     * Synchronizes the internal display state when the external `value` prop changes (e.g., parent form reset).
     * Compares the external numeric value to the number represented by the current display string to avoid infinite loops.
     * @effect
     */
    useEffect(() => {
        // Check if external 'value' (number) differs from the number represented by our display string
        const currentNumericValue = parseFloat(unformatCurrency(displayValue || '', settings));

        if (value === null || value === undefined || isNaN(value) || value === 0) {
            // Set to empty string to show placeholder instead of "0"
            if (displayValue !== '') setDisplayValue('');
        } else if (Math.abs(value) !== Math.abs(currentNumericValue)) {
            setDisplayValue(formatCurrency(Math.abs(value), settings).replace(displaySymbol, '').trim());
        }
    }, [value, settings, displayValue]);

    /**
     * Handles raw user input, updates internal display, validates, parses, rounds, and notifies the parent.
     * @param {React.ChangeEvent<HTMLInputElement>} e
     */
    const handleChange = (e) => {
        const rawInput = e.target.value;

        // 1. Update the internal display state immediately
        setDisplayValue(rawInput);

        // 2. Unformat the string to get a standard numeric string ('1000.50')
        const numericString = unformatCurrency(rawInput, settings);

        // 3. Basic validation: allow empty string, or a string that looks like a standard number
        const numericRegex = /^-?\d*\.?\d*$/;

        if (numericString === '') {
            // Set displayValue to empty string to show placeholder
            setDisplayValue('');
            onChange(null);
        } else if (numericRegex.test(numericString)) {
            // Parse and enforce precision before sending to parent
            const parsedValue = parseFloat(numericString);

            // CRITICAL: Round result to 2 decimal places to fix floating-point math
            const roundedValue = Math.round(parsedValue * 100) / 100;

            onChange(roundedValue);
        }
    };

    // Render the Currency Selector Trigger
    const renderCurrencySelector = () => {
        //const selectedCurrency = SUPPORTED_CURRENCIES.find(c => c.code === currency);
        const selectedCurrencyObj = SUPPORTED_CURRENCIES.find(c => c.code === currency);

        const TriggerButton = (
            <CustomButton
                variant="ghost"
                role="combobox"
                aria-expanded={open}
                className="h-full rounded-r-none border-r border-gray-200 px-3 hover:bg-gray-50 text-gray-600 font-medium"
            >
                <span className="mr-1">{selectedCurrencyObj?.symbol || displaySymbol}</span>
                <span>{currency}</span>
            </CustomButton>
        );

        const CurrencyList = ({ mobile = false }) => (
            <Command className={mobile ? "h-full" : ""}>
                <CommandInput placeholder="Search currency..." className={mobile ? "h-12 text-base" : "h-8 text-xs"} />
                <CommandList>
                    {/* UPDATED 14-Feb-2026: Show loading state while fetching currencies */}
                    {currenciesLoading ? (
                        <div className="flex items-center justify-center py-6">
                            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                        </div>
                    ) : (
                        <>
                            <CommandEmpty>No currency found.</CommandEmpty>
                            <CommandGroup className={mobile ? "overflow-y-auto" : "max-h-64 overflow-y-auto [&::-webkit-scrollbar]:hidden"}>
                                {SUPPORTED_CURRENCIES.map((c) => (
                                    <CommandItem
                                        key={c.code}
                                        value={`${c.code} ${c.name}`}
                                        onSelect={() => {
                                            onCurrencyChange(c.code);
                                            setOpen(false);
                                        }}
                                        className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${currency === c.code ? 'bg-blue-50 text-blue-700' : ''} ${mobile ? 'py-3' : ''}`}
                                    >
                                        <span className="w-4 text-center text-gray-500 font-medium text-xs">{c.symbol}</span>
                                        <span className="font-medium text-sm">{c.code}</span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </>
                    )}
                </CommandList>
            </Command>
        );

        if (isMobile) {
            return (
                <div className="h-full">
                    <Drawer open={open} onOpenChange={setOpen}>
                        <DrawerTrigger asChild>
                            {TriggerButton}
                        </DrawerTrigger>
                        <DrawerContent className="z-[200] flex flex-col max-h-[85dvh]">
                            <DrawerHeader>
                                <DrawerTitle>Select Currency</DrawerTitle>
                            </DrawerHeader>
                            <div className="flex-1 overflow-hidden p-4 pt-0">
                                <CurrencyList mobile={true} />
                            </div>
                        </DrawerContent>
                    </Drawer>
                </div>
            );
        }

        return (
            <div className="h-full">
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        {TriggerButton}
                    </PopoverTrigger>
                    <PopoverContent className="w-[150px] p-0" align="start">
                        <CurrencyList />
                    </PopoverContent>
                </Popover>
            </div>
        );
    };

    return (
        <div className="relative flex items-center">
            {/* Left Side: Currency Selector OR Static Symbol */}
            {isCombined ? (
                <div className="absolute inset-y-0 left-0 z-10">
                    {renderCurrencySelector()}
                </div>
            ) : (
                settings.currencyPosition === 'before' && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm font-medium">
                            {displaySymbol}
                        </span>
                    </div>
                )
            )}

            <Input
                type="text"
                inputMode="decimal"
                // Empty string when displayValue is empty to show placeholder "0"
                value={displayValue}
                onChange={handleChange}
                // Always show placeholder when input is empty
                placeholder={placeholder}
                className={`
                    ${isCombined ? 'pl-[5.3rem]' : (settings.currencyPosition === 'before' ? 'pl-8' : 'pr-8')}
                    ${className}
                `}
                // Disable browser autocomplete for amount fields
                autoComplete="off"
                {...props}
            />

            {/* Right Side: Static Symbol (if position is after and not combined) */}
            {!isCombined && settings.currencyPosition === 'after' && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm font-medium">
                        {displaySymbol}
                    </span>
                </div>
            )}
        </div>
    );
}