import { useState, useMemo } from "react";
import { getFirstDayOfMonth, getLastDayOfMonth } from "../utils/budgetCalculations";

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

  return {
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    displayDate,
    monthStart,
    monthEnd,
  };
};