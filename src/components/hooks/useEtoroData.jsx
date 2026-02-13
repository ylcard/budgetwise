import { useQuery } from '@tanstack/react-query';
import _ from 'lodash';
import { useExchangeRates } from './useExchangeRates';
import { getRateForDate, calculateConvertedAmount } from '../utils/currencyCalculations';
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
      // 1. Fetch Portfolio
      const pRes = await fetch('/functions/etoro?route=portfolio');
      if (!pRes.ok) throw new Error('Portfolio fetch failed');
      const pData = await pRes.json();

      const rawPositions = pData?.clientPortfolio?.positions || [];
      if (rawPositions.length === 0) return { positions: [], rates: [] };

      // 2. Fetch Market Rates for these instruments
      const ids = _.uniq(rawPositions.map(p => p.instrumentID)).join(',');
      const rRes = await fetch(`/functions/etoro?route=rates&instrumentIds=${ids}`);
      if (!rRes.ok) throw new Error('Rates fetch failed');
      const rData = await rRes.json();

      return {
        positions: rawPositions,
        rates: rData.rates || []
      };
    },
    refetchInterval: 30000, // Faster poll for live ticker
  });

  const grouped = _.groupBy(data?.positions || [], 'instrumentID');

  const positions = Object.entries(grouped).map(([id, group]) => {

    const instrumentIdNum = parseInt(id);

    const marketRate = data?.rates?.find(r => r.instrumentID === instrumentIdNum);
    const assetName = INSTRUMENT_MAP[instrumentIdNum] || `Asset ${id}`;
    const totalUnits = _.sumBy(group, 'units');

    const priceInLocalCurrency = marketRate?.bid || 0;
    const conversionToUSD = marketRate?.conversionRateBid || 1;

    // DEBUG LOG: Let's see why London tickers might still be off
    if (assetName.endsWith('.L')) {
      console.log(`[Etoro Debug] ${assetName}:`, {
        units: totalUnits,
        bid: priceInLocalCurrency,
        convToUSD: conversionToUSD
      });
    }

    // 2. Convert Local Asset Value -> USD using eToro's conversionRateBid
    const totalValueUSD = totalUnits * priceInLocalCurrency * conversionToUSD;

    // 3. Convert USD -> EUR using your system's current exchange rates
    const { convertedAmount } = calculateConvertedAmount(
      totalValueUSD,
      'USD',
      'EUR',
      { sourceToEUR: usdToEurRate, targetToEUR: 1.0 }
    );

    return {
      instrumentId: instrumentIdNum,
      name: assetName,
      value: convertedAmount,
      count: group.length,
      units: totalUnits
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