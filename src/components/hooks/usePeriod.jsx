import React, { useState, useMemo, createContext, useContext } from 'react';
import { getFirstDayOfMonth, getLastDayOfMonth, normalizeToMidnight } from '../utils/dateUtils';

// Unified hook for managing month/year selection and derived date values
const PeriodContext = createContext(null);

/**
 * PeriodProvider Component
 * Wraps the application (or a subtree) to provide a centralized state for the currently selected
 * month and year, along with derived date boundaries (start/end of month).
 */
export const PeriodProvider = ({ children }) => {
  // Initialize with normalized local midnight to prevent timezone drift
  const now = normalizeToMidnight(new Date());

  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const displayDate = useMemo(() => {
    // Return a normalized date object for the selected period
    return new Date(selectedYear, selectedMonth, 1);
  }, [selectedMonth, selectedYear]);

  const monthStart = useMemo(() => {
    // Returns YYYY-MM-DD string
    return getFirstDayOfMonth(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear]);

  const monthEnd = useMemo(() => {
    // Returns YYYY-MM-DD string
    return getLastDayOfMonth(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear]);

  const currentYear = useMemo(() => {
    return now.getFullYear();
  }, [now]);

  const previousMonth = useMemo(() => {
    // Handle January rollover
    return selectedMonth === 0 ? 11 : (selectedMonth - 1);
  }, [selectedMonth]);

  const previousYear = useMemo(() => {
    // Handle January rollover
    return selectedMonth === 0 ? (selectedYear - 1) : selectedYear;
  }, [selectedMonth, selectedYear]);

  const value = {
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    displayDate,
    monthStart,
    monthEnd,
    currentYear,
    previousMonth,
    previousYear,
  };

  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>;
};

/**
 * Custom hook to access the PeriodContext.
 */
export const usePeriod = () => {
  const context = useContext(PeriodContext);
  if (!context) {
    throw new Error("usePeriod must be used within a PeriodProvider");
  }
  return context;
};
