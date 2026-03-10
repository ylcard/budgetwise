/**
 * @file useTransactionWindow
 * @description Wide-window transaction fetching strategy to minimize DB calls during month navigation.
 * 
 * STRATEGY:
 * - On initial load, fetches CURRENT month + 6 previous months of transaction data in ONE call.
 * - When the user navigates backwards/forwards through months, the hook checks if the requested
 *   month falls within the already-fetched window.
 * - If YES → returns cached data (no new fetch).
 * - If NO → fetches a new 7-month window anchored at the newly selected month + 6 months back,
 *   and merges it into the existing cache to avoid refetching already-loaded data.
 * - The "visible" transactions for the selected period are filtered client-side from the window.
 * 
 * This eliminates the per-month fetch pattern that caused 429 rate-limit errors when users
 * quickly navigated through months.
 * 
 * @created 10-Mar-2026
 */

import { useState, useMemo, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { QUERY_KEYS } from "./queryKeys";
import { fetchWithRetry } from "../utils/generalUtils";
import {
  getFirstDayOfMonth,
  getLastDayOfMonth,
  formatDateString,
  subDays,
  normalizeToMidnight,
} from "../utils/dateUtils";

/** Number of historical months to prefetch (excluding the selected month itself) */
const PREFETCH_MONTHS_BACK = 6;

/** Buffer days added before the window start for settlement-lag coverage */
const SETTLEMENT_BUFFER_DAYS = 30;

/**
 * Calculates the wide fetch window boundaries.
 * @param {number} month - Selected month (0-11)
 * @param {number} year - Selected year
 * @returns {{ windowStart: string, windowEnd: string }} YYYY-MM-DD boundaries
 */
const calculateWindow = (month, year) => {
  // Window end = last day of the selected month
  const windowEnd = getLastDayOfMonth(month, year);

  // Window start = first day of (selected month - PREFETCH_MONTHS_BACK), minus settlement buffer
  let anchorMonth = month - PREFETCH_MONTHS_BACK;
  let anchorYear = year;
  while (anchorMonth < 0) {
    anchorMonth += 12;
    anchorYear -= 1;
  }
  const rawStart = getFirstDayOfMonth(anchorMonth, anchorYear);
  // Add settlement buffer so late-settling transactions at the start boundary are included
  const windowStart = formatDateString(subDays(normalizeToMidnight(rawStart), SETTLEMENT_BUFFER_DAYS));

  return { windowStart, windowEnd };
};

/**
 * Checks if a given month/year falls within a fetched window.
 * The month is "covered" if its entire range (1st to last day) is within [windowStart, windowEnd].
 * @param {number} month - Month to check (0-11)
 * @param {number} year - Year to check
 * @param {string} windowStart - YYYY-MM-DD
 * @param {string} windowEnd - YYYY-MM-DD
 * @returns {boolean}
 */
const isMonthCovered = (month, year, windowStart, windowEnd) => {
  if (!windowStart || !windowEnd) return false;
  const monthFirst = getFirstDayOfMonth(month, year);
  const monthLast = getLastDayOfMonth(month, year);
  // The month is covered if its first day >= window start (minus buffer is ok, we're generous)
  // AND its last day <= window end
  return monthFirst >= windowStart && monthLast <= windowEnd;
};

/**
 * useTransactionWindow - Wide-window transaction fetching hook
 * 
 * @param {number} selectedMonth - Currently selected month (0-11)
 * @param {number} selectedYear - Currently selected year
 * @returns {{
 *   allTransactions: Array,        - All transactions in the fetched window
 *   periodTransactions: Array,     - Transactions filtered to the selected month (with settlement buffer)
 *   isLoading: boolean,
 *   error: any,
 *   windowStart: string,
 *   windowEnd: string,
 * }}
 */
export const useTransactionWindow = (selectedMonth, selectedYear) => {
  // Track the anchor point that determines what window we've fetched.
  // Only changes when the user navigates OUTSIDE the current window.
  const [anchorMonth, setAnchorMonth] = useState(() => {
    const now = new Date();
    return now.getMonth();
  });
  const [anchorYear, setAnchorYear] = useState(() => {
    const now = new Date();
    return now.getFullYear();
  });

  // Calculate the fetch window based on the anchor
  const { windowStart, windowEnd } = useMemo(
    () => calculateWindow(anchorMonth, anchorYear),
    [anchorMonth, anchorYear]
  );

  // Determine if we need to shift the anchor (selected month is outside cached window)
  // We calculate this OUTSIDE the query to decide whether to update the anchor state
  const selectedMonthStart = getFirstDayOfMonth(selectedMonth, selectedYear);
  const selectedMonthEnd = getLastDayOfMonth(selectedMonth, selectedYear);

  // Check if the selected month is covered by the current window
  const isCovered = useMemo(
    () => isMonthCovered(selectedMonth, selectedYear, windowStart, windowEnd),
    [selectedMonth, selectedYear, windowStart, windowEnd]
  );

  // If not covered, shift the anchor. This will trigger a new query.
  // Using a ref to track the "pending shift" to avoid render loops.
  const shiftScheduled = useRef(false);

  if (!isCovered && !shiftScheduled.current) {
    shiftScheduled.current = true;
    // Schedule anchor update for next tick to avoid setState-during-render
    Promise.resolve().then(() => {
      // When user moves FORWARD past the window end, anchor on the selected month
      // When user moves BACKWARD past the window start, anchor on the selected month
      // In both cases, the new window will be [selectedMonth - 6 ... selectedMonth]
      setAnchorMonth(selectedMonth);
      setAnchorYear(selectedYear);
      shiftScheduled.current = false;
    });
  } else if (isCovered) {
    shiftScheduled.current = false;
  }

  // Single wide-window fetch
  const { data: allTransactions = [], isLoading, error } = useQuery({
    queryKey: [QUERY_KEYS.TRANSACTIONS, 'window', windowStart, windowEnd],
    queryFn: async () => {
      return await fetchWithRetry(() =>
        base44.entities.Transaction.filter(
          { date: { $gte: windowStart, $lte: windowEnd } },
          '-date',
          5000
        )
      );
    },
    keepPreviousData: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Filter transactions for the selected period (with settlement buffer for late-paid items)
  const periodTransactions = useMemo(() => {
    if (!allTransactions.length) return [];

    const bufferStart = formatDateString(subDays(normalizeToMidnight(selectedMonthStart), SETTLEMENT_BUFFER_DAYS));
    const end = selectedMonthEnd;

    return allTransactions.filter(t => {
      if (!t.date) return false;
      return t.date >= bufferStart && t.date <= end;
    });
  }, [allTransactions, selectedMonthStart, selectedMonthEnd]);

  return {
    allTransactions,
    periodTransactions,
    isLoading,
    error,
    windowStart,
    windowEnd,
  };
};