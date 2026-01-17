import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "./queryKeys";
import { areRatesFresh } from "../utils/currencyCalculations";

/**
 * Hook for managing exchange rates - fetching, refreshing, and checking freshness.
 */
export const useExchangeRates = () => {
    const queryClient = useQueryClient();
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Fetch all exchange rates for the current user
    const { data: exchangeRates = [], isLoading, refetch } = useQuery({
        queryKey: [QUERY_KEYS.EXCHANGE_RATES],
        queryFn: () => base44.entities.ExchangeRate.list('-date'),
        staleTime: 1000 * 60 * 10, // OPTIMIZATION: Trust the cache for 10 minutes to prevent DB reads on window focus
    });

    /**
     * Refresh exchange rates for specific currencies and date.
     * Only calls the LLM if rates are stale or missing.
     * Implements deduplication - updates existing rates instead of creating duplicates.
     * 
     * @param {string} sourceCurrency - Source currency code (e.g., 'GBP')
     * @param {string} targetCurrency - Target currency code (user's base, e.g., 'EUR')
     * @param {string} date - Transaction date in YYYY-MM-DD format
     * @returns {Promise<Object>} { success: boolean, message: string, rates?: Object }
     */
    const refreshRates = async (sourceCurrency, targetCurrency, date, force = false) => {
        if (sourceCurrency === targetCurrency) {
            return { success: true, silent: true };
        }

        setIsRefreshing(true);

        try {
            const ratesToCheck = await queryClient.ensureQueryData({
                queryKey: [QUERY_KEYS.EXCHANGE_RATES],
                queryFn: () => base44.entities.ExchangeRate.list('-date'),
                staleTime: 1000 * 60 * 10,
            });

            // Check freshness using the best available data
            // If force is true, we skip this check and fetch anyway
            if (!force) {
                const isFresh = areRatesFresh(ratesToCheck, sourceCurrency, targetCurrency, date, 14);

                if (isFresh) {
                    setIsRefreshing(false);
                    return {
                        success: true,
                        message: 'Exchange rates are already up to date!',
                        silent: true,
                        alreadyFresh: true
                    };
                }
            }

            // MODIFIED: 17-Jan-2026 - Build the list of currencies we need rates for (excluding EUR)
            const currenciesToFetch = new Set();
            if (sourceCurrency !== 'EUR') currenciesToFetch.add(sourceCurrency);
            if (targetCurrency !== 'EUR') currenciesToFetch.add(targetCurrency);

            if (currenciesToFetch.size === 0) {
                // Both are EUR, no need to fetch
                setIsRefreshing(false);
                return {
                    success: true,
                    silent: true
                };
            }

            // MODIFIED: 17-Jan-2026 - Switched from LLM to frankfurter.dev API (with ECB fallback)
            // Fetch rates using frankfurter.dev API (EUR base) with ECB as fallback
            let response;
            try {
                // Try frankfurter.dev first
                const frankfurterUrl = `https://api.frankfurter.dev/v1/${date}?symbols=${Array.from(currenciesToFetch).join(',')}`;
                const frankfurterResponse = await fetch(frankfurterUrl);
                
                if (!frankfurterResponse.ok) {
                    throw new Error(`Frankfurter API returned ${frankfurterResponse.status}`);
                }
                
                const frankfurterData = await frankfurterResponse.json();
                response = { rates: frankfurterData.rates };
            } catch (frankfurterError) {
                console.warn('Frankfurter API failed, trying ECB fallback:', frankfurterError.message);
                
                // Fallback to ECB API
                // ECB API format: https://data.ecb.europa.eu/data-detail-api?startPeriod={date}&endPeriod={date}&detail=dataonly
                // We need to construct a query for each currency
                const ecbRates = {};
                
                for (const currency of currenciesToFetch) {
                    try {
                        // ECB dataset: EXR.D.{CURRENCY}.EUR.SP00.A (Daily exchange rates)
                        const ecbUrl = `https://data-api.ecb.europa.eu/service/data/EXR/D.${currency}.EUR.SP00.A?startPeriod=${date}&endPeriod=${date}&format=jsondata`;
                        const ecbResponse = await fetch(ecbUrl);
                        
                        if (ecbResponse.ok) {
                            const ecbData = await ecbResponse.json();
                            // Extract the rate from ECB's complex structure
                            const observations = ecbData?.dataSets?.[0]?.series?.['0:0:0:0:0']?.observations;
                            if (observations) {
                                const latestObservation = Object.values(observations)[0];
                                if (latestObservation && latestObservation[0]) {
                                    // ECB gives us 1 EUR = X {currency}, we need to invert it
                                    ecbRates[currency] = 1 / parseFloat(latestObservation[0]);
                                }
                            }
                        }
                    } catch (currencyError) {
                        console.error(`Failed to fetch ${currency} from ECB:`, currencyError);
                    }
                }
                
                if (Object.keys(ecbRates).length === 0) {
                    throw new Error('Both Frankfurter and ECB APIs failed');
                }
                
                response = { rates: ecbRates };
            }

            // This handles the edge case where a rate might have been added while the LLM was thinking.
            const currentRates = queryClient.getQueryData([QUERY_KEYS.EXCHANGE_RATES]) || ratesToCheck;

            // Store or update the fetched rates in the database with deduplication
            const ratesToCreate = [];
            const ratesToUpdate = [];

            for (const [currency, rate] of Object.entries(response.rates)) {
                // Re-verify freshness one last time before writing.
                // If a fresh rate (within 14 days) exists, we skip writing to DB entirely.
                const isNowFresh = areRatesFresh(currentRates, currency, 'USD', date, 14);
                if (isNowFresh) continue;

                // MODIFIED: 17-Jan-2026 - Changed from USD to EUR as base currency
                const existingRate = currentRates.find(
                    r => r.date === date &&
                        r.fromCurrency === currency &&
                        r.toCurrency === 'EUR'
                );

                if (existingRate) {
                    // Update existing rate if different
                    if (Math.abs(existingRate.rate - rate) > 0.0001) {
                        ratesToUpdate.push({ id: existingRate.id, rate });
                    }
                } else {
                    // MODIFIED: 17-Jan-2026 - Changed from USD to EUR as base currency
                    // Create new rate
                    ratesToCreate.push({
                        date: date,
                        fromCurrency: currency,
                        toCurrency: 'EUR',
                        rate: rate
                    });
                }
            }

            // Bulk create new rates
            if (ratesToCreate.length > 0) {
                await base44.entities.ExchangeRate.bulkCreate(ratesToCreate);
            }

            // Update existing rates individually
            for (const { id, rate } of ratesToUpdate) {
                await base44.entities.ExchangeRate.update(id, { rate });
            }

            // Invalidate the query to refresh the data
            if (ratesToCreate.length > 0 || ratesToUpdate.length > 0) {
                await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXCHANGE_RATES] });

                setIsRefreshing(false); // Ensure loading state is cleared
                return {
                    success: true,
                    message: `Exchange rates updated successfully! (${ratesToCreate.length} created, ${ratesToUpdate.length} updated)`,
                    rates: response.rates
                };
            }

            setIsRefreshing(false);
            return {
                success: true,
                message: 'Rates fetched, but DB write skipped (Fresh rates found during processing).',
                rates: response.rates
            };

        } catch (error) {
            console.error('Error refreshing exchange rates:', error);
            setIsRefreshing(false);
            return {
                success: false,
                message: 'Failed to update exchange rates. Please try again.',
                error: error.message
            };
        }
    };

    return {
        exchangeRates,
        isLoading,
        refreshRates,
        isRefreshing,
        refetch
    };
};