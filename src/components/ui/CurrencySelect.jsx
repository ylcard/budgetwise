import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { SUPPORTED_CURRENCIES } from "../utils/constants";

export default function CurrencySelect({ value, onValueChange, filterCurrencies = null, limitToCurrencies = null }) {
    // Support both filterCurrencies (legacy) and limitToCurrencies (new preferred name)
    const currencyLimit = limitToCurrencies || filterCurrencies;

    // Filter currencies if currencyLimit array is provided
    const displayCurrencies = currencyLimit && currencyLimit.length > 0
        ? SUPPORTED_CURRENCIES.filter(c => currencyLimit.includes(c.code))
        : SUPPORTED_CURRENCIES;

    return (
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
    );
}
