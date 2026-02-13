import { useQuery } from '@tanstack/react-query';
import _ from 'lodash';

// Mapping IDs from eToro to real names
const INSTRUMENT_MAP = {
  1002: "Apple",
  100043: "SP5C.L",
  // Add other IDs as you discover them from the API response
};

export const useEtoroData = () => {
  const USD_TO_EUR = 0.92; // Approximate conversion rate


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

  // 1. Extract raw positions from the nested API structure
  const rawPositions = data?.clientPortfolio?.positions || data?.positions || [];

  // 2. Group by Instrument & Consolidate Values
  const grouped = _.groupBy(rawPositions, 'instrumentId');

  const positions = Object.entries(grouped).map(([id, group]) => {
    const totalUSD = group.reduce((sum, p) => {
      // Use fallback for property names as eToro casing can vary
      const invested = parseFloat(p.amount || p.Amount || 0);
      const pnl = parseFloat(p.pnL || p.PnL || 0);
      return sum + invested + pnl;
    }, 0);

    return {
      instrumentId: id,
      name: INSTRUMENT_MAP[id] || `Asset ${id}`,
      value: totalUSD * USD_TO_EUR, // Converted to EUR
      count: group.length
    };
  });

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