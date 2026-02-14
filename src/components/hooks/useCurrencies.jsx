import { useQuery } from '@tanstack/react-query';
import { getCountries, defineFields } from '@yusifaliyevpro/countries';
import { QUERY_KEYS } from './queryKeys';

/**
 * CREATED 14-Feb-2026: Hook to fetch and cache all available currencies from REST Countries API
 * Extracts unique currencies from all countries and formats them for use in currency selectors
 * @returns {object} { currencies, isLoading, error }
 */
export const useCurrencies = () => {
    const currencyFields = defineFields(['currencies', 'name']);

    const { data: currencies = [], isLoading, error } = useQuery({
        queryKey: [QUERY_KEYS.CURRENCIES],
        queryFn: async () => {
            // Fetch all countries with only currencies field
            const countries = await getCountries({ fields: currencyFields });
            
            if (!countries) return [];

            // Extract unique currencies
            const currencyMap = new Map();

            countries.forEach(country => {
                if (country.currencies) {
                    Object.entries(country.currencies).forEach(([code, details]) => {
                        if (!currencyMap.has(code)) {
                            currencyMap.set(code, {
                                code,
                                name: details.name,
                                symbol: details.symbol
                            });
                        }
                    });
                }
            });

            // Convert to array and sort by code
            return Array.from(currencyMap.values()).sort((a, b) => 
                a.code.localeCompare(b.code)
            );
        },
        staleTime: 1000 * 60 * 60 * 24, // Cache for 24 hours (currency data rarely changes)
        gcTime: 1000 * 60 * 60 * 24 * 7, // Keep in cache for 7 days
    });

    return {
        currencies,
        isLoading,
        error
    };
};