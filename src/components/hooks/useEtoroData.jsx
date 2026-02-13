import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import _ from 'lodash';
import { useExchangeRates } from './useExchangeRates';
import { getRateForDate, calculateConvertedAmount, areRatesFresh } from '../utils/currencyCalculations';
import { format } from 'date-fns';

// Mapping IDs from eToro to real names
const INSTRUMENT_MAP = {
  1001: "Apple",
  100043: "Amundi S&P 500 II UCITS ETF",
  14453: "Amundi S&P 500",
};

export const useEtoroData = () => {
  const { exchangeRates, refreshRates, isRefreshing } = useExchangeRates();
  const today = format(new Date(), 'yyyy-MM-dd');

  // EFFECT: Automatically fetch USD -> EUR rate if missing or stale for today
  useEffect(() => {
    const needsUSD = !areRatesFresh(exchangeRates, 'USD', 'EUR', today);

    if (needsUSD && !isRefreshing) {
      console.log("[Etoro] USD rate stale or missing. Triggering refresh...");
      refreshRates('USD', 'EUR', today);
    }
  }, [exchangeRates, today, isRefreshing, refreshRates]);

  // Get the latest USD -> EUR rate from your system
  const usdToEurRate = getRateForDate(exchangeRates, 'USD', today) || 0.92; // 0.92 is fallback until fetch completes

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

  let calculatedTotalValueEUR = 0;
  let calculatedTotalPreviousValueEUR = 0;

  const positions = Object.entries(grouped).map(([id, group]) => {

    const instrumentIdNum = parseInt(id);

    const marketRate = data?.rates?.find(r => r.instrumentID === instrumentIdNum);
    const assetName = INSTRUMENT_MAP[instrumentIdNum] || `Asset ${id}`;
    const totalUnits = _.sumBy(group, 'units');

    const priceInLocalCurrency = marketRate?.bid || 0;
    const conversionToUSD = marketRate?.conversionRateBid || 1;

    // Get Previous Close (Try standard eToro fields: closingPrices.daily or officialClose)
    // Fallback to current price (0% change) if missing to prevent calculation errors
    const previousCloseLocal = marketRate?.closingPrices?.daily || marketRate?.officialClose || priceInLocalCurrency;

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
    const totalPreviousValueUSD = totalUnits * previousCloseLocal * conversionToUSD;

    // 3. Convert USD -> EUR using your system's current exchange rates
    const { convertedAmount: valueEUR } = calculateConvertedAmount(
      totalValueUSD,
      'USD',
      'EUR',
      { sourceToEUR: usdToEurRate, targetToEUR: 1.0 }
    );

    const { convertedAmount: previousValueEUR } = calculateConvertedAmount(
      totalPreviousValueUSD,
      'USD',
      'EUR',
      { sourceToEUR: usdToEurRate, targetToEUR: 1.0 }
    );

    // Accumulate totals
    calculatedTotalValueEUR += valueEUR;
    calculatedTotalPreviousValueEUR += previousValueEUR;

    return {
      instrumentId: instrumentIdNum,
      name: assetName,
      value: valueEUR,
      previousValue: previousValueEUR,
      count: group.length,
      units: totalUnits,
      // Individual Position Daily Change %
      dailyChangePct: previousCloseLocal > 0
        ? ((priceInLocalCurrency - previousCloseLocal) / previousCloseLocal) * 100
        : 0
    };
  }).sort((a, b) => b.value - a.value);

  // Calculate Weighted Portfolio Daily Change %
  const totalValue = calculatedTotalValueEUR;
  const totalDailyChangePct = calculatedTotalPreviousValueEUR > 0
    ? ((calculatedTotalValueEUR - calculatedTotalPreviousValueEUR) / calculatedTotalPreviousValueEUR) * 100
    : 0;

  let status = "Live";
  if (isLoading) status = "Syncing...";
  if (isError) status = "Error";
  if (!isLoading && positions.length === 0) status = "Empty";

  return {
    positions,
    status,
    totalValue,
    dailyChange: totalDailyChangePct,
    isLoading
  };
};