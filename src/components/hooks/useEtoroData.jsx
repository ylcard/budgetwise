useEtoroData.jsx

import { useQuery } from '@tanstack/react-query';

export const useEtoroData = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['etoro-portfolio'],
    queryFn: async () => {
      const res = await fetch('/functions/etoro/portfolio');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Portfolio fetch failed');
      }
      return res.json();
    },
    refetchInterval: 60000, // Poll every minute
  });

  const positions = data?.Positions || data?.positions || data?.AggregatePositions || [];

  const totalValue = positions.reduce((acc, pos) => {
    // Note: Public/Social endpoints might return 'Amount' or 'InitialAmount'
    const val = parseFloat(pos.NetCashValue || pos.Value || pos.Amount || pos.InitialAmount || 0);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

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