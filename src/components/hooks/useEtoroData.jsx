import { useQuery } from '@tanstack/react-query';

export const useEtoroData = () => {
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

  // Data structure matches the "Trading - Real" OpenAPI schema provided
  const positions = data?.clientPortfolio?.positions || data?.positions || [];

  const totalValue = positions.reduce((acc, pos) => {
    // Current Value = Invested Amount + Profit/Loss
    const invested = parseFloat(pos.amount || 0);
    const pnl = parseFloat(pos.pnL || 0);
    return acc + invested + pnl;
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