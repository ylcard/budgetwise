import { useQuery } from '@tanstack/react-query';
import _ from 'lodash';
import { useExchangeRates } from './useExchangeRates';
import { getRateForDate } from '../utils/currencyCalculations';
import { format } from 'date-fns';

// Mapping IDs from eToro to real names
const INSTRUMENT_MAP = {
    1001: "AAPL",
    100043: "SP5C.L",
    14453: "VUSA.L",
};

export const useEtoroData = () => {
    const { exchangeRates } = useExchangeRates();
    const today = format(new Date(), 'yyyy-MM-dd');

    // Get the latest USD -> EUR rate from your system
    const usdToEurRate = getRateForDate(exchangeRates, 'USD', today) || 0.92;

    const { data, isLoading, isError } = useQuery({
        queryKey: ['etoro-portfolio'],
        queryFn: async () => {
            // Use query param 'route' so we hit the existing 'etoro.ts' file
            const res = await fetch('/functions/etoro?route=portfolio');
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Portfolio fetch failed');
            }
            return res.json();
        },
        refetchInterval: 60000, // Poll every minute
    });

    // 1. Extract raw positions from the correct nested path found in your JSON
    const rawPositions = data?.clientPortfolio?.positions || [];

    const grouped = _.groupBy(rawPositions, 'instrumentId');

    const positions = Object.entries(grouped).map(([id, group]) => {
        const totalUSD = group.reduce((sum, p) => {
            // Using amount from your JSON structure
            const invested = parseFloat(p.amount || 0);
            // Note: eToro's /portfolio endpoint doesn't always include live PnL per position
            // If p.pnL is available in other routes, we add it here.
            const pnl = parseFloat(p.pnL || p.PnL || 0);
            return sum + invested + pnl;
        }, 0);

        const instrumentIdNum = parseInt(id);

        return {
            instrumentId: instrumentIdNum,
            name: INSTRUMENT_MAP[instrumentIdNum] || `Asset ${id}`,
            value: totalUSD * usdToEurRate, // Converted using your system rates
            count: group.length,
            units: _.sumBy(group, 'units')
        };
    }).sort((a, b) => b.value - a.value); // Sort by highest value

    const totalValue = positions.reduce((acc, pos) => acc + pos.value, 0);

    let status = "Live";
    if (isLoading) status = "Syncing...";
    if (isError) status = "Error";
    if (!isLoading && positions.length === 0) status = "Empty";

    return {
        positions,
        status,
        totalValue,
        isLoading
    };
};