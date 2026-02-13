import { useQuery } from '@tanstack/react-query';

export const useEtoroData = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['etoro-portfolio'],
    queryFn: async () => {
      const res = await fetch('/functions/etoro/portfolio');
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    },
    refetchInterval: 60000, // Poll every minute
  });

  // const positions = data?.Positions || data?.positions || [];
  // eToro often returns an object with a 'Positions' array or 'AggregatePositions'
  const positions = data?.Positions || data?.positions || data?.AggregatePositions || [];

  const totalValue = positions.reduce((acc, pos) =>
    // acc + (pos.Amount || pos.Value || pos.NetCashValue || 0), 0
    // Try common eToro fields: NetCashValue, Value, or Invested
    acc + (pos.NetCashValue || pos.Value || pos.Amount || 0), 0
  );

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