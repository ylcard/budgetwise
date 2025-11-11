import { useState, useMemo } from "react";
// UPDATED 11-Nov-2025: Changed import from budgetCalculations.js to dateUtils.js
import { getFirstDayOfMonth, getLastDayOfMonth } from "../utils/dateUtils";

// Unified hook for managing month/year selection and derived date values
export const usePeriod = () => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const displayDate = useMemo(() => {
    return new Date(selectedYear, selectedMonth);
  }, [selectedMonth, selectedYear]);

  const monthStart = useMemo(() => {
    return getFirstDayOfMonth(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear]);

  const monthEnd = useMemo(() => {
    return getLastDayOfMonth(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear]);

  const currentYear = useMemo(() => {
    return now.getFullYear();
  }, []);

  return {
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    displayDate,
    monthStart,
    monthEnd,
    currentYear,
  };
};

// UPDATED 11-Nov-2025: Changed import to use dateUtils.js instead of deprecated budgetCalculations.js