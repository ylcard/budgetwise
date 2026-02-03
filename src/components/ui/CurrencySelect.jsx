import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { MobileDrawerSelect } from "@/components/ui/MobileDrawerSelect"; // ADDED 03-Feb-2026: iOS-style action sheets
import { SUPPORTED_CURRENCIES } from "../utils/constants";

export default function CurrencySelect({ value, onValueChange, filterCurrencies = null, limitToCurrencies = null }) {
    // Support both filterCurrencies (legacy) and limitToCurrencies (new preferred name)
    const currencyLimit = limitToCurrencies || filterCurrencies;

    // Filter currencies if currencyLimit array is provided
    const displayCurrencies = currencyLimit && currencyLimit.length > 0
        ? SUPPORTED_CURRENCIES.filter(c => currencyLimit.includes(c.code))
        : SUPPORTED_CURRENCIES;

    // ADDED 03-Feb-2026: Prepare options for MobileDrawerSelect
    const options = displayCurrencies.map((currency) => ({
        value: currency.code,
        label: `${currency.symbol} ${currency.code}`
    }));

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <MobileDrawerSelect
            value={value}
            onValueChange={onValueChange}
            options={options}
            placeholder="Select Currency"
            selectedLabel={selectedOption?.label}
        >
            <Select value={value} onValueChange={onValueChange}>
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {displayCurrencies.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                            {currency.symbol} {currency.code}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </MobileDrawerSelect>
    );
}